'use client';

/**
 * PuellMultiplePanel — "PUELL MULTIPLE"
 *
 * Recharts ComposedChart showing the Puell Multiple over 90 days with
 * horizontal zone bands for macro regime context.
 *
 * Puell Multiple = daily miner revenue / 365-day MA of daily miner revenue
 *
 * Zones (Edward's convention):
 *   < 0.5    Extreme undervalue — deep green (historically strong buy)
 *   0.5–1.0  Undervalue / accumulation — light green
 *   1.0–2.0  Normal — neutral
 *   2.0–4.0  Elevated — amber
 *   > 4.0    Extreme overvalue — red (historically strong sell)
 *
 * Data: /api/data/puell (BRK price series, computed server-side)
 */

import { useEffect, useState } from 'react';
import {
  ComposedChart,
  Line,
  ReferenceLine,
  ReferenceArea,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useTheme } from '@/components/layout/ThemeProvider';
import { chartColors, PanelLoading } from './shared';

interface PuellPoint {
  date:  string;
  puell: number;
  price: number;
  zone:  'extreme-low' | 'undervalue' | 'normal' | 'elevated' | 'extreme-high';
}

interface PuellResponse {
  data:         PuellPoint[];
  current:      number;
  currentZone:  PuellPoint['zone'];
  signal:       'bullish' | 'neutral' | 'bearish';
}

interface ChartPoint extends PuellPoint {
  label: string;
}

// Parchment-themed zone colours — muted earth tones matching the design identity
const ZONE_META_PARCHMENT: Record<PuellPoint['zone'], { label: string; color: string; bg: string }> = {
  'extreme-low':  { label: 'EXTREME UNDERVALUE', color: '#2a6e2a', bg: 'rgba(42,110,42,0.10)' },
  'undervalue':   { label: 'UNDERVALUE',          color: '#5a7e2a', bg: 'rgba(90,126,42,0.08)' },
  'normal':       { label: 'NORMAL',              color: '#8b7355', bg: 'transparent' },
  'elevated':     { label: 'ELEVATED',            color: '#b8860b', bg: 'rgba(184,134,11,0.08)' },
  'extreme-high': { label: 'EXTREME OVERVALUE',   color: '#c04040', bg: 'rgba(192,64,64,0.10)' },
};

const ZONE_META_DARK: Record<PuellPoint['zone'], { label: string; color: string; bg: string }> = {
  'extreme-low':  { label: 'EXTREME UNDERVALUE', color: '#22c55e', bg: 'rgba(34,197,94,0.15)' },
  'undervalue':   { label: 'UNDERVALUE',          color: '#86efac', bg: 'rgba(134,239,172,0.1)' },
  'normal':       { label: 'NORMAL',              color: '#a8a29e', bg: 'transparent' },
  'elevated':     { label: 'ELEVATED',            color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
  'extreme-high': { label: 'EXTREME OVERVALUE',   color: '#ef4444', bg: 'rgba(239,68,68,0.15)' },
};

function formatDateLabel(iso: string): string {
  const d = new Date(iso + 'T00:00:00Z');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
}

type ZoneMeta = Record<PuellPoint['zone'], { label: string; color: string; bg: string }>;

function CustomTooltip({ active, payload, label, zoneMeta }: { active?: boolean; payload?: { value?: number; payload?: ChartPoint }[]; label?: string; zoneMeta?: ZoneMeta }) {
  if (!active || !payload?.length) return null;
  const point = payload[0]?.payload as ChartPoint | undefined;
  const meta = zoneMeta ?? ZONE_META_DARK;
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-primary)', padding: '8px 12px', fontFamily: 'var(--font-mono)', fontSize: '10px' }}>
      <div style={{ color: 'var(--text-secondary)', marginBottom: '4px' }}>{label}</div>
      <div style={{ color: point ? meta[point.zone].color : 'var(--text-primary)', fontWeight: 'bold' }}>
        Puell: {payload[0]?.value?.toFixed(2)}
      </div>
      {point && (
        <div style={{ color: 'var(--text-muted)', marginTop: '2px' }}>
          ${point.price.toLocaleString()}
        </div>
      )}
    </div>
  );
}

