import { describe, it, expect } from 'vitest';
import { computeKpis, formatValue } from './data.js';

describe('computeKpis', () => {
  it('returns 4 KPI objects with expected shape', () => {
    const result = computeKpis();
    expect(result).toHaveLength(4);
    for (const kpi of result) {
      expect(kpi).toMatchObject({
        key: expect.any(String),
        label: expect.any(String),
        unit: expect.any(String),
        value: expect.any(Number),
        change: expect.any(Number),
      });
    }
  });

  it('returns keys in order: revenue, users, conversion, retention', () => {
    const keys = computeKpis().map(k => k.key);
    expect(keys).toEqual(['revenue', 'users', 'conversion', 'retention']);
  });

  it('change is always positive (~7.53%)', () => {
    for (const kpi of computeKpis()) {
      expect(kpi.change).toBeGreaterThan(0);
      // change = ((v - v*0.93) / (v*0.93)) * 100 = (0.07/0.93)*100 ≈ 7.527
      expect(kpi.change).toBeCloseTo(7.527, 1);
    }
  });

  it('7d values are 25% of 30d values', () => {
    const base = computeKpis({ dateRange: '30d', segment: 'all' });
    const short = computeKpis({ dateRange: '7d', segment: 'all' });
    for (let i = 0; i < 4; i++) {
      expect(short[i].value).toBeCloseTo(base[i].value * 0.25, 5);
    }
  });

  it('90d values are 2.8x of 30d values', () => {
    const base = computeKpis({ dateRange: '30d', segment: 'all' });
    const long = computeKpis({ dateRange: '90d', segment: 'all' });
    for (let i = 0; i < 4; i++) {
      expect(long[i].value).toBeCloseTo(base[i].value * 2.8, 5);
    }
  });

  it('ytd values are 9.1x of 30d values', () => {
    const base = computeKpis({ dateRange: '30d', segment: 'all' });
    const ytd = computeKpis({ dateRange: 'ytd', segment: 'all' });
    for (let i = 0; i < 4; i++) {
      expect(ytd[i].value).toBeCloseTo(base[i].value * 9.1, 5);
    }
  });

  it('enterprise segment values are 40% of all segment', () => {
    const all = computeKpis({ dateRange: '30d', segment: 'all' });
    const ent = computeKpis({ dateRange: '30d', segment: 'enterprise' });
    for (let i = 0; i < 4; i++) {
      expect(ent[i].value).toBeCloseTo(all[i].value * 0.4, 5);
    }
  });

  it('consumer segment values are 22% of all segment', () => {
    const all = computeKpis({ dateRange: '30d', segment: 'all' });
    const consumer = computeKpis({ dateRange: '30d', segment: 'consumer' });
    for (let i = 0; i < 4; i++) {
      expect(consumer[i].value).toBeCloseTo(all[i].value * 0.22, 5);
    }
  });

  it('smb segment values are 38% of all segment', () => {
    const all = computeKpis({ dateRange: '30d', segment: 'all' });
    const smb = computeKpis({ dateRange: '30d', segment: 'smb' });
    for (let i = 0; i < 4; i++) {
      expect(smb[i].value).toBeCloseTo(all[i].value * 0.38, 5);
    }
  });

  it('unknown dateRange falls back to multiplier 1', () => {
    const base = computeKpis({ dateRange: '30d', segment: 'all' });
    const unknown = computeKpis({ dateRange: 'invalid', segment: 'all' });
    for (let i = 0; i < 4; i++) {
      expect(unknown[i].value).toBeCloseTo(base[i].value, 5);
    }
  });

  it('unknown segment falls back to multiplier 1', () => {
    const all = computeKpis({ dateRange: '30d', segment: 'all' });
    const unknown = computeKpis({ dateRange: '30d', segment: 'invalid' });
    for (let i = 0; i < 4; i++) {
      expect(unknown[i].value).toBeCloseTo(all[i].value, 5);
    }
  });

  it('uses defaults when called with no args', () => {
    const withDefaults = computeKpis();
    const explicit = computeKpis({ dateRange: '30d', segment: 'all' });
    for (let i = 0; i < 4; i++) {
      expect(withDefaults[i].value).toBeCloseTo(explicit[i].value, 5);
    }
  });
});

describe('formatValue', () => {
  describe('dollar unit', () => {
    it('formats thousands as k with one decimal', () => {
      expect(formatValue('$', 482000)).toBe('$482.0k');
    });

    it('formats values below 1000 as integer', () => {
      expect(formatValue('$', 500)).toBe('$500');
    });

    it('formats exactly 1000 as k', () => {
      expect(formatValue('$', 1000)).toBe('$1.0k');
    });

    it('formats 999 without k', () => {
      expect(formatValue('$', 999)).toBe('$999');
    });
  });

  describe('percent unit', () => {
    it('formats with one decimal and % sign', () => {
      expect(formatValue('%', 3.8)).toBe('3.8%');
    });

    it('formats whole percent', () => {
      expect(formatValue('%', 87.2)).toBe('87.2%');
    });
  });

  describe('no unit (counts)', () => {
    it('formats thousands as k', () => {
      expect(formatValue('', 12400)).toBe('12.4k');
    });

    it('formats values below 1000 as rounded integer', () => {
      expect(formatValue('', 999)).toBe('999');
    });

    it('formats exactly 1000 as k', () => {
      expect(formatValue('', 1000)).toBe('1.0k');
    });
  });
});
