'use client';

/**
 * GoldVsM2Chart (Module 3) — the marquee interactive.
 *
 * Side-by-side line charts: gold above-ground stock (left, brass) vs USD
 * M2 broad money stock (right, dried-blood red). Three optional overlays:
 *
 *   1. BTC supply on the gold panel — the digital answer to a 5,000-yr question
 *   2. USD purchasing power (1913 = $1) on the M2 panel — a saver's perspective
 *   3. Log scale toggle — for those who want to see the comparison analytically
 *
 * Annotations on the M2 chart mark the regime changes: 1913 (Fed), 1933
 * (gold confiscation), 1944 (Bretton Woods), 1971 (Nixon), 2008 (QE1),
 * 2020 (COVID stimulus).
 *
 * Mobile (< 768px): charts stack vertically. Download-as-PNG button
 * exports the whole interactive container with a situationroom.space
 * watermark — these images are screenshotted and shared regardless,
 * so we own the watermark.
 */

import { useEffect, useRef, useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine,
  ResponsiveContainer,
} from 'recharts';
import { Download } from '@phosphor-icons/react';
import { SOUND_MONEY_DATA, CHART_ANNOTATIONS } from '@/content/vienna-school/data/sound-money-chart';

const HEADING_FONT = 'Georgia, serif';
const BODY_FONT    = "'Source Serif 4', Georgia, serif";
const MONO_FONT    = 'var(--font-mono)';

// Colour palette — parchment-aware, not theme-dependent. The chart is
// designed to be screenshotted with the parchment palette.
const C = {
  gold:        '#b8860b',
  m2:          '#9b3232',
  btc:         '#c47615',     // BTC orange, parchment-tuned
  pp:          '#5b4a8a',     // purple — purchasing-power loss reads as "the saver's lament"
  axis:        '#8a7e6c',
  grid:        'rgba(80,60,20,0.10)',
  annotation:  'rgba(80,60,20,0.55)',
};

