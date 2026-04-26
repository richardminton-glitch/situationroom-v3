'use client';

/**
 * PetroDollarChart — layered line chart showing DXY base + 3 erosion overlays
 * indexed to 100 at series start. All four lines on a shared y-axis so the
 * editorial point reads visually: DXY can rise while the erosion layers
 * also rise.
 *
 * Toggle DXY-ALONE / FULL-STACK collapses the 3 overlays to declutter — the
 * "consensus view" vs the "contrarian view".
 */

import { useMemo, useRef, useState } from 'react';
import type { PetroAnnotation, PetroPoint } from '@/lib/feh/petro-dollar-seed';

interface PetroDollarChartProps {
  data: PetroPoint[];
  annotations: PetroAnnotation[];
  showStack: boolean;
  height?: number;
}

const PAD_LEFT = 28;
const PAD_RIGHT = 12;
const PAD_TOP = 22;
const PAD_BOTTOM = 28;

const SERIES = [
  { key: 'dxy',        label: 'DXY',          color: 'var(--text-muted)',     baseLayer: true  },
  { key: 'yuanOil',    label: 'YUAN OIL %',   color: 'var(--feh-critical)',   baseLayer: false },
  { key: 'goldRepat',  label: 'GOLD REPAT',   color: 'var(--feh-warning)',    baseLayer: false },
  { key: 'bricsSwaps', label: 'BRICS SWAPS',  color: 'var(--feh-stable)',     baseLayer: false },
] as const;

