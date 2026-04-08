'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { ReactNode } from 'react';
import { PanelLoading } from './shared';
import { useTheme } from '@/components/layout/ThemeProvider';
import { useTier } from '@/hooks/useTier';
import Link from 'next/link';
import { ConvictionBreakdownModal } from './ConvictionBreakdownModal';
import type { ConvictionResult } from '@/lib/conviction/engine';
import {
  ChatCircleDots,
  TrendUp,
  LinkSimple,
  Graph,
  Globe,
} from '@phosphor-icons/react';

const DARK_BAND_COLORS: Record<string, string> = {
  'Maximum Conviction': '#2dd4bf',  // bright teal
  'Strong Conviction':  '#0aa89e',  // mid teal
  'Moderate':           '#c4885a',  // muted amber
  'Weak Signal':        '#d06050',  // muted coral
  'Contra-Conviction':  '#c04040',  // red
};

const SIG_ICON_SIZE = 12;

const SIGNAL_ICONS: Record<string, ReactNode> = {
  sentiment: <ChatCircleDots size={SIG_ICON_SIZE} weight="regular" />,
  momentum: <TrendUp size={SIG_ICON_SIZE} weight="regular" />,
  onchain: <LinkSimple size={SIG_ICON_SIZE} weight="regular" />,
  network: <Graph size={SIG_ICON_SIZE} weight="regular" />,
  macro: <Globe size={SIG_ICON_SIZE} weight="regular" />,
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
  const [modalOpen, setModalOpen] = useState(false);
  const { theme } = useTheme();
  const { canAccess } = useTier();

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
    <>
      <div
        className="flex items-center gap-3"
        style={{ width: '100%', cursor: 'pointer' }}
        onClick={() => setModalOpen(true)}
        title="Click for full conviction breakdown"
      >
        {/* Signal list — General+ sees breakdown, free sees unlock link */}
        {canAccess('general') ? (
          <div className="flex-1">
            {data.signals.map((sig) => (
              <div key={sig.key} className="flex items-center justify-between py-0.5">
                <span className="text-xs inline-flex items-center" style={{ color: 'var(--text-muted)' }}>
                  <span className="inline-flex w-4 justify-center">{SIGNAL_ICONS[sig.key] || '•'}</span>
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
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <Link
              href="/support"
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '10px',
                letterSpacing: '0.1em',
                color: 'var(--accent-primary)',
                textDecoration: 'none',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              UNLOCK →
            </Link>
          </div>
        )}

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

      {/* Breakdown modal — portaled to body */}
      {modalOpen && typeof document !== 'undefined' && createPortal(
        <ConvictionBreakdownModal
          data={data}
          onClose={() => setModalOpen(false)}
        />,
        document.body,
      )}
    </>
  );
}
