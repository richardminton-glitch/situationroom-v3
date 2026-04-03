'use client';

import { useState, useEffect } from 'react';
import { PanelLoading } from './shared';
import { useTheme } from '@/components/layout/ThemeProvider';
import { BlurGate } from '@/components/auth/BlurGate';
import type { ConvictionResult } from '@/lib/conviction/engine';

const DARK_BAND_COLORS: Record<string, string> = {
  'Maximum Conviction': '#2dd4bf',  // bright teal
  'Strong Conviction':  '#0aa89e',  // mid teal
  'Moderate':           '#c4885a',  // muted amber
  'Weak Signal':        '#d06050',  // muted coral
  'Contra-Conviction':  '#c04040',  // red
};

const SIGNAL_ICONS: Record<string, string> = {
  sentiment: '◈',
  momentum: '△',
  onchain: '◇',
  network: '⬡',
  macro: '⊕',
};

function GaugeArc({ score, color }: { score: number; color: string }) {
  const GAUGE_START = 225;
  const GAUGE_SPAN = 270;
  const R = 38;
  const CX = 44;
  const CY = 44;

  const toRad = (deg: number) => ((deg - 90) * Math.PI) / 180;
  const arcPoint = (deg: number) => ({
    x: CX + R * Math.cos(toRad(deg)),
    y: CY + R * Math.sin(toRad(deg)),
  });

  const bgStart = arcPoint(GAUGE_START);
  const bgEnd = arcPoint(GAUGE_START + GAUGE_SPAN);
  const bgPath = `M ${bgStart.x} ${bgStart.y} A ${R} ${R} 0 1 1 ${bgEnd.x} ${bgEnd.y}`;

  const fillEnd = GAUGE_START + GAUGE_SPAN * (score / 100);
  const fillEndPt = arcPoint(fillEnd);
  const largeArc = (fillEnd - GAUGE_START) > 180 ? 1 : 0;
  const fillPath = `M ${bgStart.x} ${bgStart.y} A ${R} ${R} 0 ${largeArc} 1 ${fillEndPt.x} ${fillEndPt.y}`;

  return (
    <svg width="88" height="88" viewBox="0 0 88 88">
      <path d={bgPath} fill="none" stroke="var(--border-subtle)" strokeWidth="6" strokeLinecap="round" />
      <path d={fillPath} fill="none" stroke={color} strokeWidth="6" strokeLinecap="round" />
      <text x={CX} y={CY + 2} textAnchor="middle" dominantBaseline="middle"
        fill={color} fontSize="18" fontWeight="bold" fontFamily="var(--font-data)">
        {score}
      </text>
    </svg>
  );
}

function dirColor(dir: string): string {
  if (dir === 'bullish') return 'var(--accent-success)';
  if (dir === 'bearish') return 'var(--accent-danger)';
  return 'var(--text-muted)';
}

export function ConvictionPanel() {
  const [data, setData] = useState<ConvictionResult | null>(null);
  const [loading, setLoading] = useState(true);
  const { theme } = useTheme();

  useEffect(() => {
    async function fetch_() {
      try {
        const res = await fetch('/api/data/conviction');
        if (res.ok) setData(await res.json());
      } catch { /* */ }
      finally { setLoading(false); }
    }
    fetch_();
    const interval = setInterval(fetch_, 300_000);
    return () => clearInterval(interval);
  }, []);

  if (loading || !data) return <PanelLoading />;

  const bandColor = theme === 'dark'
    ? (DARK_BAND_COLORS[data.band] ?? data.bandColor)
    : data.bandColor;

  return (
    <div className="flex items-center gap-3" style={{ width: '100%' }}>
      {/* Signal list — gated: General required for breakdown */}
      <BlurGate requiredTier="general" featureName="Conviction Breakdown">
        <div className="flex-1">
          {data.signals.map((sig) => (
            <div key={sig.key} className="flex items-center justify-between py-0.5">
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                <span className="inline-block w-4 text-center">{SIGNAL_ICONS[sig.key] || '•'}</span>
                {' '}
                <span className="uppercase tracking-wider" style={{ fontSize: '9px', letterSpacing: '0.06em' }}>
                  {sig.name.split(' ')[0]}
                </span>
              </span>
              <span className="text-xs font-medium" style={{ fontFamily: 'var(--font-data)', color: dirColor(sig.direction) }}>
                {sig.score}
              </span>
            </div>
          ))}
        </div>
      </BlurGate>

      {/* Gauge */}
      <div className="shrink-0 text-center">
        <GaugeArc score={data.composite} color={bandColor} />
        <div
          className="text-xs uppercase tracking-widest font-medium -mt-1"
          style={{ color: bandColor, fontSize: '8px', letterSpacing: '0.1em' }}
        >
          {data.band.split(' ').map((w) => <div key={w}>{w}</div>)}
        </div>
      </div>
    </div>
  );
}
