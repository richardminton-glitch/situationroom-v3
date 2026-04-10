'use client';

/**
 * D3 world map showing:
 *   1. Country-level flare heat (fill intensity by flared gas volume)
 *   2. Point markers for Bitcoin mining operations (sized by capacity, coloured by energy source)
 *
 * Uses the same TopoJSON + Natural Earth projection as SituationMap.
 */

import { useRef, useEffect, useState } from 'react';
import { useTheme } from '@/components/layout/ThemeProvider';
import * as d3 from 'd3';
import * as topojson from 'topojson-client';

const WORLD_ATLAS_URL = '/geo/countries-110m.json';

// ISO alpha-2 → numeric lookup for flare countries
const ISO_A2_TO_NUMERIC: Record<string, number> = {
  RU: 643, IQ: 368, US: 840, IR: 364, DZ: 12, VE: 862, NG: 566,
  LY: 434, EG: 818, MX: 484, SA: 682, AO: 24, MY: 458, ID: 360,
  CN: 156, KZ: 398, OM: 512, AE: 784, CA: 124, BR: 76,
};

const ENERGY_SOURCE_COLORS: Record<string, string> = {
  'flared-gas': '#f59e0b',
  hydro: '#3b82f6',
  geothermal: '#ef4444',
  gas: '#8b5cf6',
};

interface FlareCountry {
  country: string;
  name: string;
  flaredBcm: number;
  pctGlobal: number;
  trend: string;
}

interface MiningProject {
  name: string;
  lat: number;
  lng: number;
  country: string;
  region: string;
  energySource: string;
  description: string;
  capacityMW: number | null;
  status: string;
}

interface Props {
  flareCountries: FlareCountry[];
  projects: MiningProject[];
}

