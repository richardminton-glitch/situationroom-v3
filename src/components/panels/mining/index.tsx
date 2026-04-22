'use client';

/**
 * Mining dashboard panels — thin wrappers around the components in
 * src/components/mining/* so they can be dragged into custom dashboards.
 *
 * Every panel pulls from the shared useMiningIntel() hook, so loading state
 * and data refresh happen once per session for the whole mining bundle.
 */

import { useTheme } from '@/components/layout/ThemeProvider';
import { PanelLoading } from '@/components/panels/shared';
import { useMiningIntel } from '@/hooks/useMiningIntel';

import { MinerProfitHero }       from '@/components/mining/MinerProfitHero';
import { HashPriceChart }        from '@/components/mining/HashPriceChart';
import { HashRibbonChart }       from '@/components/mining/HashRibbonChart';
import { EnergyGravityChart }    from '@/components/mining/EnergyGravityChart';
import { MiningConfluence }      from '@/components/mining/MiningConfluence';
import { HashrateDistribution }  from '@/components/mining/HashrateDistribution';
import { SecurityOutlook }       from '@/components/mining/SecurityOutlook';
import { MinerTreasuryStress }   from '@/components/mining/MinerTreasuryStress';
import { HashpriceSpread }       from '@/components/mining/HashpriceSpread';

function PanelError({ msg }: { msg: string }) {
  return (
    <div style={{
      fontFamily: 'var(--font-mono)', fontSize: 11,
      color: 'var(--text-muted)', padding: 12,
    }}>
      {msg}
    </div>
  );
}

function Wrap({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      width: '100%', height: '100%', overflow: 'auto',
      padding: 12, boxSizing: 'border-box',
    }}>
      {children}
    </div>
  );
}

export function MinerProfitPanel() {
  const { data, loading, error } = useMiningIntel();
  if (loading) return <PanelLoading />;
  if (error || !data) return <PanelError msg="Mining data unavailable" />;
  return (
    <Wrap>
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
    </Wrap>
  );
}

export function HashPricePanel() {
  const { theme } = useTheme();
  const { data, loading, error } = useMiningIntel();
  if (loading) return <PanelLoading />;
  if (error || !data) return <PanelError msg="Hash price data unavailable" />;
  return (
    <div style={{ width: '100%', height: '100%', padding: 8, boxSizing: 'border-box' }}>
      <HashPriceChart
        history={data.hashPrice.history}
        breakevenHashPrice={data.hashPrice.breakevenHashPrice}
        signal={data.hashPrice.signal}
        theme={theme}
      />
    </div>
  );
}

export function HashRibbonMinerPanel() {
  const { theme } = useTheme();
  const { data, loading, error } = useMiningIntel();
  if (loading) return <PanelLoading />;
  if (error || !data) return <PanelError msg="Hash ribbon unavailable" />;
  return (
    <div style={{ width: '100%', height: '100%', padding: 8, boxSizing: 'border-box' }}>
      <HashRibbonChart
        data={data.hashRibbon.data}
        signal={data.hashRibbon.signal}
        currentHashrate={data.hashRibbon.currentHashrate}
        theme={theme}
      />
    </div>
  );
}

export function EnergyGravityPanel() {
  const { theme } = useTheme();
  const { data, loading, error } = useMiningIntel();
  if (loading) return <PanelLoading />;
  if (error || !data) return <PanelError msg="Energy gravity unavailable" />;
  return (
    <div style={{ width: '100%', height: '100%', padding: 8, boxSizing: 'border-box' }}>
      <EnergyGravityChart
        history={data.energyGravity.history}
        currentGravityKwh={data.energyGravity.current}
        globalAvgKwh={data.energyPrices.globalWeightedAvg}
        theme={theme}
      />
    </div>
  );
}

export function MiningConfluencePanel() {
  const { data, loading, error } = useMiningIntel();
  if (loading) return <PanelLoading />;
  if (error || !data) return <PanelError msg="Confluence unavailable" />;
  return (
    <Wrap>
      <MiningConfluence
        hashPriceSignal={data.hashPrice.signal}
        marginPct={data.hashPrice.marginPct}
        hashRibbonSignal={data.hashRibbon.signal}
        energyPremiumPct={data.energyValue.premiumPct}
        subsidyPct={data.securityBudget.current.subsidyPct}
      />
    </Wrap>
  );
}

export function HashrateDistributionPanel() {
  const { data, loading, error } = useMiningIntel();
  if (loading) return <PanelLoading />;
  if (error || !data) return <PanelError msg="Hashrate distribution unavailable" />;
  return (
    <Wrap>
      <HashrateDistribution
        regions={data.hashrateGeo.regions.slice(0, 5)}
        totalHashrateEH={data.hashrateGeo.totalHashrateEH}
        alerts={data.geoAlerts.slice(0, 2)}
        updatedAt={data.hashrateGeo.updatedAt}
      />
    </Wrap>
  );
}

export function SecurityOutlookPanel() {
  const { data, loading, error } = useMiningIntel();
  if (loading) return <PanelLoading />;
  if (error || !data) return <PanelError msg="Security outlook unavailable" />;
  const nextHalving = data.securityBudget.base.find(p => p.year === 2028) ?? null;
  return (
    <Wrap>
      <SecurityOutlook
        editorial={data.editorial}
        current={data.securityBudget.current}
        nextHalving={nextHalving}
        energyValueFair={data.energyValue.fairValue}
        energyValuePremiumPct={data.energyValue.premiumPct}
        fleetEfficiency={data.energyValue.fleetEfficiency}
        btcPrice={data.btcPrice}
      />
    </Wrap>
  );
}

export function HashpriceSpreadPanel() {
  const { data, loading, error } = useMiningIntel();
  if (loading) return <PanelLoading />;
  if (error || !data || !data.regionalSpread.regions.length) {
    return <PanelError msg="Hashprice spread unavailable" />;
  }
  return (
    <div style={{ width: '100%', height: '100%' }}>
      <HashpriceSpread
        spread={data.regionalSpread}
        joulesPerBtc={data.joulesPerBtc}
        btcPrice={data.btcPrice}
        globalAvgKwh={data.energyPrices.globalWeightedAvg}
      />
    </div>
  );
}

export function MinerTreasuryPanel() {
  const { data, loading, error } = useMiningIntel();
  if (loading) return <PanelLoading />;
  if (error || !data || !data.minerTreasuries.miners.length) {
    return <PanelError msg="Miner treasury data unavailable" />;
  }
  return (
    <div style={{ width: '100%', height: '100%' }}>
      <MinerTreasuryStress data={data.minerTreasuries} />
    </div>
  );
}
