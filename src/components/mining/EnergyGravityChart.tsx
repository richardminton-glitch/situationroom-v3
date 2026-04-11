'use client';

/**
 * Energy Gravity Chart (Blockware model)
 *
 * Dual-line D3 chart showing BTC price vs production cost ("Energy Mass").
 * Price oscillates around production cost — pulled back like gravity.
 *
 * Follows ParchmentChart rendering pattern (ResizeObserver + rAF + SVG).
 */

import { useRef, useEffect, useState, useMemo } from 'react';
import * as d3 from 'd3';
import { useTheme } from '@/components/layout/ThemeProvider';
import { chartColors } from '@/components/panels/shared';

const MONO = "'JetBrains Mono', 'IBM Plex Mono', 'SF Mono', monospace";
const MARGIN = { top: 12, right: 52, bottom: 24, left: 4 };

interface Props {
  history: { date: string; btcPrice: number; productionCost: number; gravityKwh: number }[];
  currentGravityKwh: number;
  globalAvgKwh: number;
  theme: string;
}

export function EnergyGravityChart({ history, currentGravityKwh, globalAvgKwh, theme }: Props) {
  const isDark = theme !== 'parchment';
  const containerRef = useRef<HTMLDivElement>(null);
  const [resizeKey, setResizeKey] = useState(0);

  const C = useMemo(() => chartColors(isDark), [isDark]);

  const chartData = useMemo(() =>
    history
      .filter(p => p.btcPrice > 0 && p.productionCost > 0)
      .map(p => ({
        time: new Date(p.date + 'T00:00:00Z').getTime(),
        price: p.btcPrice,
        cost: p.productionCost,
      })),
    [history],
  );

  // Current production cost
  const currentCost = chartData.length > 0 ? chartData[chartData.length - 1].cost : 0;
  const currentPrice = chartData.length > 0 ? chartData[chartData.length - 1].price : 0;
  const premium = currentCost > 0 ? ((currentPrice - currentCost) / currentCost * 100) : 0;

  // Font from CSS vars
  const fontData = isDark ? MONO : "'Source Serif 4', 'Georgia', serif";

  // ResizeObserver
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    let debounce: ReturnType<typeof setTimeout>;
    const ro = new ResizeObserver(() => {
      clearTimeout(debounce);
      debounce = setTimeout(() => setResizeKey(k => k + 1), 200);
    });
    ro.observe(el);
    return () => { clearTimeout(debounce); ro.disconnect(); };
  }, []);

  // D3 render
  useEffect(() => {
    const container = containerRef.current;
    if (!container || chartData.length < 2) return;

    const rafId = requestAnimationFrame(() => {
      d3.select(container).select('svg').remove();

      const w = container.clientWidth || 400;
      const h = container.clientHeight || 300;
      const innerW = w - MARGIN.left - MARGIN.right;
      const innerH = h - MARGIN.top - MARGIN.bottom;

      const svg = d3.select(container)
        .append('svg')
        .attr('width', w)
        .attr('height', h)
        .style('overflow', 'visible');

      const g = svg.append('g')
        .attr('transform', `translate(${MARGIN.left},${MARGIN.top})`);

      // Scales
      const xScale = d3.scaleTime()
        .domain(d3.extent(chartData, d => d.time) as [number, number])
        .range([0, innerW]);

      const allVals = chartData.flatMap(d => [d.price, d.cost]);
      const yMin = d3.min(allVals)! * 0.92;
      const yMax = d3.max(allVals)! * 1.08;

      const yScale = d3.scaleLinear()
        .domain([yMin, yMax])
        .range([innerH, 0]);

      // Grid lines
      const yTicks = yScale.ticks(5);
      g.selectAll('.grid')
        .data(yTicks)
        .enter()
        .append('line')
        .attr('x1', 0).attr('x2', innerW)
        .attr('y1', d => yScale(d)).attr('y2', d => yScale(d))
        .attr('stroke', C.gridLine)
        .attr('stroke-dasharray', '2,3');

      // Area between price and cost (showing the "gravity gap")
      const areaAbove = d3.area<typeof chartData[0]>()
        .x(d => xScale(d.time))
        .y0(d => yScale(d.cost))
        .y1(d => yScale(Math.max(d.price, d.cost)))
        .curve(d3.curveMonotoneX);

      const areaBelow = d3.area<typeof chartData[0]>()
        .x(d => xScale(d.time))
        .y0(d => yScale(Math.min(d.price, d.cost)))
        .y1(d => yScale(d.cost))
        .curve(d3.curveMonotoneX);

      // Green fill when price > cost (profitable territory)
      g.append('path')
        .datum(chartData)
        .attr('d', areaAbove)
        .attr('fill', isDark ? '#2dd4bf' : '#4a7c59')
        .attr('opacity', 0.08);

      // Red fill when price < cost (unprofitable territory)
      g.append('path')
        .datum(chartData)
        .attr('d', areaBelow)
        .attr('fill', isDark ? '#d06050' : '#9b3232')
        .attr('opacity', 0.08);

      // Production cost line (Energy Mass — blue)
      const costLine = d3.line<typeof chartData[0]>()
        .x(d => xScale(d.time))
        .y(d => yScale(d.cost))
        .curve(d3.curveMonotoneX);

      g.append('path')
        .datum(chartData)
        .attr('d', costLine)
        .attr('fill', 'none')
        .attr('stroke', isDark ? '#3b82f6' : '#2563eb')
        .attr('stroke-width', 2);

      // BTC price line (black/white)
      const priceLine = d3.line<typeof chartData[0]>()
        .x(d => xScale(d.time))
        .y(d => yScale(d.price))
        .curve(d3.curveMonotoneX);

      g.append('path')
        .datum(chartData)
        .attr('d', priceLine)
        .attr('fill', 'none')
        .attr('stroke', 'var(--text-primary)')
        .attr('stroke-width', 2);

      // X-axis
      g.append('g')
        .attr('transform', `translate(0,${innerH})`)
        .call(
          d3.axisBottom(xScale)
            .ticks(6)
            .tickSize(0)
            .tickFormat(d => d3.timeFormat('%d %b')(d as Date))
        )
        .call(g => g.select('.domain').remove())
        .selectAll('text')
        .attr('fill', C.axisTick)
        .attr('font-size', '8px')
        .attr('font-family', fontData);

      // Y-axis (right)
      const fmtPrice = (v: number) => v >= 1000 ? `$${(v / 1000).toFixed(0)}K` : `$${v.toFixed(0)}`;

      g.append('g')
        .attr('transform', `translate(${innerW},0)`)
        .call(
          d3.axisRight(yScale)
            .ticks(5)
            .tickSize(0)
            .tickFormat(d => fmtPrice(d as number))
        )
        .call(g => g.select('.domain').remove())
        .selectAll('text')
        .attr('fill', C.axisTick)
        .attr('font-size', '8px')
        .attr('font-family', MONO);

      // Crosshair + tooltip
      const crosshairLine = g.append('line')
        .attr('stroke', C.crosshair)
        .attr('stroke-dasharray', '3,3')
        .style('display', 'none');

      const tooltipG = g.append('g').style('display', 'none');
      const tooltipRect = tooltipG.append('rect')
        .attr('fill', C.tooltipBg)
        .attr('stroke', C.tooltipBorder)
        .attr('stroke-width', 0.5);
      const tooltipText = tooltipG.append('text')
        .attr('fill', C.tooltipText)
        .attr('font-size', '9px')
        .attr('font-family', MONO);

      const bisector = d3.bisector<typeof chartData[0], number>(d => d.time).left;

      svg.on('mousemove', function (event) {
        const [mx] = d3.pointer(event, g.node());
        if (mx < 0 || mx > innerW) { crosshairLine.style('display', 'none'); tooltipG.style('display', 'none'); return; }

        const x0 = xScale.invert(mx).getTime();
        const i = bisector(chartData, x0, 1);
        const d0 = chartData[i - 1];
        const d1 = chartData[i];
        const d = d0 && d1 ? (x0 - d0.time > d1.time - x0 ? d1 : d0) : d0 || d1;
        if (!d) return;

        const cx = xScale(d.time);
        crosshairLine.attr('x1', cx).attr('y1', 0).attr('x2', cx).attr('y2', innerH).style('display', '');

        const label = `BTC $${(d.price / 1000).toFixed(1)}K  Cost $${(d.cost / 1000).toFixed(1)}K  ${d3.timeFormat('%d %b')(new Date(d.time))}`;
        tooltipText.text(label);
        const bbox = (tooltipText.node() as SVGTextElement).getBBox();
        const tx = cx > innerW - 180 ? cx - bbox.width - 12 : cx + 8;
        tooltipRect.attr('x', tx - 3).attr('y', 4).attr('width', bbox.width + 6).attr('height', bbox.height + 4);
        tooltipText.attr('x', tx).attr('y', 4 + bbox.height);
        tooltipG.style('display', '');
      });

      svg.on('mouseleave', () => {
        crosshairLine.style('display', 'none');
        tooltipG.style('display', 'none');
      });
    });

    return () => {
      cancelAnimationFrame(rafId);
      d3.select(container).select('svg').remove();
    };
  }, [chartData, isDark, C, fontData, resizeKey]);

  const fmtUsd = (v: number) => `$${v.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;

  return (
    <div>
      {/* Header: title + current values */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
        marginBottom: 10,
      }}>
        <div style={{
          fontFamily: MONO, fontSize: 9, letterSpacing: '0.1em',
          color: 'var(--text-muted)', textTransform: 'uppercase',
        }}>
          ENERGY GRAVITY
        </div>
        <div style={{ display: 'flex', gap: 16, alignItems: 'baseline' }}>
          <span style={{ fontFamily: MONO, fontSize: 9, color: 'var(--text-muted)' }}>
            COST <span style={{
              fontFamily: 'var(--font-data)', fontSize: 13, fontWeight: 600,
              color: isDark ? '#3b82f6' : '#2563eb', fontVariantNumeric: 'tabular-nums',
            }}>{fmtUsd(currentCost)}</span>
          </span>
          <span style={{ fontFamily: MONO, fontSize: 9, color: 'var(--text-muted)' }}>
            BTC <span style={{
              fontFamily: 'var(--font-data)', fontSize: 13, fontWeight: 600,
              color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums',
            }}>{fmtUsd(currentPrice)}</span>
          </span>
          <span style={{
            fontFamily: MONO, fontSize: 10, fontWeight: 600,
            color: premium > 0 ? (isDark ? '#2dd4bf' : '#4a7c59') : (isDark ? '#d06050' : '#9b3232'),
            fontVariantNumeric: 'tabular-nums',
          }}>
            {premium > 0 ? '+' : ''}{premium.toFixed(0)}%
          </span>
        </div>
      </div>

      {/* Chart container */}
      <div ref={containerRef} style={{ height: 300, position: 'relative' }} />

      {/* Legend */}
      <div style={{
        display: 'flex', gap: 16, marginTop: 6, alignItems: 'center',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <div style={{ width: 16, height: 2, backgroundColor: 'var(--text-primary)' }} />
          <span style={{ fontFamily: MONO, fontSize: 8, color: 'var(--text-muted)' }}>BTC Price</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <div style={{ width: 16, height: 2, backgroundColor: isDark ? '#3b82f6' : '#2563eb' }} />
          <span style={{ fontFamily: MONO, fontSize: 8, color: 'var(--text-muted)' }}>Production Cost</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <div style={{ width: 10, height: 8, backgroundColor: isDark ? '#2dd4bf' : '#4a7c59', opacity: 0.2 }} />
          <span style={{ fontFamily: MONO, fontSize: 8, color: 'var(--text-muted)' }}>Profitable</span>
        </div>
        <span style={{ fontFamily: MONO, fontSize: 9, color: 'var(--text-muted)', marginLeft: 'auto' }}>
          MAX ELEC: ${currentGravityKwh.toFixed(3)}/kWh
        </span>
      </div>
    </div>
  );
}
