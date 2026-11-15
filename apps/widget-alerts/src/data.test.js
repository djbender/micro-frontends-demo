import { describe, it, expect } from 'vitest';
import { ALERTS, queryAlerts } from './data.js';

describe('queryAlerts', () => {
  it('defaults to the 30d window, all segments, newest first', () => {
    const rows = queryAlerts();
    expect(rows.every(a => a.daysAgo <= 30)).toBe(true);
    const days = rows.map(a => a.daysAgo);
    expect(days).toEqual(days.toSorted((a, b) => a - b));
  });

  it('narrows by date range', () => {
    expect(queryAlerts({ dateRange: '7d' }).every(a => a.daysAgo <= 7)).toBe(true);
    expect(queryAlerts({ dateRange: 'ytd' })).toHaveLength(ALERTS.length);
  });

  it('falls back to 30d for an unknown range', () => {
    expect(queryAlerts({ dateRange: 'nope' })).toEqual(queryAlerts({ dateRange: '30d' }));
  });

  it('filters by segment', () => {
    const rows = queryAlerts({ dateRange: 'ytd', segment: 'smb' });
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every(a => a.segment === 'smb')).toBe(true);
  });

  it('filters by severity and case-insensitive search', () => {
    const crit = queryAlerts({ dateRange: 'ytd' }, { severity: 'critical' });
    expect(crit.every(a => a.severity === 'critical')).toBe(true);
    const found = queryAlerts({ dateRange: 'ytd' }, { query: '  CHECKOUT ' });
    expect(found.map(a => a.metric)).toEqual(['Checkout error rate']);
  });

  it('sorts by severity rank, not alphabetically, and honours direction', () => {
    const desc = queryAlerts({ dateRange: 'ytd' }, { sortKey: 'severity', sortDir: 'desc' });
    expect(desc[0].severity).toBe('critical');
    expect(desc.at(-1).severity).toBe('info');
  });

  it('returns an empty list when nothing matches', () => {
    expect(queryAlerts({ dateRange: '7d', segment: 'enterprise' }, { query: 'zzz' })).toEqual([]);
  });
});
