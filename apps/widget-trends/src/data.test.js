import { describe, it, expect } from 'vitest';
import { generateTrend } from './data.js';

describe('generateTrend', () => {
  it('returns 30 points by default', () => {
    expect(generateTrend()).toHaveLength(30);
  });

  it('returns 7 points for dateRange 7d', () => {
    expect(generateTrend({ dateRange: '7d' })).toHaveLength(7);
  });

  it('returns 30 points for dateRange 30d', () => {
    expect(generateTrend({ dateRange: '30d' })).toHaveLength(30);
  });

  it('returns 30 points for dateRange 90d (capped at SEED length)', () => {
    expect(generateTrend({ dateRange: '90d' })).toHaveLength(30);
  });

  it('returns 30 points for dateRange ytd', () => {
    expect(generateTrend({ dateRange: 'ytd' })).toHaveLength(30);
  });

  it('each point has shape { i, value }', () => {
    for (const point of generateTrend()) {
      expect(point).toMatchObject({ i: expect.any(Number), value: expect.any(Number) });
    }
  });

  it('index i matches position in the SEED slice', () => {
    const points = generateTrend({ dateRange: '7d' });
    points.forEach((p, idx) => expect(p.i).toBe(idx));
  });

  it('enterprise segment values are ~45% of all segment', () => {
    const all = generateTrend({ segment: 'all' });
    const ent = generateTrend({ segment: 'enterprise' });
    for (let i = 0; i < all.length; i++) {
      expect(ent[i].value / all[i].value).toBeCloseTo(0.45, 1);
    }
  });

  it('smb segment values are ~38% of all segment', () => {
    const all = generateTrend({ segment: 'all' });
    const smb = generateTrend({ segment: 'smb' });
    for (let i = 0; i < all.length; i++) {
      expect(smb[i].value / all[i].value).toBeCloseTo(0.38, 1);
    }
  });

  it('consumer segment values are ~22% of all segment', () => {
    const all = generateTrend({ segment: 'all' });
    const con = generateTrend({ segment: 'consumer' });
    for (let i = 0; i < all.length; i++) {
      expect(con[i].value / all[i].value).toBeCloseTo(0.22, 1);
    }
  });

  it('unknown dateRange falls back to 30 points', () => {
    expect(generateTrend({ dateRange: 'invalid' })).toHaveLength(30);
  });

  it('unknown segment falls back to scale 1 (same as all)', () => {
    const all = generateTrend({ segment: 'all' });
    const unknown = generateTrend({ segment: 'invalid' });
    expect(unknown).toEqual(all);
  });
});
