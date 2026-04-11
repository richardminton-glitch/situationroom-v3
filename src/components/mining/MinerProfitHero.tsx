'use client';

import { useTheme } from '@/components/layout/ThemeProvider';

const MONO = "'JetBrains Mono', 'IBM Plex Mono', 'SF Mono', monospace";

interface Props {
  marginPct: number;
  signal: 'profitable' | 'marginal' | 'unprofitable';
  hashPrice: number;
  breakevenHashPrice: number;
  breakevenBtcPrice: number;
  btcPrice: number;
  hashrateEH: number;
  energyValueFair: number;
  energyValuePremiumPct: number;
  globalWeightedAvg: number;
  efficientMinerJPerTH: number;
  timestamp: string;
}

function getSignalColour(signal: Props['signal'], isDark: boolean): string {
  if (signal === 'profitable') return isDark ? '#2dd4bf' : '#4a7c59';
  if (signal === 'marginal') return isDark ? '#c4885a' : '#b8860b';
  return isDark ? '#d06050' : '#9b3232';
}

function getSignalLabel(signal: Props['signal']): string {
  if (signal === 'profitable') return 'PROFITABLE';
  if (signal === 'marginal') return 'MARGINAL';
  return 'UNPROFITABLE';
}

function formatDate(ts: string): string {
  const d = new Date(ts);
  const months = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
  return `${d.getUTCDate()} ${months[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

function formatTime(ts: string): string {
  const d = new Date(ts);
  const hh = String(d.getUTCHours()).padStart(2, '0');
  const mm = String(d.getUTCMinutes()).padStart(2, '0');
  return `Updated ${hh}:${mm} UTC`;
}

export function MinerProfitHero({
  marginPct,
  signal,
  hashPrice,
  breakevenHashPrice,
  breakevenBtcPrice,
  btcPrice,
  hashrateEH,
  energyValueFair,
  energyValuePremiumPct,
  globalWeightedAvg,
  efficientMinerJPerTH,
  timestamp,
}: Props) {
  const { theme } = useTheme();
  const isDark = theme !== 'parchment';
  const colour = getSignalColour(signal, isDark);

  const sign = marginPct >= 0 ? '+' : '';
  const heroText = `${sign}${marginPct.toFixed(1)}%`;

  const premiumLabel = energyValuePremiumPct >= 0
    ? `+${energyValuePremiumPct.toFixed(0)}% vs spot`
    : `${energyValuePremiumPct.toFixed(0)}% vs spot`;

  const metrics = [
    {
      label: 'HASH PRICE',
      value: `$${hashPrice.toFixed(4)}`,
      sub: '/TH/day',
    },
    {
      label: 'ENERGY VALUE',
      value: `$${energyValueFair.toLocaleString('en-US', { maximumFractionDigits: 0 })}`,
      sub: premiumLabel,
    },
    {
      label: 'BREAKEVEN',
      value: `$${breakevenHashPrice.toFixed(4)}`,
      sub: '/TH/day',
    },
    {
      label: 'BTC FLOOR',
      value: `$${breakevenBtcPrice.toLocaleString('en-US', { maximumFractionDigits: 0 })}`,
      sub: '',
    },
    {
      label: 'HASHRATE',
      value: `${hashrateEH.toFixed(1)} EH/s`,
      sub: '',
    },
  ];

  return (
    <div style={{ width: '100%' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          paddingBottom: 8,
          borderBottom: '1px solid var(--border-primary)',
        }}
      >
        <div>
          <div
            style={{
              fontFamily: MONO,
              fontSize: 9,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: 'var(--text-muted)',
              marginBottom: 2,
            }}
          >
            SITUATION ROOM
          </div>
          <div
            style={{
              fontFamily: 'var(--font-heading)',
              fontSize: 20,
              fontWeight: 700,
              color: 'var(--text-primary)',
              lineHeight: 1.1,
            }}
          >
            Energy &amp; Mining Intelligence
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div
            style={{
              fontFamily: MONO,
              fontSize: 10,
              color: 'var(--text-muted)',
            }}
          >
            {formatDate(timestamp)}
          </div>
          <div
            style={{
              fontFamily: MONO,
              fontSize: 10,
              color: 'var(--text-muted)',
            }}
          >
            {formatTime(timestamp)}
          </div>
        </div>
      </div>

      {/* Hero number */}
      <div style={{ padding: '18px 0 14px 0' }}>
        <div
          style={{
            fontFamily: 'var(--font-data)',
            fontSize: 52,
            fontWeight: 700,
            fontVariantNumeric: 'tabular-nums',
            color: colour,
            lineHeight: 1,
          }}
        >
          {heroText}
        </div>
        <div
          style={{
            fontFamily: MONO,
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: colour,
            marginTop: 4,
          }}
        >
          {getSignalLabel(signal)}
        </div>
        <div
          style={{
            fontFamily: MONO,
            fontSize: 11,
            color: 'var(--text-muted)',
            marginTop: 6,
          }}
        >
          Hash price ${hashPrice.toFixed(4)} vs ${breakevenHashPrice.toFixed(4)} breakeven at ${globalWeightedAvg.toFixed(2)}/kWh
        </div>
      </div>

      {/* Metrics tape */}
      <div
        style={{
          borderTop: '1px solid var(--border-subtle)',
          borderBottom: '1px solid var(--border-subtle)',
          padding: '10px 0',
          display: 'flex',
          flexWrap: 'wrap',
          gap: 0,
        }}
      >
        {metrics.map((m, i) => (
          <div
            key={m.label}
            style={{
              flex: '1 1 0',
              minWidth: 0,
              display: 'flex',
              flexDirection: 'column',
              borderLeft: i > 0 ? '1px solid var(--border-subtle)' : 'none',
              paddingLeft: i > 0 ? 12 : 0,
              paddingRight: 12,
            }}
          >
            <div
              style={{
                fontFamily: MONO,
                fontSize: 8,
                fontWeight: 600,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: 'var(--text-muted)',
                marginBottom: 3,
              }}
            >
              {m.label}
            </div>
            <div
              style={{
                fontFamily: 'var(--font-data)',
                fontSize: 14,
                fontWeight: 700,
                fontVariantNumeric: 'tabular-nums',
                color: 'var(--text-primary)',
                lineHeight: 1.2,
              }}
            >
              {m.value}
            </div>
            {m.sub && (
              <div
                style={{
                  fontFamily: MONO,
                  fontSize: 9,
                  color: 'var(--text-muted)',
                  marginTop: 1,
                }}
              >
                {m.sub}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
