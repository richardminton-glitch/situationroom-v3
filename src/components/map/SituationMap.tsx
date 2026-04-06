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
  const [topoData, setTopoData] = useState<unknown>(null);

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

  // Load TopoJSON once
  useEffect(() => {
    d3.json(WORLD_ATLAS_URL).then(setTopoData);
  }, []);

  // Render / re-render map when topo, metric, or container changes
  useEffect(() => {
    if (!topoData || !svgRef.current || !containerRef.current) return;

    const svg = d3.select(svgRef.current);
    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight - 28; // subtract status bar

    svg.attr('viewBox', `0 0 ${width} ${height}`);
    svg.selectAll('*').remove();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const topo = topoData as any;
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

    // Country paths
    svg.selectAll('.country')
      .data(geojson.features)
      .enter()
      .append('path')
      .attr('class', 'country')
      .attr('d', path)
      .attr('stroke', '#a89a85')
      .attr('stroke-width', 0.6)
      .style('cursor', 'pointer')
      .style('transition', 'fill 0.2s')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .attr('fill', (d: any) => {
        const id = parseInt(d.id || d.properties?.id);
        const record = countryIndex.get(id);
        if (!record) return NO_DATA;
        const val = record[activeMetric] as number | null;
        return colourScale(val);
      })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .on('mouseenter', function (_event: MouseEvent, d: any) {
        d3.select(this).style('filter', 'brightness(0.85)');
        const id = parseInt(d.id || d.properties?.id);
        const name = COUNTRY_NAMES[id];
        const record = countryIndex.get(id);
        const metric = METRIC_BY_KEY[activeMetric];
        const val = record?.[activeMetric] as number | null;
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
        if (record) setSelectedCountry(record);
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

  }, [topoData, activeMetric, countryIndex, colourScale]);

  // Resize handler
  useEffect(() => {
    if (!containerRef.current) return;
    const obs = new ResizeObserver(() => {
      // Force re-render by updating topoData ref identity
      if (topoData) setTopoData({ ...topoData as object });
    });
    obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, [topoData]);

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
    <div
      ref={containerRef}
      className="relative w-full h-full"
      style={{ background: 'var(--bg-primary)', overflow: 'hidden' }}
    >
      <svg
        ref={svgRef}
        style={{ width: '100%', height: 'calc(100% - 28px)', display: 'block' }}
        preserveAspectRatio="xMidYMid meet"
      />

      <MetricSelector activeKey={activeMetric} onChange={handleMetricChange} />
      <ColourLegend metric={metric} panelOpen={!!selectedCountry} />

      {hover && (
        <HoverTooltip
          name={hover.name}
          value={hover.value}
          metricLabel={metric?.label ?? activeMetric}
          x={hover.x}
          y={hover.y}
        />
      )}

      {selectedCountry && (
        <CountryDetailPanel
          country={selectedCountry}
          activeMetric={activeMetric}
          onClose={() => setSelectedCountry(null)}
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
  );
}
