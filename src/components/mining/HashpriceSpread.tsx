'use client';

/**
 * HashpriceSpread — miner revenue per TH overlaid against industrial
 * electricity costs by region. Shows where mining is profitable today
 * and what 1 BTC is worth in raw joules.
 *
 * Inputs come straight off MiningIntelResponse (no extra fetches).
 */

import { useMemo } from 'react';
import { useTheme } from '@/components/layout/ThemeProvider';
import type {
  RegionalSpreadResult,
  JoulesPerBtcResult,
} from '@/lib/signals/mining-engine';

const MONO = "'JetBrains Mono', 'IBM Plex Mono', 'SF Mono', monospace";

interface Props {
  spread:       RegionalSpreadResult;
  joulesPerBtc: JoulesPerBtcResult;
  btcPrice:     number;
  globalAvgKwh: number;
}

function fmtUsdShort(v: number): string {
  if (v >= 1e9)  return `$${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6)  return `$${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3)  return `$${(v / 1e3).toFixed(1)}K`;
  return `$${v.toFixed(0)}`;
}

function fmtKwh(v: number): string {
  if (v >= 1e9)  return `${(v / 1e9).toFixed(2)} TWh`;
  if (v >= 1e6)  return `${(v / 1e6).toFixed(2)} GWh`;
  if (v >= 1e3)  return `${(v / 1e3).toFixed(0)} MWh`;
  return `${v.toFixed(0)} kWh`;
}

