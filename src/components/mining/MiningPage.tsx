'use client';

import { useTheme } from '@/components/layout/ThemeProvider';
import { DataRow, formatPrice, formatLargeNumber } from '@/components/panels/shared';
import type { MiningIntelResponse } from '@/app/api/mining-intel/route';
import HashrateGeoSection from './HashrateGeoSection';
import GeoShiftAlerts from './GeoShiftAlerts';
import HashPriceSection from './HashPriceSection';
import { GasMiningSection } from './GasMiningSection';
import { SecurityBudgetSection } from './SecurityBudgetSection';
import { EditorialSection } from './EditorialSection';

const FONT = "'JetBrains Mono', 'IBM Plex Mono', 'SF Mono', monospace";

interface Props {
  data: MiningIntelResponse | null;
  loading: boolean;
  error: string | null;
}

export function MiningPage({ data, loading, error }: Props) {
  const { theme } = useTheme();
  const isDark = theme !== 'parchment';

  if (loading) {
    return (
      <div style={{
        height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: FONT, fontSize: 12, color: 'var(--text-muted)', letterSpacing: '0.1em',
      }}>
        LOADING MINING INTELLIGENCE...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        height: '100%', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', fontFamily: FONT, gap: 8,
      }}>
        <div style={{ fontSize: 13, color: isDark ? '#d06050' : '#9b3232', fontWeight: 600 }}>DATA ERROR</div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{error}</div>
      </div>
    );
  }

  if (!data) return null;

  const hrStyle: React.CSSProperties = {
    border: 'none',
    borderTop: '1px solid var(--border-subtle)',
    margin: 0,
  };

  return (
    <div style={{
      height: '100%', overflowY: 'auto', backgroundColor: 'var(--bg-primary)',
      fontFamily: FONT, color: 'var(--text-primary)',
      padding: '24px 32px 48px', display: 'flex', flexDirection: 'column', gap: 32,
      maxWidth: 1080, margin: '0 auto', width: '100%',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{
            fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.18em',
            color: 'var(--text-muted)', marginBottom: 6, fontFamily: FONT,
          }}>
            ENERGY & MINING INTELLIGENCE
          </div>
          <div style={{ fontFamily: 'var(--font-heading)', fontSize: 22, color: 'var(--text-primary)' }}>
            Mining Intelligence
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end' }}>
          <DataRow label="BTC Price" value={`$${formatPrice(data.btcPrice)}`} />
          <DataRow label="Hashrate" value={`${data.hashrateEH.toFixed(1)} EH/s`} />
          <DataRow label="Difficulty" value={`${data.difficultyT.toFixed(2)} T`} />
        </div>
      </div>

      {/* Section 1: Hashrate Geography */}
      <hr style={hrStyle} />
      <HashrateGeoSection
        regions={data.hashrateGeo.regions}
        totalHashrateEH={data.hashrateGeo.totalHashrateEH}
        updatedAt={data.hashrateGeo.updatedAt}
        energyPrices={data.energyPrices.regions}
      />

      {/* Section 2: Geo Shift Alerts */}
      <hr style={hrStyle} />
      <GeoShiftAlerts alerts={data.geoAlerts} />

      {/* Section 3: Hash Price vs Energy */}
      <hr style={hrStyle} />
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

      {/* Section 4: Stranded Gas Mining */}
      <hr style={hrStyle} />
      <GasMiningSection
        projects={data.gasMining.projects}
        narrativeHook={data.gasMining.narrativeHook}
        stats={data.gasMining.stats}
        flareSites={data.flareSites}
      />

      {/* Section 5: Security Budget */}
      <hr style={hrStyle} />
      <SecurityBudgetSection
        current={data.securityBudget.current}
        conservative={data.securityBudget.conservative}
        base={data.securityBudget.base}
        optimistic={data.securityBudget.optimistic}
        btcPrice={data.btcPrice}
      />

      {/* Section 6: Editorial */}
      <hr style={hrStyle} />
      <EditorialSection
        title={data.editorial.title}
        body={data.editorial.body}
        updatedAt={data.editorial.updatedAt}
      />
    </div>
  );
}
