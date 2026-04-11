'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import * as d3 from 'd3';
import { useTheme } from '@/components/layout/ThemeProvider';

const MONO = "'JetBrains Mono', 'IBM Plex Mono', 'SF Mono', monospace";

interface Props {
  data: { date: string; hashrate: number; ma30: number; ma60: number }[];
  signal: 'bullish' | 'bearish' | 'neutral';
  currentHashrate: number;
  theme: string;
}

function getRibbonColour(signal: Props['signal']): string {
  if (signal === 'bullish') return '#22c55e';
  if (signal === 'bearish') return '#ef4444';
  return '#a8a29e';
}

function getSignalLabel(signal: Props['signal']): string {
  if (signal === 'bullish') return 'RECOVERY \u2014 30D > 60D';
  if (signal === 'bearish') return 'CAPITULATION \u2014 30D < 60D';
  return 'NEUTRAL';
}

const MARGIN = { top: 8, right: 42, bottom: 22, left: 4 };

export function HashRibbonChart({ data, signal, currentHashrate, theme }: Props) {
  const { theme: currentTheme } = useTheme();
  const isDark = (theme || currentTheme) !== 'parchment';
  const containerRef = useRef<HTMLDivElement>(null);
  const [resizeKey, setResizeKey] = useState(0);

  // Resize observer with debounce
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let timeout: ReturnType<typeof setTimeout>;
    const observer = new ResizeObserver(() => {
      clearTimeout(timeout);
      timeout = setTimeout(() => setResizeKey((k) => k + 1), 200);
    });
    observer.observe(el);

    return () => {
      clearTimeout(timeout);
      observer.disconnect();
    };
  }, []);

  // D3 rendering
  useEffect(() => {
    const el = containerRef.current;
    if (!el || !data.length) return;

    const raf = requestAnimationFrame(() => {
      // Clear previous
      d3.select(el).select('svg').remove();

      const width = el.clientWidth;
      const height = el.clientHeight;
      const innerW = width - MARGIN.left - MARGIN.right;
      const innerH = height - MARGIN.top - MARGIN.bottom;
      if (innerW <= 0 || innerH <= 0) return;

      const ribbonColour = getRibbonColour(signal);

      // Parse data
      const parsed = data.map((d) => ({
        date: new Date(d.date),
        hashrate: d.hashrate,
        ma30: d.ma30,
        ma60: d.ma60,
      }));

      // Scales
      const xScale = d3
        .scaleTime()
        .domain(d3.extent(parsed, (d) => d.date) as [Date, Date])
        .range([0, innerW]);

      const allValues = parsed.flatMap((d) => [d.hashrate, d.ma30, d.ma60]);
      const yMin = d3.min(allValues) as number;
      const yMax = d3.max(allValues) as number;
      const yPad = (yMax - yMin) * 0.08;
      const yScale = d3
        .scaleLinear()
        .domain([yMin - yPad, yMax + yPad])
        .range([innerH, 0]);

      // Colours
      const axisColour = isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.2)';
      const tickColour = isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)';
      const bgColour = isDark ? '#1a1a1a' : '#f5f0e8';

      // SVG
      const svg = d3
        .select(el)
        .append('svg')
        .attr('width', width)
        .attr('height', height);

      const g = svg
        .append('g')
        .attr('transform', `translate(${MARGIN.left},${MARGIN.top})`);

      // Y grid lines
      const yTicks = yScale.ticks(5);
      g.selectAll('.grid-y')
        .data(yTicks)
        .enter()
        .append('line')
        .attr('x1', 0)
        .attr('x2', innerW)
        .attr('y1', (d) => yScale(d))
        .attr('y2', (d) => yScale(d))
        .attr('stroke', axisColour)
        .attr('stroke-dasharray', '3 3')
        .attr('stroke-width', 0.5);

      // Ribbon fill — draw max area, then overlay min area with bg to create ribbon
      const areaMax = d3
        .area<(typeof parsed)[0]>()
        .x((d) => xScale(d.date))
        .y0(innerH)
        .y1((d) => yScale(Math.max(d.ma30, d.ma60)))
        .curve(d3.curveMonotoneX);

      const areaMin = d3
        .area<(typeof parsed)[0]>()
        .x((d) => xScale(d.date))
        .y0(innerH)
        .y1((d) => yScale(Math.min(d.ma30, d.ma60)))
        .curve(d3.curveMonotoneX);

      g.append('path')
        .datum(parsed)
        .attr('d', areaMax)
        .attr('fill', ribbonColour)
        .attr('fill-opacity', 0.15);

      g.append('path')
        .datum(parsed)
        .attr('d', areaMin)
        .attr('fill', bgColour)
        .attr('fill-opacity', 1);

      // Hashrate line (faint dashed)
      const hashrateLine = d3
        .line<(typeof parsed)[0]>()
        .x((d) => xScale(d.date))
        .y((d) => yScale(d.hashrate))
        .curve(d3.curveMonotoneX);

      g.append('path')
        .datum(parsed)
        .attr('d', hashrateLine)
        .attr('fill', 'none')
        .attr('stroke', tickColour)
        .attr('stroke-width', 0.8)
        .attr('stroke-dasharray', '3 2');

      // MA60 line (amber)
      const ma60Line = d3
        .line<(typeof parsed)[0]>()
        .x((d) => xScale(d.date))
        .y((d) => yScale(d.ma60))
        .curve(d3.curveMonotoneX);

      g.append('path')
        .datum(parsed)
        .attr('d', ma60Line)
        .attr('fill', 'none')
        .attr('stroke', '#f59e0b')
        .attr('stroke-width', 1.5);

      // MA30 line (ribbon colour)
      const ma30Line = d3
        .line<(typeof parsed)[0]>()
        .x((d) => xScale(d.date))
        .y((d) => yScale(d.ma30))
        .curve(d3.curveMonotoneX);

      g.append('path')
        .datum(parsed)
        .attr('d', ma30Line)
        .attr('fill', 'none')
        .attr('stroke', ribbonColour)
        .attr('stroke-width', 1.5);

      // X axis
      const xAxis = d3
        .axisBottom(xScale)
        .ticks(5)
        .tickSize(0)
        .tickPadding(6);

      g.append('g')
        .attr('transform', `translate(0,${innerH})`)
        .call(xAxis)
        .call((gEl) => gEl.select('.domain').remove())
        .selectAll('text')
        .attr('font-family', MONO)
        .attr('font-size', 8)
        .attr('fill', tickColour);

      // Y axis (right)
      const yAxis = d3
        .axisRight(yScale)
        .ticks(5)
        .tickSize(0)
        .tickPadding(4)
        .tickFormat((d) => `${(d as number).toFixed(0)}`);

      g.append('g')
        .attr('transform', `translate(${innerW},0)`)
        .call(yAxis)
        .call((gEl) => gEl.select('.domain').remove())
        .selectAll('text')
        .attr('font-family', MONO)
        .attr('font-size', 8)
        .attr('fill', tickColour);
    });

    return () => {
      cancelAnimationFrame(raf);
      if (containerRef.current) {
        d3.select(containerRef.current).select('svg').remove();
      }
    };
  }, [data, theme, signal, resizeKey, isDark]);

  const ribbonColour = getRibbonColour(signal);

  return (
    <div style={{ height: 200, display: 'flex', flexDirection: 'column' }}>
      {/* Signal banner */}
      <div
        style={{
          padding: '6px 10px',
          border: `1px solid ${ribbonColour}40`,
          backgroundColor: `${ribbonColour}14`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
        }}
      >
        <div>
          <span
            style={{
              fontFamily: MONO,
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'var(--text-muted)',
            }}
          >
            HASH RIBBON &middot;{' '}
          </span>
          <span
            style={{
              fontFamily: MONO,
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: ribbonColour,
            }}
          >
            {getSignalLabel(signal)}
          </span>
        </div>
        <span
          style={{
            fontFamily: 'var(--font-data)',
            fontSize: 11,
            fontWeight: 600,
            fontVariantNumeric: 'tabular-nums',
            color: 'var(--text-primary)',
          }}
        >
          {currentHashrate.toFixed(1)} EH/s
        </span>
      </div>

      {/* Chart container */}
      <div
        ref={containerRef}
        style={{ flex: 1, minHeight: 0, position: 'relative' }}
      />
    </div>
  );
}