export function PetroDollarChart({ data, annotations, showStack, height = 360 }: PetroDollarChartProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(720);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  if (typeof window !== 'undefined' && !containerRef.current) {
    setTimeout(() => {
      if (!containerRef.current) return;
      const ro = new ResizeObserver((entries) => {
        const r = entries[0]?.contentRect;
        if (r) setWidth(Math.max(320, r.width));
      });
      ro.observe(containerRef.current);
    }, 0);
  }

  const visibleSeries = showStack ? SERIES : SERIES.filter((s) => s.baseLayer);

  const { yMin, yMax, paths, points, annotationXs } = useMemo(() => {
    const allValues: number[] = [];
    for (const s of visibleSeries) {
      for (const d of data) allValues.push(d[s.key]);
    }
    const lo = Math.min(...allValues);
    const hi = Math.max(...allValues);
    const range = Math.max(1, hi - lo);
    const innerW = width - PAD_LEFT - PAD_RIGHT;
    const innerH = height - PAD_TOP - PAD_BOTTOM;

    const xFor = (i: number) => PAD_LEFT + (i / (data.length - 1)) * innerW;
    const yFor = (v: number) => PAD_TOP + (1 - (v - lo) / range) * innerH;

    const seriesPaths: Record<string, string> = {};
    for (const s of visibleSeries) {
      seriesPaths[s.key] = data
        .map((d, i) => `${i === 0 ? 'M' : 'L'} ${xFor(i).toFixed(2)} ${yFor(d[s.key]).toFixed(2)}`)
        .join(' ');
    }

    const pts = data.map((d, i) => ({ x: xFor(i), d, i }));

    const annoXs = annotations.map((a) => {
      const idx = data.findIndex((d) => d.date === a.date);
      if (idx < 0) return null;
      return { x: pts[idx].x, label: a.label, short: a.short, idx };
    }).filter(Boolean) as { x: number; label: string; short: string; idx: number }[];

    return { yMin: lo, yMax: hi, paths: seriesPaths, points: pts, annotationXs: annoXs };
  }, [data, annotations, width, height, visibleSeries]);

  const onMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * width;
    if (x < PAD_LEFT || x > width - PAD_RIGHT) {
      setHoverIdx(null);
      return;
    }
    const innerW = width - PAD_LEFT - PAD_RIGHT;
    const i = Math.round(((x - PAD_LEFT) / innerW) * (data.length - 1));
    setHoverIdx(Math.max(0, Math.min(data.length - 1, i)));
  };

  const hoverPt = hoverIdx != null ? points[hoverIdx] : null;
  const startLabel = data[0].date;
  const endLabel = data[data.length - 1].date;

  // Year ticks every 2 years
  const yearTicks: { x: number; label: string }[] = [];
  for (let i = 0; i < data.length; i += 24) {
    const yr = data[i].date.slice(0, 4);
    yearTicks.push({ x: points[i].x, label: yr });
  }

  return (
    <div ref={containerRef} className="relative w-full">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width="100%"
        height={height}
        onMouseMove={onMove}
        onMouseLeave={() => setHoverIdx(null)}
        style={{ display: 'block' }}
      >
        {/* y-axis gridlines + labels (3 lines) */}
        {[0, 0.5, 1].map((t) => {
          const y = PAD_TOP + t * (height - PAD_TOP - PAD_BOTTOM);
          const v = yMax - (yMax - yMin) * t;
          return (
            <g key={t}>
              <line x1={PAD_LEFT} y1={y} x2={width - PAD_RIGHT} y2={y}
                    stroke="var(--border-subtle)" strokeDasharray="2 4" strokeWidth={0.6} />
              <text x={PAD_LEFT - 4} y={y + 3} textAnchor="end"
                    fontSize={9} fontFamily="var(--feh-font-mono)" fill="var(--text-muted)" letterSpacing="0.1em">
                {v.toFixed(0)}
              </text>
            </g>
          );
        })}

        {/* Year ticks */}
        {yearTicks.map((t) => (
          <text key={t.x} x={t.x} y={height - 6} textAnchor="middle"
                fontSize={9} fontFamily="var(--feh-font-mono)" fill="var(--text-muted)" letterSpacing="0.12em">
            {t.label}
          </text>
        ))}

        {/* Annotations */}
        {annotationXs.map((a) => (
          <g key={a.idx}>
            <line
              x1={a.x} x2={a.x}
              y1={PAD_TOP - 6} y2={height - PAD_BOTTOM + 4}
              stroke="var(--feh-critical)"
              strokeWidth={1}
              strokeDasharray="3 3"
              opacity={0.6}
            />
            <text
              x={a.x + 3}
              y={PAD_TOP + 3}
              fontSize={9}
              fontFamily="var(--feh-font-mono)"
              fill="var(--feh-critical)"
              letterSpacing="0.12em"
              fontWeight={700}
              opacity={0.85}
            >
              ▼ {a.short}
            </text>
          </g>
        ))}

        {/* Series lines — base layer first (so it sits behind) */}
        {visibleSeries.map((s) => (
          <path
            key={s.key}
            d={paths[s.key]}
            fill="none"
            stroke={s.color}
            strokeWidth={s.baseLayer ? 1.6 : 1.4}
            strokeDasharray={s.baseLayer ? '4 3' : undefined}
            opacity={s.baseLayer ? 0.7 : 0.95}
          />
        ))}

        {/* Hover indicator */}
        {hoverPt && (
          <line
            x1={hoverPt.x} x2={hoverPt.x}
            y1={PAD_TOP - 4} y2={height - PAD_BOTTOM + 4}
            stroke="var(--text-muted)"
            strokeWidth={0.5}
            strokeDasharray="1 3"
          />
        )}
      </svg>

      {/* Legend */}
      <div
        className="flex flex-wrap gap-3 px-2 mt-2"
        style={{
          fontFamily: 'var(--feh-font-mono)',
          fontSize: 9,
          letterSpacing: '0.14em',
          color: 'var(--text-muted)',
        }}
      >
        {visibleSeries.map((s) => (
          <span key={s.key} className="inline-flex items-center gap-1.5">
            <span
              style={{
                display: 'inline-block',
                width: 14,
                height: 2,
                backgroundColor: s.color,
                borderTop: s.baseLayer ? '1px dashed transparent' : 'none',
              }}
            />
            <span style={{ color: 'var(--text-secondary)' }}>{s.label}</span>
          </span>
        ))}
      </div>

      {/* Hover snapshot */}
      {hoverPt && (
        <div
          className="absolute pointer-events-none border px-2 py-1.5 z-10"
          style={{
            left: Math.min(hoverPt.x + 8, width - 180),
            top: PAD_TOP,
            backgroundColor: 'var(--bg-card)',
            borderColor: 'var(--feh-critical)',
            fontFamily: 'var(--feh-font-mono)',
            fontSize: 10,
            letterSpacing: '0.06em',
            color: 'var(--text-primary)',
            whiteSpace: 'nowrap',
            minWidth: 150,
          }}
        >
          <div style={{ color: 'var(--text-muted)', fontSize: 9, letterSpacing: '0.14em', marginBottom: 3 }}>
            {hoverPt.d.date}
          </div>
          {visibleSeries.map((s) => (
            <div key={s.key} className="flex items-center justify-between gap-3">
              <span style={{ color: s.color }}>{s.label}</span>
              <span style={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                {hoverPt.d[s.key].toFixed(1)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
