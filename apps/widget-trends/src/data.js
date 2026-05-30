const SEED = [42, 58, 51, 73, 67, 82, 79, 91, 85, 94, 88, 102, 97, 115, 108, 124, 119, 131, 127, 143, 138, 152, 146, 161, 156, 170, 164, 178, 172, 188];

const RANGE_POINTS = { '7d': 7, '30d': 30, '90d': 30, 'ytd': 30 };
const SEGMENT_SCALE = { all: 1, enterprise: 0.45, smb: 0.38, consumer: 0.22 };

export function generateTrend({ dateRange = '30d', segment = 'all' } = {}) {
  const n = RANGE_POINTS[dateRange] ?? 30;
  const scale = SEGMENT_SCALE[segment] ?? 1;
  return SEED.slice(0, n).map((v, i) => ({ i, value: Math.round(v * scale * 1000) }));
}
