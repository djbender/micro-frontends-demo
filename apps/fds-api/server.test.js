import { describe, it, expect, vi } from 'vitest';
import { selectVersion, djb2 } from '@demo/contracts';

const validEntry = {
  url: 'http://localhost:5001/remoteEntry.js',
  fallbackUrl: 'http://localhost:5001/remoteEntry.js',
  metadata: { integrity: '', version: '1.0.0' },
  deployment: { default: true, traffic: 90 },
  extras: { module: './mount', slot: 'main', route: '/overview', requiredPermissions: ['dashboard.view'] },
};

const v2Entry = {
  ...validEntry,
  url: 'http://localhost:5002/remoteEntry.js',
  fallbackUrl: 'http://localhost:5002/remoteEntry.js',
  metadata: { ...validEntry.metadata, version: '1.1.0' },
  deployment: { ...validEntry.deployment, default: false, traffic: 10 },
};

describe('fds-api server', () => {
  it('resolves to a single entry per MFE', () => {
    const result = selectVersion([validEntry, v2Entry], 'default');
    expect(result).toBe(validEntry);
  });

  it('uses X-Traffic-Bucket header value for canary token', () => {
    const result = selectVersion([validEntry, v2Entry], 'canary');
    expect(result).toBe(v2Entry);
  });

  it('produces deterministic results for the same token', () => {
    const r1 = selectVersion([validEntry, v2Entry], 'user-abc');
    const r2 = selectVersion([validEntry, v2Entry], 'user-abc');
    expect(r1).toBe(r2);
  });
});
