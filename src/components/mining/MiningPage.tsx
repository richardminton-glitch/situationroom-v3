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

const FONT = "'JetBrains Mono', 'IBM Plex Mono', 'SF Mono', monospace";

interface Props {
  data: MiningIntelResponse | null;
  loading: boolean;
  error: string | null;
}

/* ── Hero metric card ─────────────────────────────────────────────────────── */

function MetricCard({ label, value, sub, subColor }: {
  label: string; value: string; sub?: string; subColor?: string;
}) {
  return (
    <div style={{
      padding: '14px 16px',
      border: '1px solid var(--border-subtle)',
      backgroundColor: 'var(--bg-card)',
      display: 'flex', flexDirection: 'column', gap: 4,
      minWidth: 0,
    }}>
      <div style={{
        fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.12em',
        color: 'var(--text-muted)', fontFamily: FONT, whiteSpace: 'nowrap',
      }}>{label}</div>
      <div style={{
        fontSize: 20, fontWeight: 600, color: 'var(--text-primary)',
        fontFamily: FONT, letterSpacing: '-0.01em',
        fontVariantNumeric: 'tabular-nums',
      }}>{value}</div>
      {sub && (
        <div style={{
          fontSize: 11, color: subColor || 'var(--text-muted)',
          fontFamily: FONT, fontVariantNumeric: 'tabular-nums',
        }}>{sub}</div>
      )}
    </div>
  );
}

/* ── Signal badge ─────────────────────────────────────────────────────────── */

function signalBadge(signal: string, isDark: boolean): { text: string; color: string } {
  if (signal === 'profitable') return { text: 'PROFITABLE', color: isDark ? '#2dd4bf' : '#4a7c59' };
  if (signal === 'marginal') return { text: 'MARGINAL', color: '#f59e0b' };
  return { text: 'UNPROFITABLE', color: isDark ? '#d06050' : '#9b3232' };
}

/* ── Section divider ──────────────────────────────────────────────────────── */

function Divider() {
  return <div style={{ borderBottom: '1px solid var(--border-subtle)' }} />;
}

/* ── Main page ────────────────────────────────────────────────────────────── */

export function MiningPage({ data, loading, error }: Props) {
  const { theme } = useTheme();
  const isDark = theme !== 'parchment';

  if (loading) {
    return (
      <div style={{
        height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
        backgroundColor: 'var(--bg-primary)', fontFamily: FONT,
      }}>
        <span style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.14em' }}>
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
        backgroundColor: 'var(--bg-primary)', fontFamily: FONT, gap: 8,
      }}>
        <div style={{ fontSize: 13, color: isDark ? '#d06050' : '#9b3232', fontWeight: 600, letterSpacing: '0.1em' }}>
          DATA ERROR
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{error ?? 'No data returned'}</div>
      </div>
    );
  }

  const sig = signalBadge(data.hashPrice.signal, isDark);
  const dailyBudget = data.securityBudget.current.dailyTotalUsd;
  const subsidyPct = data.securityBudget.current.subsidyPct;

  return (
    <div style={{
      height: '100%', overflowY: 'auto', backgroundColor: 'var(--bg-primary)',
      fontFamily: FONT, color: 'var(--text-primary)',
    }}>
      <div style={{
        maxWidth: 960, margin: '0 auto', width: '100%',
        padding: '24px 32px 48px',
        display: 'flex', flexDirection: 'column', gap: 24,
      }}>

        {/* ── Header ──────────────────────────────────────────────── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            <div style={{
              fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.18em',
              color: 'var(--text-muted)', marginBottom: 4,
            }}>SITUATION ROOM</div>
            <div style={{
              fontSize: 18, fontWeight: 600, letterSpacing: '0.06em',
              color: 'var(--text-primary)',
            }}>ENERGY & MINING INTELLIGENCE</div>
          </div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', textAlign: 'right' }}>
            <div>{new Date(data.timestamp).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
            <div style={{ marginTop: 2 }}>Updated {new Date(data.timestamp).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })} UTC</div>
          </div>
        </div>

        {/* ── Hero Metric Strip ────────────────────────────────────── */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(155px, 1fr))',
          gap: 12,
        }}>
          <MetricCard
            label="Network Hashrate"
            value={`${data.hashrateEH.toFixed(1)} EH/s`}
          />
          <MetricCard
            label="Hash Price"
            value={`$${data.hashPrice.current.toFixed(4)}`}
            sub={sig.text}
            subColor={sig.color}
          />
          <MetricCard
            label="Difficulty"
            value={`${data.difficultyT.toFixed(1)} T`}
          />
          <MetricCard
            label="Security Budget"
            value={`$${formatLargeNumber(dailyBudget)}/d`}
            sub={`${subsidyPct.toFixed(0)}% subsidy`}
          />
          <MetricCard
            label="BTC Price"
            value={`$${formatPrice(data.btcPrice, 0)}`}
          />
        </div>

        {/* ── Hashrate Geography ───────────────────────────────────── */}
        <Divider />
        <HashrateGeoSection
          regions={data.hashrateGeo.regions}
          totalHashrateEH={data.hashrateGeo.totalHashrateEH}
          updatedAt={data.hashrateGeo.updatedAt}
          energyPrices={data.energyPrices.regions}
        />

        {/* ── Geo Shift Alerts ─────────────────────────────────────── */}
        <Divider />
        <GeoShiftAlerts alerts={data.geoAlerts} />

        {/* ── Miner Economics ──────────────────────────────────────── */}
        <Divider />
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

        {/* ── Stranded Energy ──────────────────────────────────────── */}
        <Divider />
        <GasMiningSection
          projects={data.gasMining.projects}
          narrativeHook={data.gasMining.narrativeHook}
          stats={data.gasMining.stats}
          flareSites={data.flareSites}
        />

        {/* ── Security Budget ──────────────────────────────────────── */}
        <Divider />
        <SecurityBudgetSection
          current={data.securityBudget.current}
          conservative={data.securityBudget.conservative}
          base={data.securityBudget.base}
          optimistic={data.securityBudget.optimistic}
          btcPrice={data.btcPrice}
        />

        {/* ── Editorial ────────────────────────────────────────────── */}
        <Divider />
        <EditorialSection
          title={data.editorial.title}
          body={data.editorial.body}
          updatedAt={data.editorial.updatedAt}
        />
      </div>
    </div>
  );
}
