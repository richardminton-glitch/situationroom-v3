'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import * as d3 from 'd3';
import { useTheme } from '@/components/layout/ThemeProvider';
import { PanelLoading, chartColors } from './shared';

interface DataPoint { time: number; value: number; }
type InflationData = Record<string, DataPoint[]>;

const KEYS = ['USA', 'UK', 'Germany', 'Japan'] as const;

const PARCHMENT_COLORS: Record<string, string> = {
  USA:     '#3e2c1a',
  UK:      '#b87333',
  Germany: '#4a6741',
  Japan:   '#6b4c8a',
};

const DARK_COLORS: Record<string, string> = {
  USA:     '#00d4c8',
  UK:      '#c4885a',
  Germany: '#5bbfb8',
  Japan:   '#a08aab',
};

const LABELS: Record<string, string> = {
  USA: 'USA', UK: 'UK', Germany: 'DE', Japan: 'JP',
};

const MARGIN = { top: 28, right: 52, bottom: 26, left: 4 }; // G7 only

function fmtPct(v: number): string {
  if (v >= 100) return `${v.toFixed(0)}%`;
  return `${v.toFixed(1)}%`;
}

export function InflationChartPanel() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const colors = isDark ? DARK_COLORS : PARCHMENT_COLORS;

  const [data, setData] = useState<InflationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [resizeKey, setResizeKey] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/data/inflation');
        if (res.ok) setData(await res.json());
      } catch { /* non-critical */ }
      finally { setLoading(false); }
    }
    load();
  }, []);

  // Resize observer — debounced to avoid thrashing on drag
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setResizeKey((k) => k + 1));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const render = useCallback(() => {
    const el = containerRef.current;
    if (!el || !data) return;

    // Read font CSS variables at render time so axes switch with the theme.
    const rootStyle = getComputedStyle(document.documentElement);
    const fontData = rootStyle.getPropertyValue('--font-data').trim() || 'Georgia, serif';
    const fontMono = rootStyle.getPropertyValue('--font-mono').trim() || "'IBM Plex Mono', monospace";

    d3.select(el).select('svg').remove();
    el.querySelectorAll('.inflation-tooltip').forEach((n) => n.remove());

    const rect = el.getBoundingClientRect();
    const w = rect.width || 660;
    const h = rect.height || 300;
    const innerW = w - MARGIN.left - MARGIN.right;
    const innerH = h - MARGIN.top - MARGIN.bottom;
    if (innerW < 50 || innerH < 30) return;

    const activeSeries = KEYS
      .map((key) => ({ key, points: (data[key] ?? []).filter((d) => d.value != null) }))
      .filter((s) => s.points.length > 0);

    const allPoints = activeSeries.flatMap((s) => s.points);
    if (allPoints.length === 0) return;

    const xExtent = d3.extent(allPoints, (d) => d.time) as [number, number];
    const xScale = d3.scaleTime().domain(xExtent).range([0, innerW]);

    const rawMin = d3.min(allPoints, (d) => d.value) ?? 0;
    const rawMax = d3.max(allPoints, (d) => d.value) ?? 10;
    const yFloor = Math.min(0, rawMin - 0.5);
    const yCeil  = rawMax * 1.1;
    const yScale = d3.scaleLinear().domain([yFloor, yCeil]).range([innerH, 0]);

    const { axisTick: tickColor, gridLine: gridColor } = chartColors(isDark);

    const svg = d3.select(el)
      .append('svg')
      .attr('width', '100%')
      .attr('height', '100%')
      .attr('viewBox', `0 0 ${w} ${h}`)
      .style('overflow', 'visible');

    const g = svg.append('g').attr('transform', `translate(${MARGIN.left},${MARGIN.top})`);

    // Grid lines
    g.selectAll('.gl')
      .data(yScale.ticks(5))
      .enter().append('line')
      .attr('x1', 0).attr('x2', innerW)
      .attr('y1', (d) => yScale(d)).attr('y2', (d) => yScale(d))
      .attr('stroke', gridColor)
      .attr('stroke-dasharray', '2,3');

    // Zero baseline (Japan goes slightly negative)
    if (yFloor < 0) {
      g.append('line')
        .attr('x1', 0).attr('x2', innerW)
        .attr('y1', yScale(0)).attr('y2', yScale(0))
        .attr('stroke', isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.25)')
        .attr('stroke-width', 0.5);
    }

    const lineGen = d3.line<DataPoint>()
      .x((d) => xScale(d.time))
      .y((d) => yScale(d.value))
      .curve(d3.curveMonotoneX);

    const areaGen = d3.area<DataPoint>()
      .x((d) => xScale(d.time))
      .y0(innerH)
      .y1((d) => yScale(d.value))
      .curve(d3.curveMonotoneX);

    activeSeries.forEach(({ key, points }) => {
      const color = colors[key] || '#888';
      g.append('path').datum(points).attr('d', areaGen)
        .attr('fill', color).attr('opacity', 0.06);
      g.append('path').datum(points).attr('d', lineGen)
        .attr('fill', 'none').attr('stroke', color).attr('stroke-width', 1.8);
    });

    // Legend
    activeSeries.forEach(({ key }, i) => {
      const color = colors[key] || '#888';
      const lx = i * (innerW / activeSeries.length);
      const lg = g.append('g').attr('transform', `translate(${lx + 4}, -10)`);
      lg.append('line').attr('x1', 0).attr('x2', 14).attr('y1', 0).attr('y2', 0)
        .attr('stroke', color).attr('stroke-width', 2);
      lg.append('text').attr('x', 18).attr('y', 3)
        .attr('fill', tickColor).attr('font-size', '11px')
        .attr('font-family', fontData)
        .text(LABELS[key] ?? key);
    });

    // X-axis
    const xTicks = Math.max(3, Math.floor(innerW / 80));
    g.append('g')
      .attr('transform', `translate(0,${innerH})`)
      .call(d3.axisBottom(xScale).ticks(xTicks).tickSize(0)
        .tickFormat((d) => d3.timeFormat('%b %y')(d as Date)))
      .call((ax) => ax.select('.domain').remove())
      .selectAll('text')
      .attr('fill', tickColor).attr('font-size', '11px')
      .attr('font-family', fontData);

    // Y-axis (right)
    const yTicks = Math.max(3, Math.floor(innerH / 40));
    g.append('g')
      .attr('transform', `translate(${innerW},0)`)
      .call(d3.axisRight(yScale).ticks(yTicks).tickSize(0)
        .tickFormat((d) => fmtPct(+d)))
      .call((ax) => ax.select('.domain').remove())
      .selectAll('text')
      .attr('fill', tickColor).attr('font-size', '11px')
      .attr('font-family', fontMono);

    // Crosshair
    const crosshair = g.append('line')
      .attr('y1', 0).attr('y2', innerH)
      .attr('stroke', isDark ? 'rgba(0,212,200,0.3)' : 'rgba(0,0,0,0.2)')
      .attr('stroke-dasharray', '3,3')
      .style('display', 'none');

    // HTML tooltip
    const tooltip = document.createElement('div');
    tooltip.className = 'inflation-tooltip';
    tooltip.style.cssText = [
      'display:none', 'position:absolute', 'pointer-events:none', 'z-index:30',
      `background:${isDark ? 'rgba(21,29,37,0.97)' : 'rgba(248,241,227,0.97)'}`,
      `border:1px solid ${isDark ? '#1a3a3a' : '#c4b08a'}`,
      `color:${isDark ? '#c8e6e3' : '#3e2c1a'}`,
      'padding:5px 8px', 'border-radius:2px', 'font-size:10px', 'line-height:1.7',
      "font-family:'IBM Plex Mono',monospace",
    ].join(';');
    el.appendChild(tooltip);

    const bisect = d3.bisector<DataPoint, number>((d) => d.time).left;

    svg.on('mousemove', function (event) {
      const [mx] = d3.pointer(event, g.node());
      if (mx < 0 || mx > innerW) {
        crosshair.style('display', 'none');
        tooltip.style.display = 'none';
        return;
      }
      const x0 = (xScale.invert(mx) as Date).getTime();
      crosshair.attr('x1', mx).attr('x2', mx).style('display', '');

      const vals = activeSeries.map(({ key, points }) => {
        const i = bisect(points, x0, 1);
        const d0 = points[i - 1], d1 = points[i];
        const d = d0 && d1 ? (x0 - d0.time > d1.time - x0 ? d1 : d0) : (d0 ?? d1);
        return { key, point: d };
      }).filter((v) => v.point);

      if (!vals.length) return;

      const dateStr = d3.timeFormat('%b %Y')(new Date(vals[0].point.time));
      tooltip.innerHTML = [
        `<span style="font-family:Georgia,serif;font-size:9px;opacity:0.7">${dateStr}</span>`,
        ...vals.map(({ key, point }) =>
          `<span style="color:${colors[key] || '#888'}">${LABELS[key] ?? key}</span>` +
          `<span style="opacity:0.6"> : </span>` +
          `<span style="font-weight:600">${fmtPct(point.value)}</span>`
        ),
      ].join('<br>');

      const rect = el.getBoundingClientRect();
      const svgRect = (svg.node() as SVGSVGElement).getBoundingClientRect();
      const absX = event.clientX - rect.left;
      const absY = svgRect.top - rect.top + MARGIN.top + 10;
      tooltip.style.display = 'block';
      const tw = tooltip.offsetWidth || 120;
      tooltip.style.left = (absX + 12 + tw > el.clientWidth ? absX - tw - 12 : absX + 12) + 'px';
      tooltip.style.top = absY + 'px';
    });

    svg.on('mouseleave', () => {
      crosshair.style('display', 'none');
      tooltip.style.display = 'none';
    });
  }, [data, colors, isDark]);

  useEffect(() => {
    const rafId = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(rafId);
      if (containerRef.current) {
        d3.select(containerRef.current).select('svg').remove();
        containerRef.current.querySelectorAll('.inflation-tooltip').forEach((n) => n.remove());
      }
    };
  }, [render, resizeKey]);

  if (loading) return <PanelLoading />;

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', position: 'relative' }} />
  );
}
