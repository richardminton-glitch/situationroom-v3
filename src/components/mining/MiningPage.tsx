'use client';

/**
 * Mining Intelligence Page — "Should I care about miners right now?"
 *
 * 5 sections, no Recharts, D3 charts only via ParchmentChart pattern.
 * Hero = miner margin %. Everything else supports that signal.
 */

import { useTheme } from '@/components/layout/ThemeProvider';
import { useIsMobile } from '@/hooks/useIsMobile';
import type { MiningIntelResponse } from '@/app/api/mining-intel/route';
import { MinerProfitHero } from './MinerProfitHero';
import { HashPriceChart } from './HashPriceChart';
import { HashRibbonChart } from './HashRibbonChart';
import { EnergyGravityChart } from './EnergyGravityChart';
import { MiningConfluence } from './MiningConfluence';
import { HashrateDistribution } from './HashrateDistribution';
import { SecurityOutlook } from './SecurityOutlook';
import { MinerTreasuryStress } from './MinerTreasuryStress';
import { HashpriceSpread } from './HashpriceSpread';

const MONO = "'JetBrains Mono', 'IBM Plex Mono', 'SF Mono', monospace";

interface Props {
  data: MiningIntelResponse | null;
  loading: boolean;
  error: string | null;
}

export function MiningPage({ data, loading, error }: Props) {
  const { theme } = useTheme();
  const isDark = theme !== 'parchment';
  const isMobile = useIsMobile();

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

  /* ── Layout helpers ───────────────────────────────────────── */
  const isWide   = !isMobile;          // ≥ 768
  const isXWide  = !isMobile;          // CSS handles >=1280 via responsive grid
  const sectionLabelStyle: React.CSSProperties = {
    fontFamily: MONO,
    fontSize: 9,
    letterSpacing: '0.16em',
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    marginBottom: 12,
  };

  /* ── Render ───────────────────────────────────────────────── */
  return (
    <div style={{
      height: '100%', overflowY: 'auto',
      backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)',
    }}>
      <div style={{
        width: '100%',
        padding: isMobile ? '16px 12px 32px' : '24px 28px 48px',
        display: 'flex', flexDirection: 'column', gap: isMobile ? 24 : 28,
      }}>

        {/* ═══ ROW 1 — HERO (full width, includes page header) ══ */}
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

        {/* ═══ ROW 2 — TREASURY STRESS MONITOR ══════════════════ */}
        {data.minerTreasuries.miners.length > 0 && (
          <section>
            <div style={sectionLabelStyle}>BALANCE SHEET PRESSURE</div>
            <MinerTreasuryStress data={data.minerTreasuries} />
          </section>
        )}

        {/* ═══ ROW 3 — Hash Price + Hash Ribbon + Confluence ════ */}
        <section>
          <div style={sectionLabelStyle}>MINER ECONOMICS</div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile
              ? '1fr'
              : isXWide ? 'repeat(12, 1fr)' : 'repeat(2, 1fr)',
            gap: isMobile ? 16 : 20,
          }}>
            <div style={{ gridColumn: isMobile ? 'auto' : isXWide ? 'span 4' : 'span 1' }}>
              <HashPriceChart
                history={data.hashPrice.history}
                breakevenHashPrice={data.hashPrice.breakevenHashPrice}
                signal={data.hashPrice.signal}
                theme={theme}
              />
            </div>
            <div style={{ gridColumn: isMobile ? 'auto' : isXWide ? 'span 4' : 'span 1' }}>
              <HashRibbonChart
                data={data.hashRibbon.data}
                signal={data.hashRibbon.signal}
                currentHashrate={data.hashRibbon.currentHashrate}
                theme={theme}
              />
            </div>
            <div style={{ gridColumn: isMobile ? 'auto' : isXWide ? 'span 4' : 'span 2' }}>
              <MiningConfluence
                hashPriceSignal={data.hashPrice.signal}
                marginPct={data.hashPrice.marginPct}
                hashRibbonSignal={data.hashRibbon.signal}
                energyPremiumPct={data.energyValue.premiumPct}
                subsidyPct={data.securityBudget.current.subsidyPct}
              />
            </div>
          </div>
        </section>

        {/* ═══ ROW 3.5 — Hashprice vs Energy-Cost Spread (full) ═ */}
        {data.regionalSpread.regions.length > 0 && (
          <section>
            <div style={sectionLabelStyle}>WHERE MINING PAYS</div>
            <HashpriceSpread
              spread={data.regionalSpread}
              joulesPerBtc={data.joulesPerBtc}
              btcPrice={data.btcPrice}
              globalAvgKwh={data.energyPrices.globalWeightedAvg}
            />
          </section>
        )}

        {/* ═══ ROW 4 — Energy Gravity (8) + Hashrate Dist (4) ══ */}
        <section>
          <div style={sectionLabelStyle}>ENERGY &amp; HASHRATE</div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile
              ? '1fr'
              : isWide ? 'repeat(12, 1fr)' : '1fr',
            gap: isMobile ? 16 : 20,
          }}>
            <div style={{ gridColumn: isMobile ? 'auto' : 'span 8' }}>
              <EnergyGravityChart
                history={data.energyGravity.history}
                currentGravityKwh={data.energyGravity.current}
                globalAvgKwh={data.energyPrices.globalWeightedAvg}
                theme={theme}
              />
            </div>
            <div style={{ gridColumn: isMobile ? 'auto' : 'span 4' }}>
              <HashrateDistribution
                regions={data.hashrateGeo.regions.slice(0, 5)}
                totalHashrateEH={data.hashrateGeo.totalHashrateEH}
                alerts={data.geoAlerts.slice(0, 2)}
                updatedAt={data.hashrateGeo.updatedAt}
              />
            </div>
          </div>
        </section>

        {/* ═══ ROW 5 — Security Outlook (full width, own heading) ═ */}
        <section>
          <SecurityOutlook
            editorial={data.editorial}
            current={data.securityBudget.current}
            nextHalving={nextHalving}
            projections={data.securityBudget.base}
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
