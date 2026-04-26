/**
 * Runway → colour mapping for the globe + leaderboard.
 *
 * Continuous gradient mapping: red (<5y) → amber (5-15y) → teal (15-50y)
 * → grey (>50y / surplus). Reads on both parchment and dark via FEH tokens.
 */

export function colorForRunway(years: number): string {
  if (years <= 5) return 'var(--feh-critical)';
  if (years <= 15) return 'var(--feh-warning)';
  if (years <= 50) return 'var(--feh-stable)';
  return 'var(--text-muted)';
}

/** Slightly more transparent variant for filling country polygons. */
export function fillForRunway(years: number, alpha = 0.78): string {
  if (years <= 5) return `color-mix(in srgb, var(--feh-critical) ${alpha * 100}%, transparent)`;
  if (years <= 15) return `color-mix(in srgb, var(--feh-warning) ${alpha * 100}%, transparent)`;
  if (years <= 50) return `color-mix(in srgb, var(--feh-stable) ${alpha * 100}%, transparent)`;
  return `color-mix(in srgb, var(--text-muted) 30%, transparent)`;
}

/** Severity label, used in dossier. */
export function severityLabel(years: number): string {
  if (years <= 5) return 'CRITICAL';
  if (years <= 15) return 'ELEVATED';
  if (years <= 50) return 'NOMINAL';
  return 'STABLE';
}