function fmtUSD(n: number): string {
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}T`;
  return `$${Math.round(n)}B`;
}

function fmtTonnes(n: number): string {
  return `${n}kt`;
}

function fmtBtc(n: number): string {
  return `${n.toFixed(1)}M`;
}

function fmtPp(n: number): string {
  if (n >= 1) return `$${n.toFixed(2)}`;
  return `$${n.toFixed(3)}`;
}

export function GoldVsM2Chart() {
  const [showBtc,  setShowBtc]  = useState(false);
  const [showPp,   setShowPp]   = useState(false);
  const [logScale, setLogScale] = useState(false);
  const [downloadingPng, setDownloadingPng] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  // ── Download-as-PNG ───────────────────────────────────────────────
  async function handleDownloadPng() {
    if (!containerRef.current || downloadingPng) return;
    setDownloadingPng(true);
    try {
      await captureToPng(containerRef.current);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('PNG export failed', err);
    } finally {
      setDownloadingPng(false);
    }
  }

  return (
    <div
      ref={containerRef}
      style={{
        border:     '1px solid var(--border-primary)',
        background: 'var(--bg-card)',
        padding:    '24px 28px',
        marginTop:  20,
      }}
    >
      {/* ── Header ──────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 14 }}>
        <div>
          <p style={{ fontFamily: MONO_FONT, fontSize: 9, letterSpacing: '0.18em', color: 'var(--text-muted)', margin: 0 }}>
            INTERACTIVE · MARQUEE
          </p>
          <h3 style={{ fontFamily: HEADING_FONT, fontSize: 22, color: 'var(--text-primary)', margin: '4px 0 0 0', fontWeight: 600 }}>
            Gold vs M2. Two lines. One conclusion.
          </h3>
        </div>
        <button
          type="button"
          onClick={handleDownloadPng}
          disabled={downloadingPng}
          data-no-export   // hide the button itself in the PNG
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '8px 14px',
            fontFamily: MONO_FONT, fontSize: 10, letterSpacing: '0.14em', fontWeight: 600,
            background: 'transparent',
            color: 'var(--text-secondary)',
            border: '1px solid var(--border-primary)',
            cursor: downloadingPng ? 'wait' : 'pointer',
          }}
          title="Download a watermarked PNG of this chart"
        >
          <Download size={11} weight="bold" />
          {downloadingPng ? 'EXPORTING…' : 'DOWNLOAD PNG'}
        </button>
      </div>

      {/* ── Toggles ─────────────────────────────────────────────── */}
      <div data-no-export style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 18 }}>
        <ToggleChip label="OVERLAY BTC SUPPLY"  active={showBtc}  onClick={() => setShowBtc((v) => !v)} accent={C.btc} />
        <ToggleChip label="SHOW PURCHASING POWER ($1 1913 →)" active={showPp}   onClick={() => setShowPp((v) => !v)}  accent={C.pp} />
        <ToggleChip label="LOG SCALE"           active={logScale} onClick={() => setLogScale((v) => !v)} accent="var(--text-secondary)" />
      </div>

      {/* ── Chart grid ───────────────────────────────────────────── */}
      <div className="vs-chart-grid" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
        gap: 18,
      }}>
        {/* Gold panel */}
        <ChartPanel
          title="Above-ground gold stock"
          subtitle="World Gold Council · thousand tonnes"
          accentColor={C.gold}
        >
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={SOUND_MONEY_DATA} margin={{ top: 10, right: 12, left: 0, bottom: 8 }}>
              <CartesianGrid stroke={C.grid} strokeDasharray="2 4" />
              <XAxis
                dataKey="year"
                tick={{ fontFamily: MONO_FONT, fontSize: 10, fill: C.axis }}
                stroke={C.axis}
                interval="preserveStartEnd"
                tickCount={6}
              />
              <YAxis
                yAxisId="left"
                scale={logScale ? 'log' : 'linear'}
                domain={logScale ? [10, 'dataMax'] : [0, 'dataMax']}
                tick={{ fontFamily: MONO_FONT, fontSize: 10, fill: C.axis }}
                stroke={C.axis}
                tickFormatter={fmtTonnes}
                width={48}
                allowDataOverflow
              />
              {showBtc && (
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  scale={logScale ? 'log' : 'linear'}
                  domain={logScale ? [0.01, 25] : [0, 25]}
                  tick={{ fontFamily: MONO_FONT, fontSize: 10, fill: C.btc }}
                  stroke={C.btc}
                  tickFormatter={fmtBtc}
                  width={42}
                  allowDataOverflow
                />
              )}
              <Tooltip
                content={<GoldTooltip showBtc={showBtc} />}
                cursor={{ stroke: C.gold, strokeWidth: 1, strokeOpacity: 0.4 }}
              />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="goldKilotonnes"
                stroke={C.gold}
                strokeWidth={2.2}
                dot={false}
                isAnimationActive={false}
                name="Gold (kt)"
              />
              {showBtc && (
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="btcSupplyM"
                  stroke={C.btc}
                  strokeWidth={2}
                  strokeDasharray="3 3"
                  dot={false}
                  isAnimationActive={false}
                  name="BTC supply (M)"
                  connectNulls={false}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
          <ChartLegend items={[
            { color: C.gold, label: 'Gold above-ground (kt)' },
            ...(showBtc ? [{ color: C.btc, label: 'BTC supply (M, capped at 21)' }] : []),
          ]} />
        </ChartPanel>

        {/* M2 panel */}
        <ChartPanel
          title="USD M2 broad money"
          subtitle="Federal Reserve · USD billions"
          accentColor={C.m2}
        >
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={SOUND_MONEY_DATA} margin={{ top: 10, right: 12, left: 0, bottom: 8 }}>
              <CartesianGrid stroke={C.grid} strokeDasharray="2 4" />
              <XAxis
                dataKey="year"
                tick={{ fontFamily: MONO_FONT, fontSize: 10, fill: C.axis }}
                stroke={C.axis}
                interval="preserveStartEnd"
                tickCount={6}
              />
              <YAxis
                yAxisId="left"
                scale={logScale ? 'log' : 'linear'}
                domain={logScale ? [1, 'dataMax'] : [0, 'dataMax']}
                tick={{ fontFamily: MONO_FONT, fontSize: 10, fill: C.axis }}
                stroke={C.axis}
                tickFormatter={fmtUSD}
                width={56}
                allowDataOverflow
              />
              {showPp && (
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  scale={logScale ? 'log' : 'linear'}
                  domain={logScale ? [0.01, 1.2] : [0, 1.05]}
                  tick={{ fontFamily: MONO_FONT, fontSize: 10, fill: C.pp }}
                  stroke={C.pp}
                  tickFormatter={fmtPp}
                  width={48}
                  allowDataOverflow
                />
              )}
              {CHART_ANNOTATIONS.map((a) => (
                <ReferenceLine
                  key={a.year}
                  x={a.year}
                  yAxisId="left"
                  stroke={C.annotation}
                  strokeDasharray="2 3"
                  strokeWidth={1}
                  label={{
                    value: a.label,
                    position: 'top',
                    fill: C.annotation,
                    fontSize: 9,
                    fontFamily: 'var(--font-mono)',
                    angle: -90,
                    offset: 6,
                    dx: -4,
                    dy: 60,
                  }}
                />
              ))}
              <Tooltip
                content={<M2Tooltip showPp={showPp} />}
                cursor={{ stroke: C.m2, strokeWidth: 1, strokeOpacity: 0.4 }}
              />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="m2Billions"
                stroke={C.m2}
                strokeWidth={2.2}
                dot={false}
                isAnimationActive={false}
                name="M2 (USD bn)"
              />
              {showPp && (
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="usdPp1913"
                  stroke={C.pp}
                  strokeWidth={2}
                  strokeDasharray="3 3"
                  dot={false}
                  isAnimationActive={false}
                  name="$1 (1913) PP"
                />
              )}
            </LineChart>
          </ResponsiveContainer>
          <ChartLegend items={[
            { color: C.m2, label: 'M2 broad money (USD bn)' },
            ...(showPp ? [{ color: C.pp, label: 'Purchasing power of $1 (1913)' }] : []),
            { color: C.annotation, label: 'Regime changes', dashed: true },
          ]} />
        </ChartPanel>
      </div>

      {/* Watermark for the exported PNG. Hidden visually — only revealed
          inside the captured image via inline-block + small label. */}
      <p
        style={{
          fontFamily: MONO_FONT, fontSize: 9, letterSpacing: '0.14em',
          color: 'var(--text-muted)', textAlign: 'right',
          marginTop: 14, marginBottom: 0, opacity: 0.7,
        }}
      >
        SITUATIONROOM.SPACE · THE VIENNA SCHOOL · DATA: FRED, WGC, BLS
      </p>
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────

function ChartPanel({
  title, subtitle, accentColor, children,
}: { title: string; subtitle: string; accentColor: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: 'var(--bg-primary)',
      border:     '1px solid var(--border-subtle)',
      padding:    '14px 14px 10px',
    }}>
      <div style={{ marginBottom: 8 }}>
        <p style={{
          fontFamily: MONO_FONT, fontSize: 9, letterSpacing: '0.18em',
          color: accentColor, fontWeight: 600, margin: 0,
          textTransform: 'uppercase',
        }}>
          {title}
        </p>
        <p style={{
          fontFamily: BODY_FONT, fontSize: 12, fontStyle: 'italic',
          color: 'var(--text-muted)', margin: '2px 0 0 0',
        }}>
          {subtitle}
        </p>
      </div>
      {children}
    </div>
  );
}

function ChartLegend({ items }: { items: { color: string; label: string; dashed?: boolean }[] }) {
  return (
    <div style={{
      display: 'flex', flexWrap: 'wrap', gap: '6px 16px',
      marginTop: 8, paddingTop: 8, borderTop: '1px dotted var(--border-subtle)',
      fontFamily: MONO_FONT, fontSize: 10, letterSpacing: '0.08em',
    }}>
      {items.map((it, i) => (
        <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--text-secondary)' }}>
          <span style={{
            display: 'inline-block', width: 18, height: 2,
            background: it.dashed ? `repeating-linear-gradient(90deg, ${it.color}, ${it.color} 3px, transparent 3px, transparent 5px)` : it.color,
          }} />
          {it.label}
        </span>
      ))}
    </div>
  );
}

function ToggleChip({
  label, active, onClick, accent,
}: { label: string; active: boolean; onClick: () => void; accent: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: '6px 12px',
        fontFamily: MONO_FONT, fontSize: 10, letterSpacing: '0.14em', fontWeight: 600,
        background: active ? accent : 'transparent',
        color: active ? '#F8F1E3' : 'var(--text-muted)',
        border: `1px solid ${active ? accent : 'var(--border-primary)'}`,
        cursor: 'pointer',
        transition: 'background 0.15s, color 0.15s, border-color 0.15s',
      }}
    >
      {active ? '✓ ' : '+ '}{label}
    </button>
  );
}

function GoldTooltip({ active, payload, label, showBtc }: {
  active?: boolean; payload?: { value: number; dataKey: string }[]; label?: number; showBtc: boolean;
}) {
  if (!active || !payload?.length) return null;
  const gold = payload.find((p) => p.dataKey === 'goldKilotonnes')?.value;
  const btc  = payload.find((p) => p.dataKey === 'btcSupplyM')?.value;
  return (
    <TooltipBox year={label!}>
      {gold !== undefined && (
        <TooltipRow color={C.gold} label="Gold" value={fmtTonnes(gold)} />
      )}
      {showBtc && btc !== undefined && btc > 0 && (
        <TooltipRow color={C.btc} label="BTC" value={fmtBtc(btc)} />
      )}
    </TooltipBox>
  );
}

function M2Tooltip({ active, payload, label, showPp }: {
  active?: boolean; payload?: { value: number; dataKey: string }[]; label?: number; showPp: boolean;
}) {
  if (!active || !payload?.length) return null;
  const m2 = payload.find((p) => p.dataKey === 'm2Billions')?.value;
  const pp = payload.find((p) => p.dataKey === 'usdPp1913')?.value;
  return (
    <TooltipBox year={label!}>
      {m2 !== undefined && <TooltipRow color={C.m2} label="M2"  value={fmtUSD(m2)} />}
      {showPp && pp !== undefined && (
        <TooltipRow color={C.pp} label="$1 1913 PP" value={fmtPp(pp)} />
      )}
    </TooltipBox>
  );
}

function TooltipBox({ year, children }: { year: number; children: React.ReactNode }) {
  return (
    <div style={{
      background:  'var(--bg-primary)',
      border:      '1px solid var(--border-primary)',
      padding:     '8px 10px',
      fontFamily:  MONO_FONT,
      fontSize:    11,
      boxShadow:   '0 4px 14px rgba(0,0,0,0.10)',
    }}>
      <div style={{
        fontSize: 10, letterSpacing: '0.14em', color: 'var(--text-muted)',
        marginBottom: 4, fontWeight: 600,
      }}>
        {year}
      </div>
      {children}
    </div>
  );
}

function TooltipRow({ color, label, value }: { color: string; label: string; value: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: 'var(--text-primary)' }}>
      <span style={{ width: 8, height: 8, background: color, display: 'inline-block' }} />
      <span style={{ flex: 1, color: 'var(--text-secondary)' }}>{label}</span>
      <span style={{ fontWeight: 600 }}>{value}</span>
    </div>
  );
}

// ── PNG export ──────────────────────────────────────────────────────────

/**
 * Capture the chart container as a PNG and trigger download.
 *
 * Approach: walk the live DOM, build a foreignObject SVG containing a
 * cloned + style-inlined snapshot, rasterise via canvas. Buttons marked
 * with `data-no-export` are stripped from the clone.
 *
 * This is the lightweight in-browser path — works without external deps.
 * For higher-fidelity exports a future session can swap to html-to-image.
 */
async function captureToPng(node: HTMLElement): Promise<void> {
  const rect = node.getBoundingClientRect();
  const width  = Math.max(1200, Math.ceil(rect.width));
  const height = Math.ceil(rect.height * (width / rect.width));

  // Clone and strip non-exportable controls
  const clone = node.cloneNode(true) as HTMLElement;
  clone.querySelectorAll('[data-no-export]').forEach((n) => n.remove());

  // Inline computed styles from the live DOM into the clone so the
  // serialised SVG renders correctly out-of-document.
  inlineStyles(node, clone);

  const xhtml = new XMLSerializer().serializeToString(clone);
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
      <foreignObject width="100%" height="100%">
        <div xmlns="http://www.w3.org/1999/xhtml" style="background:#F8F1E3;width:${width}px;padding:24px;font-family:Georgia,serif;">
          ${xhtml}
        </div>
      </foreignObject>
    </svg>`;

  const url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  const img = new Image();
  img.crossOrigin = 'anonymous';
  await new Promise<void>((resolve, reject) => {
    img.onload  = () => resolve();
    img.onerror = (e) => reject(e);
    img.src = url;
  });

  const canvas = document.createElement('canvas');
  canvas.width  = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No 2D canvas context');
  ctx.fillStyle = '#F8F1E3';
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(img, 0, 0, width, height);

  // Watermark band (belt-and-braces — the inline footer is also burned in)
  const wm = 'situationroom.space · The Vienna School';
  ctx.font = 'bold 14px monospace';
  ctx.fillStyle = 'rgba(80,60,20,0.55)';
  const textWidth = ctx.measureText(wm).width;
  ctx.fillText(wm, width - textWidth - 18, height - 14);

  const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (!blob) throw new Error('toBlob returned null');
  const dl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = dl;
  a.download = `vienna-school-gold-vs-m2-${Date.now()}.png`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(dl);
}

/** Walk source + clone in parallel and copy computed styles. */
function inlineStyles(source: Element, clone: Element): void {
  const sStyle = window.getComputedStyle(source);
  let css = '';
  for (let i = 0; i < sStyle.length; i++) {
    const prop = sStyle.item(i);
    css += `${prop}:${sStyle.getPropertyValue(prop)};`;
  }
  (clone as HTMLElement).setAttribute('style', css);
  const sChildren = source.children;
  const cChildren = clone.children;
  for (let i = 0; i < sChildren.length && i < cChildren.length; i++) {
    inlineStyles(sChildren[i], cChildren[i]);
  }
}