export function PuellMultiplePanel() {
  const { theme } = useTheme();
  const isDark    = theme === 'dark';
  const cc        = chartColors(isDark);
  const ZONE_META = isDark ? ZONE_META_DARK : ZONE_META_PARCHMENT;

  const [resp,    setResp]    = useState<PuellResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/data/puell')
      .then((r) => r.ok ? r.json() : Promise.reject(r.statusText))
      .then(setResp)
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <PanelLoading />;
  if (error || !resp || resp.data.length === 0) {
    return <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)', padding: '12px' }}>Puell data unavailable</div>;
  }

  const chartData: ChartPoint[] = resp.data.map((p) => ({ ...p, label: formatDateLabel(p.date) }));
  const meta = ZONE_META[resp.currentZone];

  const step   = Math.max(1, Math.floor(chartData.length / 7));
  const xTicks = chartData.filter((_, i) => i % step === 0).map((p) => p.label);

  // Dynamic Y axis max (cap at 8 unless current exceeds)
  const maxPuell = Math.max(4.5, ...resp.data.map((p) => p.puell));
  const yMax     = Math.min(maxPuell * 1.1, 12);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '8px' }}>
      {/* Current value + zone */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '6px 10px', backgroundColor: meta.bg,
        border: `1px solid ${meta.color}40`,
      }}>
        <div>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.1em', color: 'var(--text-muted)' }}>PUELL MULTIPLE · </span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.1em', color: meta.color, fontWeight: 'bold' }}>
            {meta.label}
          </span>
        </div>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '16px', color: meta.color, fontWeight: 'bold' }}>
          {resp.current.toFixed(2)}
        </span>
      </div>

      {/* Chart */}
      <div style={{ flex: 1, minHeight: 0 }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
            {/* Zone background bands */}
            <ReferenceArea y1={0}   y2={0.5} fill={ZONE_META['extreme-low'].bg}  ifOverflow="hidden" />
            <ReferenceArea y1={0.5} y2={1.0} fill={ZONE_META['undervalue'].bg}   ifOverflow="hidden" />
            <ReferenceArea y1={2.0} y2={4.0} fill={ZONE_META['elevated'].bg}     ifOverflow="hidden" />
            <ReferenceArea y1={4.0} y2={yMax} fill={ZONE_META['extreme-high'].bg} ifOverflow="hidden" />

            <CartesianGrid strokeDasharray="3 3" stroke={cc.gridLine} />
            <XAxis
              dataKey="label"
              ticks={xTicks}
              tick={{ fontSize: 8, fontFamily: 'var(--font-mono)', fill: cc.axisTick }}
              axisLine={{ stroke: cc.gridLine }}
              tickLine={false}
            />
            <YAxis
              domain={[0, yMax]}
              tickFormatter={(v: number) => v.toFixed(1)}
              tick={{ fontSize: 8, fontFamily: 'var(--font-mono)', fill: cc.axisTick }}
              axisLine={false}
              tickLine={false}
              width={32}
            />
            <Tooltip content={<CustomTooltip zoneMeta={ZONE_META} />} />

            {/* Zone boundary lines */}
            <ReferenceLine y={0.5} stroke={ZONE_META['extreme-low'].color} strokeDasharray="4 2" strokeWidth={1} strokeOpacity={0.5} />
            <ReferenceLine y={1.0} stroke={cc.axisTick}                    strokeDasharray="4 2" strokeWidth={1} strokeOpacity={0.5} />
            <ReferenceLine y={2.0} stroke={ZONE_META['elevated'].color}    strokeDasharray="4 2" strokeWidth={1} strokeOpacity={0.5} />
            <ReferenceLine y={4.0} stroke={ZONE_META['extreme-high'].color} strokeDasharray="4 2" strokeWidth={1} strokeOpacity={0.5} />

            {/* Puell Multiple line — colored per zone */}
            <Line
              type="monotone"
              dataKey="puell"
              stroke={meta.color}
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
              name="Puell"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Zone legend */}
      <div style={{ display: 'flex', gap: '8px', paddingLeft: '36px', paddingBottom: '2px', flexWrap: 'wrap' }}>
        {Object.entries(ZONE_META).map(([key, z]) => (
          <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '3px', opacity: key === resp.currentZone ? 1 : 0.5 }}>
            <div style={{ width: '8px', height: '8px', backgroundColor: z.color, borderRadius: '1px' }} />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: 'var(--text-muted)' }}>{z.label}</span>
          </div>
        ))}
      </div>

      {/* Callout */}
      <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--text-muted)', lineHeight: 1.5, padding: '6px 10px', borderTop: '1px solid var(--border-subtle)', margin: 0 }}>
        Puell Multiple compares today's miner revenue to the 365-day average. Values below 0.5 indicate
        deep miner capitulation — historically the strongest accumulation windows in Bitcoin cycles.
      </p>
    </div>
  );
}
