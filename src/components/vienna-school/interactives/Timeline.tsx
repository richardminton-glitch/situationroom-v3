'use client';

/**
 * Timeline (Module 1) — Austrian thinkers vs statist milestones, 1871 → 2026.
 *
 * Two parallel lanes on a horizontal axis. A slider scrubs the visible
 * range; nodes appear as the slider passes their year. Hover for tooltip.
 *
 * Built with d3 for the scale + axis only. The nodes themselves are
 * SVG circles bound declaratively from React state — easier to reason
 * about than a full d3-managed enter/update/exit cycle, and the dataset
 * is small (~20 nodes). Responsive width via a ResizeObserver.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { scaleLinear, axisBottom, select } from 'd3';
import type { TimelineNode } from '@/content/vienna-school/types';

const MIN_YEAR     = 1870;
const MAX_YEAR     = 2026;
const HEIGHT       = 320;
const MARGIN       = { top: 24, right: 24, bottom: 36, left: 24 };
const LANE_GAP     = 80;          // vertical separation between lanes
const NODE_RADIUS  = 7;
const AUSTRIAN_Y   = HEIGHT / 2 - LANE_GAP / 2;
const STATIST_Y    = HEIGHT / 2 + LANE_GAP / 2;

const AUSTRIAN_COLOR = '#b8860b';   // oxidised brass
const STATIST_COLOR  = '#9b3232';   // dried-blood red

interface Props {
  data: TimelineNode[];
}

interface Hover {
  node: TimelineNode;
  x:    number;
  y:    number;
}

export function Timeline({ data }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const axisRef = useRef<SVGGElement>(null);

  const [width,    setWidth]    = useState(800);
  const [maxYear,  setMaxYear]  = useState(MAX_YEAR);
  const [hover,    setHover]    = useState<Hover | null>(null);

  // ── Responsive width ──
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      setWidth(Math.max(360, entry.contentRect.width));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const xScale = useMemo(
    () => scaleLinear().domain([MIN_YEAR, MAX_YEAR]).range([MARGIN.left, width - MARGIN.right]),
    [width],
  );

  // ── Axis ──
  useEffect(() => {
    const g = axisRef.current;
    if (!g) return;
    const axis = axisBottom(xScale)
      .tickValues([1871, 1900, 1913, 1936, 1944, 1971, 2000, 2008, 2020, 2026])
      .tickFormat((d) => String(d as number))
      .tickSize(6);
    select(g)
      .call(axis)
      .call((sel) => {
        sel.selectAll('text').attr('font-family', 'var(--font-mono)').attr('font-size', 10).attr('fill', 'var(--text-muted)');
        sel.selectAll('line').attr('stroke', 'var(--border-primary)');
        sel.select('.domain').attr('stroke', 'var(--border-primary)');
      });
  }, [xScale]);

  const visible = data.filter((n) => n.year <= maxYear);

  return (
    <div
      style={{
        border:     '1px solid var(--border-primary)',
        background: 'var(--bg-card)',
        padding:    '24px 28px',
        marginTop:  20,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.18em', color: 'var(--text-muted)', margin: 0 }}>
            INTERACTIVE · TWO TRADITIONS
          </p>
          <h3 style={{ fontFamily: 'Georgia, serif', fontSize: 20, color: 'var(--text-primary)', margin: '4px 0 0 0', fontWeight: 600 }}>
            Scrub the slider. Watch the lineage diverge.
          </h3>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontFamily: 'var(--font-mono)', fontSize: 11 }}>
          <span style={{ color: 'var(--text-muted)' }}>YEAR</span>
          <span style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: 14, letterSpacing: '0.04em' }}>{maxYear}</span>
        </div>
      </div>

      {/* Lane labels */}
      <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.16em', marginBottom: 4 }}>
        <span style={{ color: AUSTRIAN_COLOR }}>▲ THE AUSTRIAN LINEAGE</span>
        <span style={{ color: 'var(--text-muted)' }}>{visible.filter((v) => v.lane === 'austrian').length} EVENTS</span>
      </div>

      <div ref={wrapRef} style={{ position: 'relative', width: '100%' }}>
        <svg width={width} height={HEIGHT} style={{ display: 'block' }}>
          {/* Lane guide lines */}
          <line
            x1={MARGIN.left} x2={width - MARGIN.right}
            y1={AUSTRIAN_Y}  y2={AUSTRIAN_Y}
            stroke={AUSTRIAN_COLOR} strokeOpacity={0.3} strokeWidth={1} strokeDasharray="2 4"
          />
          <line
            x1={MARGIN.left} x2={width - MARGIN.right}
            y1={STATIST_Y}   y2={STATIST_Y}
            stroke={STATIST_COLOR} strokeOpacity={0.3} strokeWidth={1} strokeDasharray="2 4"
          />

          {/* Centre divider */}
          <line
            x1={MARGIN.left} x2={width - MARGIN.right}
            y1={HEIGHT / 2}  y2={HEIGHT / 2}
            stroke="var(--border-subtle)" strokeWidth={1}
          />

          {/* Slider position marker */}
          <line
            x1={xScale(maxYear)} x2={xScale(maxYear)}
            y1={MARGIN.top - 8}  y2={HEIGHT - MARGIN.bottom}
            stroke="var(--accent-primary)" strokeWidth={1.5} strokeOpacity={0.5}
          />

          {/* Nodes */}
          {visible.map((n, i) => {
            const cx     = xScale(n.year);
            const cy     = n.lane === 'austrian' ? AUSTRIAN_Y : STATIST_Y;
            const color  = n.lane === 'austrian' ? AUSTRIAN_COLOR : STATIST_COLOR;
            const labelY = n.lane === 'austrian' ? cy - 14 : cy + 22;

            return (
              <g
                key={`${n.year}-${i}`}
                onMouseEnter={() => setHover({ node: n, x: cx, y: cy })}
                onMouseLeave={() => setHover(null)}
                style={{ cursor: 'help' }}
              >
                <circle cx={cx} cy={cy} r={NODE_RADIUS} fill={color} stroke="var(--bg-card)" strokeWidth={2} />
                <text
                  x={cx} y={labelY}
                  textAnchor="middle"
                  fontFamily="var(--font-mono)" fontSize={9} fill="var(--text-muted)"
                  letterSpacing="0.04em"
                >
                  {n.person ?? n.year}
                </text>
              </g>
            );
          })}

          {/* Axis */}
          <g ref={axisRef} transform={`translate(0, ${HEIGHT - MARGIN.bottom})`} />
        </svg>

        {/* Tooltip */}
        {hover && (
          <div
            style={{
              position:      'absolute',
              left:          Math.min(Math.max(hover.x - 140, 8), width - 296),
              top:           hover.y < HEIGHT / 2 ? hover.y + 24 : hover.y - 110,
              width:         280,
              padding:       '10px 12px',
              background:    'var(--bg-primary)',
              border:        `1px solid ${hover.node.lane === 'austrian' ? AUSTRIAN_COLOR : STATIST_COLOR}`,
              fontFamily:    "'Source Serif 4', Georgia, serif",
              fontSize:      13,
              lineHeight:    1.45,
              color:         'var(--text-primary)',
              pointerEvents: 'none',
              boxShadow:     '0 4px 16px rgba(0,0,0,0.08)',
            }}
          >
            <div style={{
              fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.14em',
              color: hover.node.lane === 'austrian' ? AUSTRIAN_COLOR : STATIST_COLOR,
              marginBottom: 4, fontWeight: 600,
            }}>
              {hover.node.year}{hover.node.person ? ` · ${hover.node.person.toUpperCase()}` : ''}
            </div>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>{hover.node.title}</div>
            <div style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{hover.node.significance}</div>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.16em', marginTop: 4 }}>
        <span style={{ color: STATIST_COLOR }}>▼ THE STATIST / KEYNESIAN COUNTER</span>
        <span style={{ color: 'var(--text-muted)' }}>{visible.filter((v) => v.lane === 'statist').length} EVENTS</span>
      </div>

      {/* Slider */}
      <div style={{ marginTop: 18 }}>
        <input
          type="range"
          min={MIN_YEAR}
          max={MAX_YEAR}
          value={maxYear}
          onChange={(e) => setMaxYear(Number(e.target.value))}
          style={{
            width:        '100%',
            accentColor:  'var(--accent-primary)',
            cursor:       'pointer',
          }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)', letterSpacing: '0.14em', marginTop: 4 }}>
          <span>{MIN_YEAR}</span>
          <button
            type="button"
            onClick={() => setMaxYear(MAX_YEAR)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.14em',
              color: 'var(--accent-primary)', textDecoration: 'underline',
            }}
          >
            REVEAL ALL ({MAX_YEAR})
          </button>
          <span>{MAX_YEAR}</span>
        </div>
      </div>
    </div>
  );
}
