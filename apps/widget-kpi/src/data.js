const BASE = {
  revenue: { label: 'Revenue', unit: '$', base: 482000 },
  users: { label: 'Active Users', unit: '', base: 12400 },
  conversion: { label: 'Conversion', unit: '%', base: 3.8 },
  retention: { label: 'Retention', unit: '%', base: 87.2 },
};

const RANGE_MULTIPLIER = { '7d': 0.25, '30d': 1, '90d': 2.8, 'ytd': 9.1 };
const SEGMENT_MULTIPLIER = { all: 1, enterprise: 0.4, smb: 0.38, consumer: 0.22 };

export function computeKpis({ dateRange = '30d', segment = 'all' } = {}) {
  const rm = RANGE_MULTIPLIER[dateRange] ?? 1;
  const sm = SEGMENT_MULTIPLIER[segment] ?? 1;
  return Object.entries(BASE).map(([key, { label, unit, base }]) => {
    const value = base * rm * sm;
    const prev = value * 0.93;
    const change = ((value - prev) / prev) * 100;
    return { key, label, unit, value, change };
  });
}

export function formatValue(unit, value) {
  if (unit === '$') return '$' + (value >= 1000 ? (value / 1000).toFixed(1) + 'k' : value.toFixed(0));
  if (unit === '%') return value.toFixed(1) + '%';
  return value >= 1000 ? (value / 1000).toFixed(1) + 'k' : Math.round(value).toString();
}
