/** Shared formatting and the IMD warning scale. */

export const CATEGORIES = ['green', 'yellow', 'orange', 'red'];

export const CATEGORY_META = {
  green: { label: 'No warning', short: 'GREEN', action: 'Routine', mm: '< 64.5' },
  yellow: { label: 'Watch', short: 'YELLOW', action: 'Be updated', mm: '64.5 – 115.5' },
  orange: { label: 'Alert', short: 'ORANGE', action: 'Be prepared', mm: '115.6 – 204.4' },
  red: { label: 'Warning', short: 'RED', action: 'Take action', mm: '≥ 204.5' },
};

export const CATEGORY_COLOR = {
  green: '#1c7c3f',
  yellow: '#b07d00',
  orange: '#c25e00',
  red: '#b3261e',
};

export const CATEGORY_FILL = {
  green: '#cfe9d8',
  yellow: '#f7e3a8',
  orange: '#f6c9a4',
  red: '#f0b3ae',
};

/** Rainfall scale used for the map's "corrected" layer. */
export const RAIN_SCALE = [
  [0.5, '#eef4f8'],
  [2, '#cfe4f2'],
  [10, '#a5cdea'],
  [25, '#6fa9d8'],
  [50, '#3f7fbd'],
  [75, '#f0c14b'],
  [115, '#e08b2b'],
  [204, '#c0392b'],
];

export function rainColor(mm) {
  if (mm === null || mm === undefined || Number.isNaN(mm)) return '#dfe6ec';
  let color = RAIN_SCALE[0][1];
  for (const [threshold, c] of RAIN_SCALE) if (mm >= threshold) color = c;
  return color;
}

export function adjustmentColor(mm) {
  if (mm === null || mm === undefined || Number.isNaN(mm)) return '#dfe6ec';
  if (mm > 25) return '#14603a';
  if (mm > 8) return '#4f9a6d';
  if (mm > 1) return '#cfe4d6';
  if (mm < -25) return '#8c1f1a';
  if (mm < -8) return '#c0645c';
  if (mm < -1) return '#f2d5d2';
  return '#eef1f4';
}

export function probabilityColor(p) {
  if (p === null || p === undefined) return '#dfe6ec';
  if (p >= 0.75) return '#8c1f1a';
  if (p >= 0.5) return '#c25e00';
  if (p >= 0.3) return '#d8a516';
  if (p >= 0.15) return '#dfe3a0';
  return '#eef4f8';
}

export const REGIME_COLOR = {
  'Active Monsoon': '#1b6ec2',
  'Break Monsoon': '#c98a2b',
  'Monsoon Low/Depression': '#8e44ad',
  Orographic: '#1c7c3f',
  Coastal: '#0f8b8d',
  'Western Disturbance': '#7a6a52',
  'Weak/Normal': '#9aa7b4',
};

export const REGIME_SHORT = {
  'Active Monsoon': 'ACT',
  'Break Monsoon': 'BRK',
  'Monsoon Low/Depression': 'DEP',
  Orographic: 'ORO',
  Coastal: 'CST',
  'Western Disturbance': 'WD',
  'Weak/Normal': 'WKN',
};

export function fmt(value, digits = 1) {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  return Number(value).toFixed(digits);
}

export function pct(value, digits = 0) {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  return `${(value * 100).toFixed(digits)}%`;
}

export function signed(value, digits = 1) {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  const v = Number(value);
  return `${v > 0 ? '+' : ''}${v.toFixed(digits)}`;
}

export function longDate(iso) {
  if (!iso) return '—';
  const d = new Date(`${iso}T00:00:00Z`);
  return d.toLocaleDateString('en-IN', {
    weekday: 'short', day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC',
  });
}

export function shortDate(iso) {
  if (!iso) return '—';
  const d = new Date(`${iso}T00:00:00Z`);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', timeZone: 'UTC' });
}

export function reliabilityClass(level) {
  if (level === 'reliable') return 'reliability-ok';
  if (level === 'indicative') return 'reliability-warn';
  return 'suppressed';
}
