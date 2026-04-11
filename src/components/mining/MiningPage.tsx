'use client';

/**
 * Mining Intelligence Page — "Should I care about miners right now?"
 *
 * 5 sections, no Recharts, D3 charts only via ParchmentChart pattern.
 * Hero = miner margin %. Everything else supports that signal.
 */

import { useTheme } from '@/components/layout/ThemeProvider';
import type { MiningIntelResponse } from '@/app/api/mining-intel/route';
import { MinerProfitHero } from './MinerProfitHero';
import { HashPriceChart } from './HashPriceChart';
import { HashRibbonChart } from './HashRibbonChart';
import { EnergyGravityChart } from './EnergyGravityChart';
import { MiningConfluence } from './MiningConfluence';
import { HashrateDistribution } from './HashrateDistribution';
import { SecurityOutlook } from './SecurityOutlook';

const MONO = "'JetBrains Mono', 'IBM Plex Mono', 'SF Mono', monospace";

interface Props {
  data: MiningIntelResponse | null;
  loading: boolean;
  error: string | null;
}

export function MiningPage({ data, loading, error }: Props) {
  const { theme } = useTheme();
  const isDark = theme !== 'parchment';

  /* ── Loading ──────────────────────────────────────────────── */
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

  /* ── Error ────────────────────────────────────────────────── */
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

  /* ── Find 2028 halving projection for SecurityOutlook ────── */
  const nextHalving = data.securityBudget.base.find(p => p.year === 2028) ?? null;

  /* ── Render ───────────────────────────────────────────────── */
  return (
    <div style={{
      height: '100%', overflowY: 'auto',
      backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)',
    }}>
      <div style={{
        maxWidth: 920, margin: '0 auto', width: '100%',
        padding: '28px 36px 56px',
        display: 'flex', flexDirection: 'column', gap: 0,
      }}>

        {/* ═══ 1. HERO — Mining Profitability Signal ════════════ */}
        <MinerProfitHero
          marginPct={data.hashPrice.marginPct}
          signal={data.hashPrice.signal}
          hashPrice={data.hashPrice.current}
          breakevenHashPrice={data.hashPrice.breakevenHashPrice}
          breakevenBtcPrice={data.hashPrice.breakevenBtcPrice}
          btcPrice={data.btcPrice}
          hashrateEH={data.hashrateEH}
          energyValueFair={data.energyValue.fairValue}
          energyValuePremiumPct={data.energyValue.premiumPct}
          globalWeightedAvg={data.energyPrices.globalWeightedAvg}
          efficientMinerJPerTH={data.energyPrices.efficientMinerJPerTH}
          timestamp={data.timestamp}
        />

        {/* ═══ 2. CHARTS — Hash Price + Hash Ribbon ═════════════ */}
        <section style={{ marginTop: 36 }}>
          <div style={{
            fontFamily: MONO, fontSize: 9, letterSpacing: '0.16em',
            color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 16,
          }}>
            MINER ECONOMICS
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 24,
          }}>
            <HashPriceChart
              history={data.hashPrice.history}
              breakevenHashPrice={data.hashPrice.breakevenHashPrice}
              signal={data.hashPrice.signal}
              theme={theme}
            />
            <HashRibbonChart
              data={data.hashRibbon.data}
              signal={data.hashRibbon.signal}
              currentHashrate={data.hashRibbon.currentHashrate}
              theme={theme}
            />
          </div>

          {/* Energy Gravity — full width below */}
          <div style={{ marginTop: 24 }}>
            <EnergyGravityChart
              history={data.energyGravity.history}
              currentGravityKwh={data.energyGravity.current}
              globalAvgKwh={data.energyPrices.globalWeightedAvg}
              theme={theme}
            />
          </div>
        </section>

        {/* ═══ 3. CONFLUENCE — 4 Mining Signals ═════════════════ */}
        <section style={{ marginTop: 32 }}>
          <MiningConfluence
            hashPriceSignal={data.hashPrice.signal}
            marginPct={data.hashPrice.marginPct}
            hashRibbonSignal={data.hashRibbon.signal}
            energyPremiumPct={data.energyValue.premiumPct}
            subsidyPct={data.securityBudget.current.subsidyPct}
          />
        </section>

        {/* ═══ 4. HASHRATE DISTRIBUTION (top 5) ═════════════════ */}
        <section style={{ marginTop: 36 }}>
          <HashrateDistribution
            regions={data.hashrateGeo.regions.slice(0, 5)}
            totalHashrateEH={data.hashrateGeo.totalHashrateEH}
            alerts={data.geoAlerts.slice(0, 2)}
            updatedAt={data.hashrateGeo.updatedAt}
          />
        </section>

        {/* ═══ 5. THE LONG VIEW — Editorial + Security Budget ═══ */}
        <section style={{ marginTop: 36 }}>
          <SecurityOutlook
            editorial={data.editorial}
            current={data.securityBudget.current}
            nextHalving={nextHalving}
            energyValueFair={data.energyValue.fairValue}
            energyValuePremiumPct={data.energyValue.premiumPct}
            fleetEfficiency={data.energyValue.fleetEfficiency}
            btcPrice={data.btcPrice}
          />
        </section>

      </div>
    </div>
  );
}