export function HashpriceSpread({ spread, joulesPerBtc, btcPrice, globalAvgKwh }: Props) {
  const { theme } = useTheme();
  const isDark = theme !== 'parchment';

  const greenCol = isDark ? '#2dd4bf' : '#4a7c59';
  const redCol   = isDark ? '#d06050' : '#9b3232';
  const amberCol = isDark ? '#c4885a' : '#b8860b';

  // Symmetric domain so the bars centre on zero
  const maxAbs = useMemo(
    () => Math.max(
      spread.hashPrice,             // bars never exceed full hashprice
      ...spread.regions.map(r => Math.abs(r.spread)),
      0.01,
    ),
    [spread],
  );

  const profitableCount = spread.regions.filter(r => r.spread > 0).length;
  const headlineCol = spread.globalSpread >= 0 ? greenCol : redCol;

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100%',
      border: '1px solid var(--border-primary)',
      backgroundColor: 'var(--bg-card)',
    }}>
      {/* ── Header ── */}
      <div style={{
        padding: '10px 14px',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
      }}>
        <div>
          <div style={{
            fontFamily: MONO, fontSize: 9, letterSpacing: '0.14em',
            color: 'var(--text-muted)', textTransform: 'uppercase',
          }}>
            HASHPRICE vs ENERGY COST SPREAD
          </div>
          <div style={{
            fontFamily: isDark ? MONO : "'Georgia', 'Times New Roman', serif",
            fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginTop: 2,
          }}>
            Miner revenue per TH overlaid against industrial electricity by region
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontFamily: MONO, fontSize: 9, color: 'var(--text-muted)' }}>
            FLEET {spread.fleetEfficiencyJPerTH} J/TH
          </div>
          <div style={{ fontFamily: MONO, fontSize: 9, color: 'var(--text-muted)' }}>
            {spread.kwhPerThDay.toFixed(3)} kWh/TH·day
          </div>
        </div>
      </div>

      {/* ── Headline numbers ── */}
      <div style={{
        padding: '12px 14px',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex', gap: 24, flexWrap: 'wrap',
      }}>
        <Metric
          label="HASH PRICE (NETWORK)"
          value={`$${spread.hashPrice.toFixed(4)}`}
          sub="/TH/day"
        />
        <Metric
          label={`BREAKEVEN @ $${globalAvgKwh.toFixed(3)}/kWh`}
          value={`$${spread.globalBreakeven.toFixed(4)}`}
          sub="/TH/day"
        />
        <Metric
          label="GLOBAL SPREAD"
          value={`${spread.globalSpread >= 0 ? '+' : ''}$${spread.globalSpread.toFixed(4)}`}
          sub={`${spread.globalMarginPct >= 0 ? '+' : ''}${spread.globalMarginPct.toFixed(1)}% margin`}
          color={headlineCol}
        />
        <Metric
          label="REGIONS PROFITABLE"
          value={`${profitableCount} / ${spread.regions.length}`}
          sub="at fleet efficiency"
          color={profitableCount > spread.regions.length / 2 ? greenCol : amberCol}
        />
      </div>

      {/* ── Per-region bars ── */}
      <div style={{ padding: '10px 14px 12px', flex: 1, overflowY: 'auto', minHeight: 0 }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '160px 76px 1fr 92px 72px',
          gap: 10,
          fontFamily: MONO, fontSize: 8, letterSpacing: '0.1em',
          color: 'var(--text-muted)', textTransform: 'uppercase',
          paddingBottom: 6, borderBottom: '1px solid var(--border-subtle)',
        }}>
          <span>REGION</span>
          <span style={{ textAlign: 'right' }}>$/kWh</span>
          <span>SPREAD vs HASH PRICE</span>
          <span style={{ textAlign: 'right' }}>BREAKEVEN</span>
          <span style={{ textAlign: 'right' }}>MARGIN</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingTop: 8 }}>
          {spread.regions.map((r) => {
            const isPositive = r.spread >= 0;
            const col = isPositive ? greenCol : redCol;
            const widthPct = (Math.abs(r.spread) / maxAbs) * 50;  // half-track
            return (
              <div key={r.id} style={{
                display: 'grid',
                gridTemplateColumns: '160px 76px 1fr 92px 72px',
                gap: 10, alignItems: 'center',
              }}>
                <div style={{
                  fontFamily: MONO, fontSize: 10,
                  color: 'var(--text-primary)', overflow: 'hidden',
                  textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {r.label}
                </div>
                <div style={{
                  fontFamily: MONO, fontSize: 10, textAlign: 'right',
                  color: 'var(--text-secondary)', fontVariantNumeric: 'tabular-nums',
                }}>
                  ${r.pricePerKwh.toFixed(3)}
                </div>
                {/* Centre-axis bar */}
                <div style={{ position: 'relative', height: 14 }}>
                  {/* zero line */}
                  <div style={{
                    position: 'absolute', left: '50%', top: 0, bottom: 0,
                    width: 1, backgroundColor: 'var(--border-primary)',
                  }} />
                  {/* spread bar */}
                  <div style={{
                    position: 'absolute', top: 3, height: 8,
                    left:  isPositive ? '50%' : `${50 - widthPct}%`,
                    width: `${widthPct}%`,
                    backgroundColor: col, opacity: 0.85,
                  }} />
                </div>
                <div style={{
                  fontFamily: MONO, fontSize: 10, textAlign: 'right',
                  color: 'var(--text-secondary)', fontVariantNumeric: 'tabular-nums',
                }}>
                  ${r.breakevenHashPrice.toFixed(4)}
                </div>
                <div style={{
                  fontFamily: 'var(--font-data)', fontSize: 12, fontWeight: 600,
                  textAlign: 'right', color: col, fontVariantNumeric: 'tabular-nums',
                }}>
                  {r.marginPct >= 0 ? '+' : ''}{r.marginPct.toFixed(0)}%
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Joules-per-BTC footer ── */}
      <div style={{
        padding: '10px 14px',
        borderTop: '1px solid var(--border-subtle)',
        backgroundColor: 'var(--bg-subtle, transparent)',
      }}>
        <div style={{
          fontFamily: MONO, fontSize: 8, letterSpacing: '0.14em',
          color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6,
        }}>
          1 BTC PRICED IN JOULES
        </div>
        <div style={{
          display: 'flex', gap: 22, flexWrap: 'wrap', alignItems: 'baseline',
        }}>
          <FooterStat
            label="ENERGY BACKING"
            value={fmtKwh(joulesPerBtc.kwhPerBtc)}
            sub={`${(joulesPerBtc.joulesPerBtc / 1e12).toFixed(2)} TJ`}
          />
          <FooterStat
            label="@ GLOBAL AVG"
            value={fmtUsdShort(joulesPerBtc.energyDollarsPerBtc)}
            sub="raw electricity only"
          />
          <FooterStat
            label="SPOT vs ENERGY"
            value={`${joulesPerBtc.costPremiumOverEnergyPct >= 0 ? '+' : ''}${joulesPerBtc.costPremiumOverEnergyPct.toFixed(0)}%`}
            sub={`spot $${btcPrice.toLocaleString('en-US', { maximumFractionDigits: 0 })}`}
            color={
              joulesPerBtc.costPremiumOverEnergyPct >= 0 ? greenCol : redCol
            }
          />
          <FooterStat
            label="NETWORK DRAW"
            value={`${joulesPerBtc.networkPowerGW.toFixed(1)} GW`}
            sub="continuous"
          />
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────

function Metric({
  label, value, sub, color,
}: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div style={{ minWidth: 0 }}>
      <div style={{
        fontFamily: MONO, fontSize: 8, letterSpacing: '0.12em',
        color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 3,
      }}>
        {label}
      </div>
      <div style={{
        fontFamily: 'var(--font-data)', fontSize: 16, fontWeight: 700,
        color: color ?? 'var(--text-primary)', fontVariantNumeric: 'tabular-nums',
        lineHeight: 1.1,
      }}>
        {value}
      </div>
      {sub && (
        <div style={{
          fontFamily: MONO, fontSize: 9, color: 'var(--text-muted)', marginTop: 2,
        }}>
          {sub}
        </div>
      )}
    </div>
  );
}

function FooterStat({
  label, value, sub, color,
}: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div>
      <div style={{
        fontFamily: MONO, fontSize: 8, letterSpacing: '0.1em',
        color: 'var(--text-muted)', textTransform: 'uppercase',
      }}>
        {label}
      </div>
      <div style={{
        fontFamily: 'var(--font-data)', fontSize: 14, fontWeight: 700,
        color: color ?? 'var(--text-primary)', fontVariantNumeric: 'tabular-nums',
      }}>
        {value}
      </div>
      {sub && (
        <div style={{ fontFamily: MONO, fontSize: 9, color: 'var(--text-muted)' }}>
          {sub}
        </div>
      )}
    </div>
  );
}
