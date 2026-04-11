'use client';

import { useTheme } from '@/components/layout/ThemeProvider';
import { formatPrice, formatLargeNumber } from '@/components/panels/shared';
import type { MiningIntelResponse } from '@/app/api/mining-intel/route';
import HashrateGeoSection from './HashrateGeoSection';
import GeoShiftAlerts from './GeoShiftAlerts';
import HashPriceSection from './HashPriceSection';
import { GasMiningSection } from './GasMiningSection';
import { SecurityBudgetSection } from './SecurityBudgetSection';
import { EditorialSection } from './EditorialSection';

const MONO = "'JetBrains Mono', 'IBM Plex Mono', 'SF Mono', monospace";

interface Props {
  data: MiningIntelResponse | null;
  loading: boolean;
  error: string | null;
}

export function MiningPage({ data, loading, error }: Props) {
  const { theme } = useTheme();
  const isDark = theme !== 'parchment';

  /* ── Loading / Error ──────────────────────────────────────────────── */

  if (loading) {
    return (
      <div style={{
        height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
        backgroundColor: 'var(--bg-primary)', fontFamily: MONO,
      }}>
        <span style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.16em' }}>
          LOADING MINING INTELLIGENCE...
        </span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{
        height: '100%', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        backgroundColor: 'var(--bg-primary)', fontFamily: MONO, gap: 8,
      }}>
        <div style={{ fontSize: 13, color: 'var(--accent-danger)', fontWeight: 600, letterSpacing: '0.1em' }}>
          DATA UNAVAILABLE
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{error ?? 'No data returned'}</div>
      </div>
    );
  }

  /* ── Derived values ───────────────────────────────────────────────── */

  const signalColor =
    data.hashPrice.signal === 'profitable' ? 'var(--accent-success)' :
    data.hashPrice.signal === 'marginal' ? 'var(--accent-warning)' :
    'var(--accent-danger)';

  const signalLabel =
    data.hashPrice.signal === 'profitable' ? 'PROFITABLE' :
    data.hashPrice.signal === 'marginal' ? 'MARGINAL' : 'UNPROFITABLE';

  const dailyBudget = data.securityBudget.current.dailyTotalUsd;
  const subsidyPct  = data.securityBudget.current.subsidyPct;

  /* ── Render ───────────────────────────────────────────────────────── */

  return (
    <div style={{
      height: '100%', overflowY: 'auto',
      backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)',
    }}>
      <div style={{
        maxWidth: 960, margin: '0 auto', width: '100%',
        padding: '28px 36px 56px',
      }}>

        {/* ═══ HEADER ═══════════════════════════════════════════════ */}
        <header style={{ marginBottom: 28 }}>
          <div style={{
            fontSize: 9, fontFamily: MONO, textTransform: 'uppercase',
            letterSpacing: '0.2em', color: 'var(--text-muted)', marginBottom: 6,
          }}>
            SITUATION ROOM
          </div>
          <div style={{
            display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
            flexWrap: 'wrap', gap: 12,
          }}>
            <h1 style={{
              fontFamily: 'var(--font-heading)', fontSize: 22, fontWeight: 400,
              color: 'var(--text-primary)', margin: 0, letterSpacing: '0.04em',
            }}>
              Energy & Mining Intelligence
            </h1>
            <span style={{
              fontSize: 10, fontFamily: MONO, color: 'var(--text-muted)',
            }}>
              {new Date(data.timestamp).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).toUpperCase()}
            </span>
          </div>
          <div style={{
            marginTop: 16, borderBottom: '1px solid var(--border-primary)',
          }} />
        </header>

        {/* ═══ HERO STRIP ═══════════════════════════════════════════ */}
        {/* One dominant metric (hashrate) + supporting row */}
        <section style={{ marginBottom: 36 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 8 }}>
            <span style={{
              fontFamily: 'var(--font-data)', fontSize: 38, fontWeight: 600,
              color: 'var(--text-primary)', letterSpacing: '-0.02em',
              fontVariantNumeric: 'tabular-nums',
            }}>
              {data.hashrateEH.toFixed(1)}
            </span>
            <span style={{
              fontFamily: MONO, fontSize: 13, color: 'var(--text-muted)',
              letterSpacing: '0.06em',
            }}>
              EH/s
            </span>
            <span style={{
              fontFamily: MONO, fontSize: 11, color: 'var(--text-muted)',
              marginLeft: 'auto',
            }}>
              NETWORK HASHRATE
            </span>
          </div>

          {/* Supporting metrics tape — horizontal, divided */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 0,
            borderTop: '1px solid var(--border-subtle)',
            borderBottom: '1px solid var(--border-subtle)',
            padding: '10px 0',
          }}>
            {[
              { label: 'HASH PRICE', value: `$${data.hashPrice.current.toFixed(4)}`, color: signalColor, sub: signalLabel },
              { label: 'DIFFICULTY', value: `${data.difficultyT.toFixed(1)} T` },
              { label: 'SECURITY BUDGET', value: `$${formatLargeNumber(dailyBudget)}/d`, sub: `${subsidyPct.toFixed(0)}% subsidy` },
              { label: 'BTC', value: `$${formatPrice(data.btcPrice, 0)}` },
            ].map((m, i) => (
              <div key={m.label} style={{
                flex: 1, display: 'flex', flexDirection: 'column', gap: 2,
                paddingLeft: i > 0 ? 16 : 0, paddingRight: 16,
                borderLeft: i > 0 ? '1px solid var(--border-subtle)' : 'none',
              }}>
                <span style={{
                  fontFamily: MONO, fontSize: 8, letterSpacing: '0.14em',
                  color: 'var(--text-muted)', textTransform: 'uppercase',
                }}>{m.label}</span>
                <span style={{
                  fontFamily: 'var(--font-data)', fontSize: 14, fontWeight: 600,
                  color: m.color || 'var(--text-primary)',
                  fontVariantNumeric: 'tabular-nums',
                }}>{m.value}</span>
                {m.sub && (
                  <span style={{
                    fontFamily: MONO, fontSize: 9,
                    color: m.color || 'var(--text-muted)',
                    letterSpacing: '0.06em',
                  }}>{m.sub}</span>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* ═══ HASHRATE GEOGRAPHY — full width ══════════════════════ */}
        <section style={{ marginBottom: 40 }}>
          <HashrateGeoSection
            regions={data.hashrateGeo.regions}
            totalHashrateEH={data.hashrateGeo.totalHashrateEH}
            updatedAt={data.hashrateGeo.updatedAt}
            energyPrices={data.energyPrices.regions}
          />
        </section>

        {/* ═══ GEO ALERTS — compact strip ═══════════════════════════ */}
        {data.geoAlerts.length > 0 && (
          <section style={{ marginBottom: 36 }}>
            <GeoShiftAlerts alerts={data.geoAlerts} />
          </section>
        )}

        {/* ═══ HASH PRICE / MINER ECONOMICS — two-column ═══════════ */}
        <section style={{ marginBottom: 40 }}>
          <HashPriceSection
            current={data.hashPrice.current}
            history={data.hashPrice.history}
            signal={data.hashPrice.signal}
            breakevenHashPrice={data.hashPrice.breakevenHashPrice}
            marginPct={data.hashPrice.marginPct}
            breakevenBtcPrice={data.hashPrice.breakevenBtcPrice}
            energyPrices={data.energyPrices.regions}
            globalWeightedAvg={data.energyPrices.globalWeightedAvg}
            efficientMinerJPerTH={data.energyPrices.efficientMinerJPerTH}
          />
        </section>

        {/* ═══ SECURITY BUDGET — full width ═════════════════════════ */}
        <section style={{ marginBottom: 40 }}>
          <SecurityBudgetSection
            current={data.securityBudget.current}
            conservative={data.securityBudget.conservative}
            base={data.securityBudget.base}
            optimistic={data.securityBudget.optimistic}
            btcPrice={data.btcPrice}
          />
        </section>

        {/* ═══ STRANDED ENERGY — two-column ═════════════════════════ */}
        <section style={{ marginBottom: 40 }}>
          <GasMiningSection
            projects={data.gasMining.projects}
            narrativeHook={data.gasMining.narrativeHook}
            stats={data.gasMining.stats}
            flareSites={data.flareSites}
          />
        </section>

        {/* ═══ EDITORIAL — full width, constrained ══════════════════ */}
        <section>
          <EditorialSection
            title={data.editorial.title}
            body={data.editorial.body}
            updatedAt={data.editorial.updatedAt}
          />
        </section>

      </div>
    </div>
  );
}
