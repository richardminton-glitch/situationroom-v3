'use client';

import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { chartColors } from '../shared';

interface ChartPoint {
  time: number;
  value: number;
}

interface RefLine {
  value: number;
  label: string;
}

interface ParchmentChartProps {
  data: ChartPoint[];
  title: string;
  color: string;
  theme?: string;
  yFormat?: (v: number) => string;
  refLines?: RefLine[];
}

const MARGIN = { top: 8, right: 42, bottom: 22, left: 4 };

export function ParchmentChart({ data, title, color, theme, yFormat, refLines }: ParchmentChartProps) {
  const isDark = theme === 'dark';
  const shared = chartColors(isDark);
  const C = {
    ...shared,
    refLine:   isDark ? 'rgba(208,96,80,0.5)' : 'rgba(139,32,32,0.4)',
    refLabel:  shared.axisTick,
    dotStroke: isDark ? '#0d1f2d'             : '#f8f1e3',
    title:     isDark ? '#00d4c8'             : '#3e2c1a',
  };
  const containerRef = useRef<HTMLDivElement>(null);
  const [resizeKey, setResizeKey] = useState(0);

  // Re-render chart on container resize
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let debounce: ReturnType<typeof setTimeout>;
    const ro = new ResizeObserver(() => {
      clearTimeout(debounce);
      debounce = setTimeout(() => setResizeKey((k) => k + 1), 200);
    });
    ro.observe(container);
    return () => { ro.disconnect(); clearTimeout(debounce); };
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || data.length === 0) return;

    // Read font CSS variables from the document root at render time
    // so axis labels switch correctly between parchment and dark themes.
    const rootStyle = getComputedStyle(document.documentElement);
    const fontData = rootStyle.getPropertyValue('--font-data').trim() || 'Georgia, serif';
    const fontMono = rootStyle.getPropertyValue('--font-mono').trim() || "'IBM Plex Mono', monospace";

    // Wait for layout to complete before measuring
    const rafId = requestAnimationFrame(() => {
    // Clear previous
    d3.select(container).select('svg').remove();

    const w = container.clientWidth || 400;
    const h = container.clientHeight || 160;
    const innerW = w - MARGIN.left - MARGIN.right;
    const innerH = h - MARGIN.top - MARGIN.bottom;

    const svg = d3.select(container)
      .append('svg')
      .attr('width', w)
      .attr('height', h)
      .style('overflow', 'visible');

    const g = svg.append('g').attr('transform', `translate(${MARGIN.left},${MARGIN.top})`);

    // Scales
    const xScale = d3.scaleTime()
      .domain(d3.extent(data, (d) => d.time) as [number, number])
      .range([0, innerW]);

    const yExtent = d3.extent(data, (d) => d.value) as [number, number];
    const yPad = (yExtent[1] - yExtent[0]) * 0.08;
    const yScale = d3.scaleLinear()
      .domain([yExtent[0] - yPad, yExtent[1] + yPad])
      .range([innerH, 0]);

    // Grid lines
    const yTicks = yScale.ticks(4);
    g.selectAll('.grid-line')
      .data(yTicks)
      .enter()
      .append('line')
      .attr('x1', 0).attr('x2', innerW)
      .attr('y1', (d) => yScale(d)).attr('y2', (d) => yScale(d))
      .attr('stroke', C.gridLine)
      .attr('stroke-dasharray', '2,3');

    // Reference lines
    if (refLines) {
      for (const ref of refLines) {
        if (ref.value >= yExtent[0] && ref.value <= yExtent[1]) {
          g.append('line')
            .attr('x1', 0).attr('x2', innerW)
            .attr('y1', yScale(ref.value)).attr('y2', yScale(ref.value))
            .attr('stroke', C.refLine)
            .attr('stroke-dasharray', '4,3');
          g.append('text')
            .attr('x', innerW + 2).attr('y', yScale(ref.value) + 3)
            .attr('fill', C.refLabel)
            .attr('font-size', '7px')
            .attr('font-family', fontData)
            .text(ref.label);
        }
      }
    }

    // Area
    const area = d3.area<ChartPoint>()
      .x((d) => xScale(d.time))
      .y0(innerH)
      .y1((d) => yScale(d.value))
      .curve(d3.curveMonotoneX);

    g.append('path')
      .datum(data)
      .attr('d', area)
      .attr('fill', color)
      .attr('opacity', 0.08);

    // Line
    const line = d3.line<ChartPoint>()
      .x((d) => xScale(d.time))
      .y((d) => yScale(d.value))
      .curve(d3.curveMonotoneX);

    g.append('path')
      .datum(data)
      .attr('d', line)
      .attr('fill', 'none')
      .attr('stroke', color)
      .attr('stroke-width', 1.5);

    // X-axis
    g.append('g')
      .attr('transform', `translate(0,${innerH})`)
      .call(
        d3.axisBottom(xScale)
          .ticks(5)
          .tickSize(0)
          .tickFormat((d) => d3.timeFormat('%d %b')(d as Date))
      )
      .call((g) => g.select('.domain').remove())
      .selectAll('text')
      .attr('fill', C.axisTick)
      .attr('font-size', '8px')
      .attr('font-family', fontData);

    // Y-axis (right side)
    const fmt = yFormat || ((v: number) => v >= 1000 ? `${(v / 1000).toFixed(1)}K` : v.toFixed(2));
    g.append('g')
      .attr('transform', `translate(${innerW},0)`)
      .call(
        d3.axisRight(yScale)
          .ticks(4)
          .tickSize(0)
          .tickFormat((d) => fmt(d as number))
      )
      .call((g) => g.select('.domain').remove())
      .selectAll('text')
      .attr('fill', C.axisTick)
      .attr('font-size', '8px')
      .attr('font-family', fontMono);

    // Crosshair + tooltip
    const crosshairLine = g.append('line')
      .attr('stroke', C.crosshair)
      .attr('stroke-dasharray', '3,3')
      .style('display', 'none');

    const crosshairDot = g.append('circle')
      .attr('r', 3)
      .attr('fill', color)
      .attr('stroke', C.dotStroke)
      .attr('stroke-width', 1.5)
      .style('display', 'none');

    const tooltipG = g.append('g').style('display', 'none');
    const tooltipRect = tooltipG.append('rect')
      .attr('fill', C.tooltipBg)
      .attr('stroke', C.tooltipBorder)
      .attr('stroke-width', 0.5)
      .attr('rx', 2);
    const tooltipText = tooltipG.append('text')
      .attr('fill', C.tooltipText)
      .attr('font-size', '10px')
      .attr('font-family', fontMono);

    const bisector = d3.bisector<ChartPoint, number>((d) => d.time).left;

    svg.on('mousemove', function (event) {
      const [mx] = d3.pointer(event, g.node());
      if (mx < 0 || mx > innerW) {
        crosshairLine.style('display', 'none');
        crosshairDot.style('display', 'none');
        tooltipG.style('display', 'none');
        return;
      }

      const x0 = xScale.invert(mx).getTime();
      const i = bisector(data, x0, 1);
      const d0 = data[i - 1];
      const d1 = data[i];
      const d = d0 && d1 ? (x0 - d0.time > d1.time - x0 ? d1 : d0) : d0 || d1;
      if (!d) return;

      const cx = xScale(d.time);
      const cy = yScale(d.value);

      crosshairLine.attr('x1', cx).attr('y1', 0).attr('x2', cx).attr('y2', innerH).style('display', '');
      crosshairDot.attr('cx', cx).attr('cy', cy).style('display', '');

      const label = `${fmt(d.value)}  ${d3.timeFormat('%d %b %H:%M')(new Date(d.time))}`;
      tooltipText.text(label);
      const bbox = (tooltipText.node() as SVGTextElement).getBBox();
      const tx = cx > innerW - 120 ? cx - bbox.width - 12 : cx + 8;
      tooltipRect.attr('x', tx - 3).attr('y', cy - bbox.height - 4).attr('width', bbox.width + 6).attr('height', bbox.height + 4);
      tooltipText.attr('x', tx).attr('y', cy - 4);
      tooltipG.style('display', '');
    });

    svg.on('mouseleave', function () {
      crosshairLine.style('display', 'none');
      crosshairDot.style('display', 'none');
      tooltipG.style('display', 'none');
    });

    }); // end requestAnimationFrame

    return () => {
      cancelAnimationFrame(rafId);
      d3.select(container).select('svg').remove();
    };
  }, [data, title, color, theme, yFormat, refLines, resizeKey]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: '120px' }}>
      <div
        style={{
          fontFamily: 'var(--font-heading)',
          fontSize: '9px',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: C.title,
          marginBottom: '4px',
        }}
      >
        {title}
      </div>
      <div ref={containerRef} style={{ width: '100%', height: 'calc(100% - 20px)' }} />
    </div>
  );
}
