'use client';

/**
 * MalinvestmentRadar — 9-axis radar chart showing sector stress scores.
 *
 * Hand-rolled SVG (recharts radar styling fights the dossier aesthetic).
 * Each axis = one sector at 0-100, sectors arranged equally around the
 * polar circle. Click an axis label to highlight the matching dossier card
 * via the parent's onSelectId callback.
 */

import { useMemo } from 'react';
import type { MalinvestmentSector } from '@/lib/feh/malinvestment-seed';

interface MalinvestmentRadarProps {
  sectors: MalinvestmentSector[];
  selectedId: string | null;
  onSelectId: (id: string | null) => void;
  size?: number;
}

const RING_LEVELS = [25, 50, 75, 100];

export function MalinvestmentRadar({
  sectors,
  selectedId,
  onSelectId,
  size = 380,
}: MalinvestmentRadarProps) {
  const cx = size / 2;
  const cy = size / 2;
  const radius = size / 2 - 56;

  const axes = useMemo(() => {
    return sectors.map((s, i) => {
      const angle = (i / sectors.length) * Math.PI * 2 - Math.PI / 2;
      return { sector: s, angle, x: Math.cos(angle), y: Math.sin(angle) };
    });
  }, [sectors]);

  const polygonPoints = axes
    .map((a) => {
      const r = radius * (a.sector.stress / 100);
      return `${(cx + a.x * r).toFixed(2)},${(cy + a.y * r).toFixed(2)}`;
    })
    .join(' ');

  return (
    <svg viewBox={`0 0 ${size} ${size}`} width="100%" height={size} style={{ display: 'block' }}>
      {/* Concentric ring grid */}
      {RING_LEVELS.map((lvl) => (
        <circle
          key={lvl}
          cx={cx}
          cy={cy}
          r={radius * (lvl / 100)}
          fill="none"
          stroke="var(--border-subtle)"
          strokeWidth={0.6}
          strokeDasharray={lvl === 100 ? undefined : '2 4'}
        />
      ))}

      {/* Ring labels (only on the topmost spoke) */}
      {RING_LEVELS.map((lvl) => (
        <text
          key={lvl}
          x={cx + 3}
          y={cy - radius * (lvl / 100) - 2}
          fontSize={9}
          fontFamily="var(--feh-font-mono)"
          fill="var(--text-muted)"
          letterSpacing="0.1em"
        >
          {lvl}
        </text>
      ))}

      {/* Spokes */}
      {axes.map((a) => (
        <line
          key={a.sector.id}
          x1={cx}
          y1={cy}
          x2={cx + a.x * radius}
          y2={cy + a.y * radius}
          stroke="var(--border-subtle)"
          strokeWidth={0.5}
        />
      ))}

      {/* Stress polygon */}
      <polygon
        points={polygonPoints}
        fill="color-mix(in srgb, var(--feh-critical) 14%, transparent)"
        stroke="var(--feh-critical)"
        strokeWidth={1.4}
      />

      {/* Axis dots — emphasize selected */}
      {axes.map((a) => {
        const r = radius * (a.sector.stress / 100);
        const isSelected = a.sector.id === selectedId;
        return (
          <circle
            key={a.sector.id}
            cx={cx + a.x * r}
            cy={cy + a.y * r}
            r={isSelected ? 5 : 3}
            fill={isSelected ? 'var(--feh-critical)' : 'var(--feh-warning)'}
            stroke="var(--bg-card)"
            strokeWidth={1}
          />
        );
      })}

      {/* Axis labels — clickable */}
      {axes.map((a) => {
        const labelDistance = radius + 18;
        const lx = cx + a.x * labelDistance;
        const ly = cy + a.y * labelDistance;
        const isSelected = a.sector.id === selectedId;
        const anchor = a.x > 0.2 ? 'start' : a.x < -0.2 ? 'end' : 'middle';
        return (
          <g
            key={a.sector.id}
            style={{ cursor: 'pointer' }}
            onClick={() => onSelectId(isSelected ? null : a.sector.id)}
          >
            <text
              x={lx}
              y={ly}
              textAnchor={anchor}
              fontSize={10}
              fontFamily="var(--feh-font-mono)"
              fill={isSelected ? 'var(--feh-critical)' : 'var(--text-secondary)'}
              fontWeight={isSelected ? 700 : 500}
              letterSpacing="0.14em"
              dominantBaseline="middle"
            >
              {a.sector.short}
            </text>
            <text
              x={lx}
              y={ly + 11}
              textAnchor={anchor}
              fontSize={9}
              fontFamily="var(--feh-font-mono)"
              fill={isSelected ? 'var(--feh-critical)' : 'var(--text-muted)'}
              fontVariantNumeric="tabular-nums"
              letterSpacing="0.06em"
              dominantBaseline="middle"
            >
              {a.sector.stress}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
