/** @typedef {{ id: number, severity: 'critical'|'warning'|'info', metric: string, segment: 'enterprise'|'smb'|'consumer', daysAgo: number, status: 'open'|'acknowledged'|'resolved' }} Alert */

/** @type {Alert[]} */
export const ALERTS = [
  { id: 1,  severity: 'critical', metric: 'Checkout error rate',   segment: 'consumer',   daysAgo: 1,   status: 'open' },
  { id: 2,  severity: 'warning',  metric: 'API p95 latency',       segment: 'enterprise', daysAgo: 2,   status: 'acknowledged' },
  { id: 3,  severity: 'info',     metric: 'New signup spike',      segment: 'smb',        daysAgo: 3,   status: 'resolved' },
  { id: 4,  severity: 'critical', metric: 'Payment gateway down',  segment: 'consumer',   daysAgo: 5,   status: 'resolved' },
  { id: 5,  severity: 'warning',  metric: 'Churn above threshold', segment: 'smb',        daysAgo: 6,   status: 'open' },
  { id: 6,  severity: 'info',     metric: 'Quota 80% reached',     segment: 'enterprise', daysAgo: 9,   status: 'acknowledged' },
  { id: 7,  severity: 'warning',  metric: 'Failed login surge',    segment: 'consumer',   daysAgo: 14,  status: 'resolved' },
  { id: 8,  severity: 'critical', metric: 'SSO provider timeout',  segment: 'enterprise', daysAgo: 21,  status: 'resolved' },
  { id: 9,  severity: 'info',     metric: 'Invoice batch delayed', segment: 'smb',        daysAgo: 28,  status: 'resolved' },
  { id: 10, severity: 'warning',  metric: 'Cache hit ratio drop',  segment: 'enterprise', daysAgo: 45,  status: 'resolved' },
  { id: 11, severity: 'critical', metric: 'Data pipeline stalled', segment: 'consumer',   daysAgo: 70,  status: 'resolved' },
  { id: 12, severity: 'info',     metric: 'Trial conversions up',  segment: 'smb',        daysAgo: 120, status: 'resolved' },
  { id: 13, severity: 'warning',  metric: 'Support backlog',       segment: 'enterprise', daysAgo: 200, status: 'resolved' },
];

const RANGE_DAYS = { '7d': 7, '30d': 30, '90d': 90, ytd: 365 };
const SEVERITY_RANK = { critical: 3, warning: 2, info: 1 };

/**
 * Pure filter + sort used by the component. `filter` is the dashboard bus
 * payload; `view` is the widget's own local controls.
 * @param {{ dateRange?: string, segment?: string }} [filter]
 * @param {{ severity?: string, query?: string, sortKey?: keyof Alert, sortDir?: 'asc'|'desc' }} [view]
 * @returns {Alert[]}
 */
export function queryAlerts({ dateRange = '30d', segment = 'all' } = {}, { severity = 'all', query = '', sortKey = 'daysAgo', sortDir = 'asc' } = {}) {
  const maxDays = RANGE_DAYS[dateRange] ?? 30;
  const q = query.trim().toLowerCase();
  const rows = ALERTS.filter(a =>
    a.daysAgo <= maxDays &&
    (segment === 'all' || a.segment === segment) &&
    (severity === 'all' || a.severity === severity) &&
    (!q || a.metric.toLowerCase().includes(q)),
  );
  const dir = sortDir === 'desc' ? -1 : 1;
  const value = a => (sortKey === 'severity' ? SEVERITY_RANK[a.severity] : a[sortKey]);
  return rows.sort((a, b) => {
    const x = value(a);
    const y = value(b);
    return (x < y ? -1 : x > y ? 1 : 0) * dir;
  });
}
