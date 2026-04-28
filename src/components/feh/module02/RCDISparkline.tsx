'use client';

/**
 * RCDISparkline — full-bleed 5-year sparkline with annotated inflection.
 *
 * Hand-rolled SVG (no recharts overhead) — gives us full control over the
 * dossier-aesthetic chrome: dashed annotation line, hand-set tick density,
 * reduced label budget, no axes. Hover any month → tooltip with date + value.
 */

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { RCDIAnnotation, RCDIPoint } from '@/lib/feh/rcdi-seed';

interface RCDISparklineProps {
  data: RCDIPoint[];
  annotations: RCDIAnnotation[];
  height?: number;
}

const PAD_LEFT = 12;
const PAD_RIGHT = 12;
const PAD_TOP = 18;
const PAD_BOTTOM = 22;

export function RCDISparkline({ data, annotations, height = 160 }: RCDISparklineProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  // null until measured — see PetroDollarChart for the SSR-letterbox rationale.
  const [width, setWidth] = useState<number | null>(null);

  useLayoutEffect(() => {
    if (!containerRef.current) return;
    const w = containerRef.current.clientWidth;
    if (w > 0) setWidth(Math.max(280, w));
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver((entries) => {
      const r = entries[0]?.contentRect;
      if (r) setWidth(Math.max(280, r.width));
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  const { minV, maxV, points, annotationXs } = useMemo(() => {
    if (width == null) {
      return { minV: 0, maxV: 0, points: [] as { x: number; y: number; d: RCDIPoint; i: number }[], annotationXs: [] as { x: number; label: string; idx: number }[] };
    }
    const values = data.map((d) => d.value);
    const lo = Math.min(...values);
    const hi = Math.max(...values);
    const range = Math.max(1, hi - lo);
    const innerW = width - PAD_LEFT - PAD_RIGHT;
    const innerH = height - PAD_TOP - PAD_BOTTOM;

    const pts = data.map((d, i) => ({
      x: PAD_LEFT + (i / (data.length - 1)) * innerW,
      y: PAD_TOP + (1 - (d.value - lo) / range) * innerH,
      d,
      i,
    }));

    const annoXs = annotations.map((a) => {
      const idx = data.findIndex((d) => d.date === a.date);
      if (idx < 0) return null;
      return { x: pts[idx].x, label: a.label, idx };
    }).filter(Boolean) as { x: number; label: string; idx: number }[];

    return { minV: lo, maxV: hi, points: pts, annotationXs: annoXs };
  }, [data, annotations, width, height]);

  const linePath = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`)
    .join(' ');

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

  if (width == null) {
    return <div ref={containerRef} className="relative w-full" style={{ height }} />;
  }

  const startLabel = data[0].date.replace('-', '·');
  const endLabel = data[data.length - 1].date.replace('-', '·');

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
        {/* Min/max gridlines */}
        <line x1={PAD_LEFT} y1={PAD_TOP} x2={width - PAD_RIGHT} y2={PAD_TOP}
              stroke="var(--border-subtle)" strokeDasharray="2 4" strokeWidth={0.6} />
        <line x1={PAD_LEFT} y1={height - PAD_BOTTOM} x2={width - PAD_RIGHT} y2={height - PAD_BOTTOM}
              stroke="var(--border-subtle)" strokeDasharray="2 4" strokeWidth={0.6} />

        {/* Min/max value labels (left) */}
        <text x={PAD_LEFT} y={PAD_TOP - 4}
              fontSize={9} fontFamily="var(--feh-font-mono)" fill="var(--text-muted)" letterSpacing="0.12em">
          {maxV.toFixed(0)}
        </text>
        <text x={PAD_LEFT} y={height - PAD_BOTTOM + 12}
              fontSize={9} fontFamily="var(--feh-font-mono)" fill="var(--text-muted)" letterSpacing="0.12em">
          {minV.toFixed(0)}
        </text>

        {/* Date range labels (bottom) */}
        <text x={PAD_LEFT} y={height - 4}
              fontSize={9} fontFamily="var(--feh-font-mono)" fill="var(--text-muted)" letterSpacing="0.16em">
          {startLabel}
        </text>
        <text x={width - PAD_RIGHT} y={height - 4} textAnchor="end"
              fontSize={9} fontFamily="var(--feh-font-mono)" fill="var(--text-muted)" letterSpacing="0.16em">
          {endLabel}
        </text>

        {/* Annotations — vertical dashed marker + label */}
        {annotationXs.map((a, k) => (
          <g key={k}>
            <line
              x1={a.x} x2={a.x}
              y1={PAD_TOP - 6} y2={height - PAD_BOTTOM + 4}
              stroke="var(--feh-critical)"
              strokeWidth={1}
              strokeDasharray="3 3"
              opacity={0.85}
            />
            <text
              x={a.x + 4}
              y={PAD_TOP + 4}
              fontSize={9}
              fontFamily="var(--feh-font-mono)"
              fill="var(--feh-critical)"
              letterSpacing="0.14em"
              fontWeight={700}
            >
              ▼ {a.label}
            </text>
          </g>
        ))}

        {/* Sparkline */}
        <path d={linePath} fill="none" stroke="var(--feh-warning)" strokeWidth={1.6} />

        {/* Latest-point dot */}
        {points.length > 0 && (
          <circle
            cx={points[points.length - 1].x}
            cy={points[points.length - 1].y}
            r={3}
            fill="var(--feh-warning)"
          />
        )}

        {/* Hover indicator */}
        {hoverPt && (
          <>
            <line
              x1={hoverPt.x} x2={hoverPt.x}
              y1={PAD_TOP - 4} y2={height - PAD_BOTTOM + 4}
              stroke="var(--text-muted)"
              strokeWidth={0.5}
              strokeDasharray="1 3"
            />
            <circle cx={hoverPt.x} cy={hoverPt.y} r={3.5} fill="var(--feh-critical)" />
          </>
        )}
      </svg>

      {/* Hover tooltip */}
      {hoverPt && (
        <div
          className="absolute pointer-events-none border px-2 py-1 z-10"
          style={{
            left: Math.min(hoverPt.x + 8, width - 130),
            top: Math.max(0, hoverPt.y - 30),
            backgroundColor: 'var(--bg-card)',
            borderColor: 'var(--feh-critical)',
            fontFamily: 'var(--feh-font-mono)',
            fontSize: 10,
            letterSpacing: '0.08em',
            color: 'var(--text-primary)',
            whiteSpace: 'nowrap',
          }}
        >
          <div style={{ color: 'var(--text-muted)', fontSize: 9, letterSpacing: '0.16em' }}>{hoverPt.d.date}</div>
          <div style={{ fontWeight: 700 }}>RCDI {hoverPt.d.value.toFixed(1)}</div>
        </div>
      )}
    </div>
  );
}
