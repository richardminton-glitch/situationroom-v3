'use client';

import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import * as d3 from 'd3';
import * as topojson from 'topojson-client';
import { COUNTRY_NAMES } from '@/components/panels/globes/country-names';
import { METRIC_BY_KEY, DEFAULT_METRIC } from './metrics';
import { buildColourScale, NO_DATA } from './colour-scales';
import { MetricSelector } from './MetricSelector';
import { ColourLegend } from './ColourLegend';
import { HoverTooltip } from './HoverTooltip';
import { CountryDetailPanel } from './CountryDetailPanel';
import { StatusBar } from './StatusBar';

const WORLD_ATLAS_URL = '/geo/countries-110m.json';

interface CountryRecord {
  isoNumeric: number;
  countryCode: string;
  countryName: string;
  [key: string]: unknown;
}

interface SituationMapProps {
  countries: CountryRecord[];
}

export function SituationMap({ countries }: SituationMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [activeMetric, setActiveMetric] = useState(DEFAULT_METRIC);
  const [selectedCountry, setSelectedCountry] = useState<CountryRecord | null>(null);
  const [hover, setHover] = useState<{ name: string; value: string | null; x: number; y: number } | null>(null);
  const topoRef = useRef<unknown>(null);
  const [mapReady, setMapReady] = useState(false);
  const renderVersion = useRef(0);
  // Ref so D3 event handlers always read the current metric (avoids stale closure)
  const activeMetricRef = useRef(activeMetric);

  // Keep ref in sync with state so D3 closures read the current metric
  useEffect(() => { activeMetricRef.current = activeMetric; }, [activeMetric]);

  // Index countries by ISO numeric for O(1) lookup
  const countryIndex = useMemo(() => {
    const map = new Map<number, CountryRecord>();
    for (const c of countries) map.set(c.isoNumeric, c);
    return map;
  }, [countries]);

  // Build colour scale for current metric
  const colourScale = useMemo(() => {
    const metric = METRIC_BY_KEY[activeMetric];
    if (!metric) return () => NO_DATA;
    const values = countries.map((c) => c[activeMetric] as number | null);
    return buildColourScale(metric, values);
  }, [activeMetric, countries]);

  // Load TopoJSON once — stored in ref (not state) to avoid re-renders
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

  // Build the base map (projection, paths, graticule) — only on topo load or resize
  const buildMap = useCallback(() => {
    if (!topoRef.current || !svgRef.current || !containerRef.current) return;

    const svg = d3.select(svgRef.current);
    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight - 28;

    svg.attr('viewBox', `0 0 ${width} ${height}`);
    svg.selectAll('*').remove();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const topo = topoRef.current as any;
    const geojson = topojson.feature(topo, topo.objects.countries) as unknown as GeoJSON.FeatureCollection;

    const projection = d3.geoNaturalEarth1()
      .fitSize([width - 20, height - 20], { type: 'Sphere' })
      .translate([width / 2, height / 2]);

    const path = d3.geoPath().projection(projection);

    // Ocean / sphere
    svg.append('path')
      .datum({ type: 'Sphere' } as unknown as GeoJSON.GeoJsonObject)
      .attr('d', path as unknown as string)
      .attr('fill', 'var(--bg-primary)')
      .attr('stroke', 'var(--border-primary)')
      .attr('stroke-width', 0.5);

    // Graticule
    const graticule = d3.geoGraticule().step([15, 15]);
    svg.append('path')
      .datum(graticule())
      .attr('d', path)
      .attr('fill', 'none')
      .attr('stroke', 'var(--border-subtle)')
      .attr('stroke-width', 0.35)
      .attr('opacity', 0.5);

    // Country paths — fill set to NO_DATA initially, coloured by separate effect
    svg.selectAll('.country')
      .data(geojson.features)
      .enter()
      .append('path')
      .attr('class', 'country')
      .attr('d', path)
      .attr('fill', NO_DATA)
      .attr('stroke', '#a89a85')
      .attr('stroke-width', 0.6)
      .style('cursor', 'pointer')
      .style('transition', 'fill 0.2s')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .on('mouseenter', function (_event: MouseEvent, d: any) {
        d3.select(this).style('filter', 'brightness(0.85)');
        const id = parseInt(d.id || d.properties?.id);
        const name = COUNTRY_NAMES[id];
        const record = countryIndex.get(id);
        const currentMetric = activeMetricRef.current;
        const metric = METRIC_BY_KEY[currentMetric];
        const val = record?.[currentMetric] as number | null;
        const formatted = val != null && metric ? metric.format(val) : null;

        if (name) {
          const rect = container.getBoundingClientRect();
          setHover({
            name,
            value: formatted,
            x: _event.clientX - rect.left,
            y: _event.clientY - rect.top,
          });
        }
      })
      .on('mousemove', function (_event: MouseEvent) {
        const rect = container.getBoundingClientRect();
        setHover((prev) => prev ? { ...prev, x: _event.clientX - rect.left, y: _event.clientY - rect.top } : null);
      })
      .on('mouseleave', function () {
        d3.select(this).style('filter', null);
        setHover(null);
      })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .on('click', function (_event: MouseEvent, d: any) {
        const id = parseInt(d.id || d.properties?.id);
        const record = countryIndex.get(id);
        if (record) {
          setSelectedCountry((prev) => prev?.countryCode === record.countryCode ? null : record);
        }
      });

    // Country borders (mesh)
    svg.append('path')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .datum(topojson.mesh(topo, topo.objects.countries, (a: any, b: any) => a !== b))
      .attr('fill', 'none')
      .attr('stroke', '#8a7d6b')
      .attr('stroke-width', 0.5)
      .attr('stroke-opacity', 0.7)
      .style('pointer-events', 'none');

    // Sphere vignette overlay
    svg.append('defs').html(`
      <radialGradient id="sphereVignette" cx="50%" cy="50%" r="50%">
        <stop offset="85%" stop-color="transparent"/>
        <stop offset="100%" stop-color="rgba(44,36,22,0.1)"/>
      </radialGradient>
    `);
    svg.append('path')
      .datum({ type: 'Sphere' } as unknown as GeoJSON.GeoJsonObject)
      .attr('d', path as unknown as string)
      .attr('fill', 'url(#sphereVignette)')
      .style('pointer-events', 'none');

    // Bump version so colour effect runs
    renderVersion.current += 1;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countryIndex]);

  // Initial render when topo loads
  useEffect(() => {
    if (mapReady) buildMap();
  }, [mapReady, buildMap]);

  // Colour update — lightweight, only updates fill attributes (no DOM rebuild)
  useEffect(() => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);

    svg.selectAll<SVGPathElement, GeoJSON.Feature>('.country')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .attr('fill', (d: any) => {
        const id = parseInt(d.id || d.properties?.id);
        const record = countryIndex.get(id);
        if (!record) return NO_DATA;
        const val = record[activeMetric] as number | null;
        return colourScale(val);
      });
  }, [activeMetric, countryIndex, colourScale]);

  // Resize handler — debounced, no state feedback loop
  useEffect(() => {
    if (!containerRef.current) return;
    let timer: ReturnType<typeof setTimeout>;
    const obs = new ResizeObserver(() => {
      clearTimeout(timer);
      timer = setTimeout(() => buildMap(), 150);
    });
    obs.observe(containerRef.current);
    return () => {
      obs.disconnect();
      clearTimeout(timer);
    };
  }, [buildMap]);

  // Cleanup D3 on unmount
  useEffect(() => {
    return () => {
      if (svgRef.current) {
        const svg = d3.select(svgRef.current);
        svg.selectAll('.country').on('.', null); // remove all D3 listeners
        svg.selectAll('*').remove();
      }
    };
  }, []);

  // Status bar helpers
  const metric = METRIC_BY_KEY[activeMetric];
  const lastUpdated = useMemo(() => {
    const dates = countries.map((c) => c.updatedAt as string).filter(Boolean);
    if (dates.length === 0) return null;
    const latest = new Date(Math.max(...dates.map((d) => new Date(d).getTime())));
    return latest.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
  }, [countries]);

  const handleMetricChange = useCallback((key: string) => {
    setActiveMetric(key);
  }, []);

  return (
    <div className="flex w-full h-full" style={{ background: 'var(--bg-primary)' }}>
      {/* Map area */}
      <div
        ref={containerRef}
        className="relative flex-1 h-full"
        style={{ overflow: 'hidden' }}
      >
        <svg
          ref={svgRef}
          style={{ width: '100%', height: 'calc(100% - 28px)', display: 'block' }}
          preserveAspectRatio="xMidYMid meet"
        />

        <MetricSelector activeKey={activeMetric} onChange={handleMetricChange} />
        <ColourLegend metric={metric} panelOpen={false} />

        {hover && (
          <HoverTooltip
            name={hover.name}
            value={hover.value}
            metricLabel={metric?.label ?? activeMetric}
            x={hover.x}
            y={hover.y}
          />
        )}

        <StatusBar
          countryCount={countries.length}
          metricLabel={metric?.label ?? activeMetric}
          hoverName={hover?.name ?? null}
          hoverValue={hover?.value ?? null}
          lastUpdated={lastUpdated}
        />
      </div>

      {/* Permanent right sidebar */}
      <div
        style={{
          width: 330,
          minWidth: 330,
          background: 'var(--bg-card)',
          borderLeft: '1px solid var(--border-primary)',
          boxShadow: '-2px 0 12px rgba(0,0,0,0.06)',
        }}
      >
        <CountryDetailPanel
          country={selectedCountry}
          activeMetric={activeMetric}
        />
      </div>
    </div>
  );
}