export function StrandedEnergyMap({ flareCountries, projects }: Props) {
  const { theme } = useTheme();
  const isDark = theme !== 'parchment';
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const topoRef = useRef<unknown>(null);
  const [mapReady, setMapReady] = useState(false);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; content: string } | null>(null);

  // Load TopoJSON once
  useEffect(() => {
    let cancelled = false;
    d3.json(WORLD_ATLAS_URL).then((data) => {
      if (!cancelled) {
        topoRef.current = data;
        setMapReady(true);
      }
    });
    return () => { cancelled = true; };
  }, []);

  // Build flare lookup
  const flareIndex = useRef(new Map<number, FlareCountry>());
  useEffect(() => {
    const map = new Map<number, FlareCountry>();
    for (const fc of flareCountries) {
      const numeric = ISO_A2_TO_NUMERIC[fc.country];
      if (numeric) map.set(numeric, fc);
    }
    flareIndex.current = map;
  }, [flareCountries]);

  // Draw map
  useEffect(() => {
    if (!mapReady || !containerRef.current) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = Math.min(width * 0.5, 360);

    // Clear previous
    d3.select(container).select('svg').remove();

    const svg = d3.select(container)
      .append('svg')
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', `0 0 ${width} ${height}`)
      .style('display', 'block');

    svgRef.current = svg.node();

    const topo = topoRef.current as any;
    const geojson = topojson.feature(topo, topo.objects.countries) as unknown as GeoJSON.FeatureCollection;

    // Projection
    const projection = d3.geoNaturalEarth1()
      .fitSize([width - 16, height - 16], { type: 'Sphere' } as any)
      .translate([width / 2, height / 2]);

    const path = d3.geoPath().projection(projection);

    // Colours
    const bgColor = isDark ? '#0a0f14' : '#F8F1E3';
    const borderColor = isDark ? 'rgba(255,255,255,0.15)' : '#a89a85';
    const defaultFill = isDark ? '#151c24' : '#e8dfd0';
    const flareMinColor = isDark ? '#2a1e08' : '#f0e4c8';
    const flareMaxColor = isDark ? '#c06020' : '#c85a2d';

    // Flare colour scale
    const maxBcm = Math.max(...flareCountries.map(f => f.flaredBcm), 1);
    const flareScale = d3.scaleLinear<string>()
      .domain([0, maxBcm])
      .range([flareMinColor, flareMaxColor])
      .interpolate(d3.interpolateLab as any);

    // Ocean background
    svg.append('path')
      .datum({ type: 'Sphere' } as unknown as GeoJSON.GeoJsonObject)
      .attr('d', path as any)
      .attr('fill', bgColor)
      .attr('stroke', borderColor)
      .attr('stroke-width', 0.5);

    // Graticule
    const graticule = d3.geoGraticule().step([30, 30]);
    svg.append('path')
      .datum(graticule())
      .attr('d', path as any)
      .attr('fill', 'none')
      .attr('stroke', isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)')
      .attr('stroke-width', 0.3);

    // Countries
    svg.selectAll('.country')
      .data(geojson.features)
      .enter()
      .append('path')
      .attr('class', 'country')
      .attr('d', path as any)
      .attr('fill', (d: any) => {
        const id = parseInt(d.id || d.properties?.id);
        const fc = flareIndex.current.get(id);
        return fc ? flareScale(fc.flaredBcm) : defaultFill;
      })
      .attr('stroke', borderColor)
      .attr('stroke-width', 0.4)
      .on('mouseenter', function (_event: any, d: any) {
        const id = parseInt(d.id || d.properties?.id);
        const fc = flareIndex.current.get(id);
        if (fc) {
          d3.select(this).style('filter', 'brightness(1.2)');
        }
      })
      .on('mousemove', function (event: any, d: any) {
        const id = parseInt(d.id || d.properties?.id);
        const fc = flareIndex.current.get(id);
        if (fc && containerRef.current) {
          const rect = containerRef.current.getBoundingClientRect();
          setTooltip({
            x: event.clientX - rect.left + 12,
            y: event.clientY - rect.top - 10,
            content: `${fc.name}: ${fc.flaredBcm.toFixed(1)} bcm (${(fc.pctGlobal * 100).toFixed(1)}% global)`,
          });
        }
      })
      .on('mouseleave', function () {
        d3.select(this).style('filter', null);
        setTooltip(null);
      });

    // Border mesh
    svg.append('path')
      .datum(topojson.mesh(topo, topo.objects.countries, (a: any, b: any) => a !== b))
      .attr('fill', 'none')
      .attr('stroke', borderColor)
      .attr('stroke-width', 0.3)
      .attr('stroke-opacity', 0.5)
      .style('pointer-events', 'none');

    // ── Mining operation markers ──
    const markersLayer = svg.append('g').attr('class', 'markers');

    projects.forEach((project) => {
      const coords = projection([project.lng, project.lat]);
      if (!coords) return;

      const [x, y] = coords;
      const color = ENERGY_SOURCE_COLORS[project.energySource] || '#6b7280';
      const r = project.capacityMW
        ? Math.max(3, Math.min(10, Math.sqrt(project.capacityMW / 10) * 2.5))
        : 4;

      const g = markersLayer.append('g')
        .attr('transform', `translate(${x},${y})`)
        .style('cursor', 'pointer');

      // Pulse ring
      const pulse = g.append('circle')
        .attr('fill', 'none')
        .attr('stroke', color)
        .attr('stroke-width', 0.8)
        .attr('r', r)
        .attr('opacity', 0);

      pulse.append('animate')
        .attr('attributeName', 'r')
        .attr('from', String(r))
        .attr('to', String(r + 8))
        .attr('dur', '3s')
        .attr('repeatCount', 'indefinite');

      pulse.append('animate')
        .attr('attributeName', 'opacity')
        .attr('from', '0.5')
        .attr('to', '0')
        .attr('dur', '3s')
        .attr('repeatCount', 'indefinite');

      // Solid dot
      g.append('circle')
        .attr('r', r)
        .attr('fill', color)
        .attr('stroke', isDark ? '#0a0f14' : '#F8F1E3')
        .attr('stroke-width', 1)
        .attr('opacity', 0.9);

      // Hover
      g.on('mouseenter', function (event: any) {
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const cap = project.capacityMW ? ` · ${project.capacityMW} MW` : '';
        setTooltip({
          x: event.clientX - rect.left + 12,
          y: event.clientY - rect.top - 10,
          content: `${project.name}${cap}\n${project.region}`,
        });
      })
        .on('mousemove', function (event: any) {
          if (!containerRef.current) return;
          const rect = containerRef.current.getBoundingClientRect();
          setTooltip((prev) =>
            prev ? { ...prev, x: event.clientX - rect.left + 12, y: event.clientY - rect.top - 10 } : null,
          );
        })
        .on('mouseleave', function () {
          setTooltip(null);
        });
    });

    // Legend
    const legendY = height - 30;
    const legendItems = [
      { label: 'Flared Gas', color: ENERGY_SOURCE_COLORS['flared-gas'] },
      { label: 'Hydro', color: ENERGY_SOURCE_COLORS.hydro },
      { label: 'Geothermal', color: ENERGY_SOURCE_COLORS.geothermal },
      { label: 'Gas', color: ENERGY_SOURCE_COLORS.gas },
    ];
    const legendG = svg.append('g').attr('transform', `translate(8, ${legendY})`);
    let lx = 0;
    for (const item of legendItems) {
      legendG.append('circle').attr('cx', lx + 5).attr('cy', 5).attr('r', 4).attr('fill', item.color);
      const text = legendG.append('text')
        .attr('x', lx + 14)
        .attr('y', 9)
        .text(item.label)
        .attr('fill', isDark ? '#8aaba6' : '#5a4e3c')
        .attr('font-size', 9)
        .attr('font-family', "'IBM Plex Mono', monospace")
        .attr('letter-spacing', '0.04em');
      lx += 14 + (text.node()?.getComputedTextLength() ?? 50) + 14;
    }

  }, [mapReady, isDark, flareCountries, projects]);

  return (
    <div ref={containerRef} style={{ position: 'relative', marginBottom: 20, width: '100%' }}>
      {/* Tooltip */}
      {tooltip && (
        <div
          style={{
            position: 'absolute',
            left: tooltip.x,
            top: tooltip.y,
            background: isDark ? '#1a1a2e' : '#fff',
            border: '1px solid var(--border-subtle)',
            padding: '6px 10px',
            fontSize: 11,
            fontFamily: "'IBM Plex Mono', monospace",
            color: 'var(--text-primary)',
            pointerEvents: 'none',
            zIndex: 10,
            whiteSpace: 'pre-line',
            maxWidth: 240,
          }}
        >
          {tooltip.content}
        </div>
      )}
    </div>
  );
}
