import * as d3 from 'd3';
import type { MetricDef } from './metrics';

// Parchment-appropriate desaturated palette
const GOOD_COLOR = '#3d6b4f';   // muted forest green
const MID_COLOR  = '#b59010';   // amber ochre
const BAD_COLOR  = '#7a2e1a';   // deep terracotta
const NO_DATA    = '#d4c9b8';   // parchment neutral

export { NO_DATA };

/**
 * Build a colour scale for a metric given the dataset values.
 * Returns a function: (value | null) => hex colour string.
 */
export function buildColourScale(
  metric: MetricDef,
  values: (number | null)[],
): (v: number | null) => string {
  const valid = values.filter((v): v is number => v != null);
  if (valid.length === 0) return () => NO_DATA;

  const [lo, hi] = metric.domain ?? [d3.min(valid)!, d3.max(valid)!];
  if (lo === hi) return () => MID_COLOR;

  // Normalise to 0–1 where 1 = "best"
  const normalise = metric.higherIsBetter
    ? d3.scaleLinear().domain([lo, hi]).range([0, 1]).clamp(true)
    : d3.scaleLinear().domain([lo, hi]).range([1, 0]).clamp(true);

  // For rank metrics (lower = better), reverse domain for normalise already handles it
  const colourInterp = d3.scaleLinear<string>()
    .domain([0, 0.5, 1])
    .range([BAD_COLOR, MID_COLOR, GOOD_COLOR])
    .interpolate(d3.interpolateLab as unknown as (a: string, b: string) => (t: number) => string);

  return (v: number | null) => {
    if (v == null) return NO_DATA;
    return colourInterp(normalise(v));
  };
}

/** Returns the three-stop gradient for the legend */
export function getLegendStops(metric: MetricDef): { color: string; label: string }[] {
  if (metric.higherIsBetter) {
    return [
      { color: GOOD_COLOR, label: 'HIGH' },
      { color: MID_COLOR, label: '' },
      { color: BAD_COLOR, label: 'LOW' },
    ];
  }
  return [
    { color: GOOD_COLOR, label: 'LOW' },
    { color: MID_COLOR, label: '' },
    { color: BAD_COLOR, label: 'HIGH' },
  ];
}
