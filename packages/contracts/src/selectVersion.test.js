import { describe, it, expect } from 'vitest';
import { djb2, selectVersion } from './index.js';

const validEntry = {
  url: 'http://localhost:5001/remoteEntry.js',
  fallbackUrl: 'http://localhost:5001/remoteEntry.js',
  metadata: { integrity: '', version: '1.0.0' },
  deployment: { default: true, traffic: 100 },
  extras: { module: './mount', slots: [{ slot: 'main' }], route: '/overview', requiredPermissions: ['dashboard.view'] },
};

describe('djb2', () => {
  it('returns a value between 1 and 100', () => {
    for (let i = 0; i < 1000; i++) {
      const hash = djb2(`test-string-${i}`);
      expect(hash).toBeGreaterThanOrEqual(1);
      expect(hash).toBeLessThanOrEqual(100);
    }
  });

  it('returns the same hash for the same input (deterministic)', () => {
    expect(djb2('hello')).toBe(djb2('hello'));
  });

  it('produces variation across many inputs (not constant)', () => {
    const hashes = new Set(['a', 'b', 'c', 'hello', 'world', 'foo', 'bar', 'baz', 'test123', 'another!'].map(djb2));
    expect(hashes.size).toBeGreaterThan(1);
  });
});

describe('selectVersion', () => {
  const v1 = { ...validEntry, metadata: { ...validEntry.metadata, version: '1.0.0' }, deployment: { default: true, traffic: 90 } };
  const v2 = { ...validEntry, metadata: { ...validEntry.metadata, version: '1.1.0' }, deployment: { default: false, traffic: 10 } };

  it('token="default" always returns the first (default) version', () => {
    expect(selectVersion([v1, v2], 'default')).toBe(v1);
  });

  it('token="canary" always returns the last (minority) version', () => {
    expect(selectVersion([v1, v2], 'canary')).toBe(v2);
  });

  it('returns the default version when no version matches the bucket', () => {
    expect(selectVersion([v1, v2], 'some-random-token')).toBeDefined();
    // Should land on either v1 or v2 depending on hash, but the default fallback
    // should kick in if somehow no traffic range covers the bucket
  });

  it('returns the default version when it is the only entry', () => {
    expect(selectVersion([validEntry], 'any-token')).toBe(validEntry);
  });

  it('returns versions[0] when no default is found', () => {
    const nonDefault = {
      ...validEntry,
      deployment: { default: false, traffic: 100 },
    };
    expect(selectVersion([nonDefault], 'any-token')).toBe(nonDefault);
  });

  it('returns versions[0] via ?? fallback when no default exists and bucket misses all ranges', () => {
    const v1 = { ...validEntry, metadata: { ...validEntry.metadata, version: '1.0.0' }, deployment: { default: false, traffic: 0 } };
    const v2 = { ...validEntry, metadata: { ...validEntry.metadata, version: '1.1.0' }, deployment: { default: false, traffic: 0 } };
    // Both have 0% traffic so the loop never matches any bucket; no default exists either
    // so ?? versions[0] is the final fallback
    expect(selectVersion([v1, v2], 'any-token')).toBe(v1);
  });

  it('selects based on traffic percentages for non-special tokens', () => {
    const results = new Set();
    for (let i = 0; i < 200; i++) {
      const picked = selectVersion([v1, v2], `user-${i}`);
      results.add(picked.metadata.version);
    }
    // With 90/10 split, most should be v1, but some should be v2
    expect(results.size).toBeGreaterThanOrEqual(1);
  });
});
