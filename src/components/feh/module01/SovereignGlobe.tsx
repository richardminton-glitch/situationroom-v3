'use client';

/**
 * SovereignGlobe — D3 orthographic globe with country polygons coloured by
 * runway score. Dynamic-imports world-atlas TopoJSON on mount so the bundle
 * stays lean.
 *
 * Interactions:
 *   - Idle autorotation at 0.3°/s, paused while user drags or hovers
 *   - Click-drag to manually rotate (longitude + clamped latitude)
 *   - Hover country → 1px alert-red stroke + tooltip with name + runway
 *   - Click country → onSelect callback (parent locks selection in dossier)
 *   - Selecting via leaderboard fly-to: parent updates `selectedIso3`, globe
 *     animates rotation to that country's centroid
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import * as d3 from 'd3';
import type { Feature, FeatureCollection, Geometry } from 'geojson';
import * as topojson from 'topojson-client';
import type { Topology } from 'topojson-specification';
import type { SovereignProjected } from '@/lib/feh/types';
import { fillForRunway } from '@/lib/feh/colors';

interface SovereignGlobeProps {
  sovereigns: SovereignProjected[];
  selectedIso3: string;
  onSelect: (iso3: string) => void;
}

interface CountryFeature extends Feature<Geometry, { name?: string }> {
  id: string | number;
}

const ROTATION_SPEED_DEG_PER_SEC = 0.3;
const LAT_MIN = -60;
const LAT_MAX = 60;

export function SovereignGlobe({ sovereigns, selectedIso3, onSelect }: SovereignGlobeProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [features, setFeatures] = useState<CountryFeature[] | null>(null);
  const [size, setSize] = useState({ w: 480, h: 480 });
  const [rotation, setRotation] = useState<[number, number, number]>([20, -10, 0]);
  const [hoverIso3, setHoverIso3] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; iso3: string } | null>(null);

  const draggingRef = useRef(false);
  const lastPointer = useRef<{ x: number; y: number } | null>(null);
  const animFlyRef = useRef<{ from: [number, number, number]; to: [number, number, number]; start: number; durMs: number } | null>(null);

  // ── Lookup tables for fast colouring ──
  const sovByIsoNum = useMemo(() => {
    const m = new Map<string, SovereignProjected>();
    for (const s of sovereigns) m.set(String(s.isoNumeric), s);
    return m;
  }, [sovereigns]);

  const sovByIso3 = useMemo(() => {
    const m = new Map<string, SovereignProjected>();
    for (const s of sovereigns) m.set(s.iso3, s);
    return m;
  }, [sovereigns]);

  // ── Load topojson on mount ──
  useEffect(() => {
    let cancelled = false;
    import('world-atlas/countries-110m.json')
      .then((mod) => {
        if (cancelled) return;
        const topo = (mod as { default: Topology }).default;
        const countries = topojson.feature(topo, topo.objects.countries) as unknown as FeatureCollection;
        setFeatures(countries.features as CountryFeature[]);
      })
      .catch((err) => {
        // eslint-disable-next-line no-console
        console.error('[FEH] failed to load world-atlas topojson', err);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // ── Resize observer ──
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const r = entries[0]?.contentRect;
      if (!r) return;
      const dim = Math.max(280, Math.min(640, Math.min(r.width, r.height || r.width)));
      setSize({ w: dim, h: dim });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // ── Idle autorotation + fly-to animation ──
  useEffect(() => {
    let raf = 0;
    let lastTs = performance.now();
    const tick = (ts: number) => {
      const dt = (ts - lastTs) / 1000;
      lastTs = ts;

      // Fly-to animation takes priority
      if (animFlyRef.current) {
        const a = animFlyRef.current;
        const elapsed = ts - a.start;
        const t = Math.min(1, elapsed / a.durMs);
        const e = easeInOutCubic(t);
        const lon = a.from[0] + shortestDelta(a.from[0], a.to[0]) * e;
        const lat = a.from[1] + (a.to[1] - a.from[1]) * e;
        setRotation([lon, lat, 0]);
        if (t >= 1) animFlyRef.current = null;
      } else if (!draggingRef.current && !hoverIso3) {
        setRotation((r) => [r[0] + ROTATION_SPEED_DEG_PER_SEC * dt, r[1], 0]);
      }

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [hoverIso3]);

  // ── Drag handlers ──
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    // We deliberately do NOT call setPointerCapture here — capturing the
    // pointer on the SVG redirects subsequent pointer events away from
    // child <path> elements, which suppresses the synthetic click event
    // on the country the user actually pressed. Window-level
    // pointermove + pointerup listeners give us the same drag behaviour
    // without breaking clicks.
    const onDown = (e: PointerEvent) => {
      lastPointer.current = { x: e.clientX, y: e.clientY };
    };
    const onMove = (e: PointerEvent) => {
      if (!lastPointer.current) return;
      const dx = e.clientX - lastPointer.current.x;
      const dy = e.clientY - lastPointer.current.y;
      // Promote to drag only once cumulative movement exceeds a small
      // threshold — keeps a click-with-tiny-jitter from rotating the
      // globe and from being misclassified as a drag.
      if (!draggingRef.current && Math.hypot(dx, dy) < 4) return;
      draggingRef.current = true;
      lastPointer.current = { x: e.clientX, y: e.clientY };
      setRotation(([lon, lat]) => [lon + dx * 0.4, clamp(lat - dy * 0.4, LAT_MIN, LAT_MAX), 0]);
    };
    const onUp = () => {
      draggingRef.current = false;
      lastPointer.current = null;
    };

    svg.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      svg.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, []);

  // ── Fly-to selected sovereign when it changes externally ──
  useEffect(() => {
    if (!selectedIso3 || !features) return;
    const sov = sovByIso3.get(selectedIso3);
    if (!sov) return;
    const f = features.find((x) => String(x.id) === String(sov.isoNumeric));
    if (!f) return;
    const c = d3.geoCentroid(f);
    if (!isFinite(c[0]) || !isFinite(c[1])) return;
    animFlyRef.current = {
      from: rotation,
      to: [-c[0], -c[1], 0],
      start: performance.now(),
      durMs: 700,
    };
    // Intentionally exclude `rotation` from deps — re-running on every rotation tick
    // would cancel the autorotation; we only want to animate on a NEW iso3.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedIso3, features, sovByIso3]);

  // ── Build projection + path ──
  const { projection, path } = useMemo(() => {
    const proj = d3.geoOrthographic()
      .scale(size.w / 2.05)
      .translate([size.w / 2, size.h / 2])
      .rotate(rotation)
      .clipAngle(90);
    const p = d3.geoPath(proj);
    return { projection: proj, path: p };
  }, [size, rotation]);

  const graticule = useMemo(() => d3.geoGraticule().step([15, 15])(), []);

  const onCountryEnter = (iso3: string | null, e: React.MouseEvent) => {
    if (!iso3) return;
    setHoverIso3(iso3);
    const rect = containerRef.current?.getBoundingClientRect();
    if (rect) setTooltip({ x: e.clientX - rect.left, y: e.clientY - rect.top, iso3 });
  };
  const onCountryMove = (e: React.MouseEvent) => {
    if (!hoverIso3) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (rect) setTooltip({ x: e.clientX - rect.left, y: e.clientY - rect.top, iso3: hoverIso3 });
  };
  const onCountryLeave = () => {
    setHoverIso3(null);
    setTooltip(null);
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full select-none"
      style={{ minHeight: 320 }}
    >
      <svg
        ref={svgRef}
        viewBox={`0 0 ${size.w} ${size.h}`}
        width={size.w}
        height={size.h}
        style={{ display: 'block', cursor: draggingRef.current ? 'grabbing' : 'grab' }}
      >
        {/* Sphere fill — represents the ocean / void */}
        <circle
          cx={size.w / 2}
          cy={size.h / 2}
          r={size.w / 2.05}
          style={{ fill: 'var(--bg-secondary)', stroke: 'var(--border-primary)', strokeWidth: 1 }}
        />
        {/* Graticule */}
        <path d={path(graticule) ?? ''} style={{ fill: 'none', stroke: 'var(--border-subtle)', strokeWidth: 0.5, opacity: 0.6 }} />

        {/* Countries */}
        {features?.map((f, i) => {
          const idStr = f.id != null ? String(f.id) : '';
          const sov = idStr ? sovByIsoNum.get(idStr) : undefined;
          const iso3 = sov?.iso3 ?? null;
          const isSelected = iso3 === selectedIso3;
          const isHovered = iso3 === hoverIso3;
          const fill = sov ? fillForRunway(sov.runway.years) : 'color-mix(in srgb, var(--text-muted) 18%, transparent)';
          return (
            <path
              key={`${idStr}-${i}`}
              d={path(f) ?? ''}
              style={{
                fill,
                stroke: isSelected ? 'var(--feh-critical)' : isHovered ? 'var(--feh-critical)' : 'var(--border-primary)',
                strokeWidth: isSelected ? 1.5 : isHovered ? 1 : 0.4,
                cursor: sov ? 'pointer' : 'default',
                transition: 'stroke-width 120ms ease',
              }}
              onMouseEnter={(e) => onCountryEnter(iso3, e)}
              onMouseMove={onCountryMove}
              onMouseLeave={onCountryLeave}
              onClick={() => sov && onSelect(sov.iso3)}
            />
          );
        })}
      </svg>

      {/* Tooltip */}
      {tooltip && (() => {
        const sov = sovByIso3.get(tooltip.iso3);
        if (!sov) return null;
        const runway =
          sov.runway.years === 0 ? 'NOW' : sov.runway.years >= 100 ? '100Y+' : `${sov.runway.years}Y`;
        return (
          <div
            className="absolute pointer-events-none border px-2 py-1 z-10"
            style={{
              left: Math.min(tooltip.x + 12, size.w - 180),
              top: Math.min(tooltip.y + 12, size.h - 60),
              backgroundColor: 'var(--bg-card)',
              borderColor: 'var(--feh-critical)',
              fontFamily: 'var(--feh-font-mono)',
              fontSize: 10,
              letterSpacing: '0.08em',
              color: 'var(--text-primary)',
              whiteSpace: 'nowrap',
            }}
          >
            <div style={{ fontWeight: 700 }}>{sov.name.toUpperCase()}</div>
            <div style={{ color: 'var(--text-muted)' }}>
              RUNWAY {runway} · DEBT/GDP {sov.debtGdp.toFixed(0)}%
            </div>
          </div>
        );
      })()}

      {/* Legend */}
      <div
        className="absolute left-2 bottom-2 flex items-center gap-3 px-2 py-1 border"
        style={{
          backgroundColor: 'var(--bg-card)',
          borderColor: 'var(--border-subtle)',
          fontFamily: 'var(--feh-font-mono)',
          fontSize: 9,
          letterSpacing: '0.16em',
          color: 'var(--text-muted)',
        }}
      >
        <LegendDot color="var(--feh-critical)" label="< 5Y" />
        <LegendDot color="var(--feh-warning)" label="5-15Y" />
        <LegendDot color="var(--feh-stable)" label="15-50Y" />
        <LegendDot color="var(--text-muted)" label="50Y+" />
      </div>
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span style={{ width: 8, height: 8, backgroundColor: color, display: 'inline-block' }} />
      {label}
    </span>
  );
}

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}
function easeInOutCubic(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}
function shortestDelta(from: number, to: number) {
  let d = ((to - from) % 360 + 540) % 360 - 180;
  return d;
}
