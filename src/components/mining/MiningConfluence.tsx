'use client';

import { useTheme } from '@/components/layout/ThemeProvider';

const MONO = "'JetBrains Mono', 'IBM Plex Mono', 'SF Mono', monospace";

interface Props {
  hashPriceSignal: 'profitable' | 'marginal' | 'unprofitable';
  marginPct: number;
  hashRibbonSignal: 'bullish' | 'bearish' | 'neutral';
  energyPremiumPct: number;
  subsidyPct: number;
}

type Zone = 'bull' | 'neutral' | 'bear';

export function MiningConfluence({
  hashPriceSignal,
  marginPct,
  hashRibbonSignal,
  energyPremiumPct,
  subsidyPct,
}: Props) {
  const { theme } = useTheme();
  const isDark = theme !== 'parchment';

  const colors = {
    bull: isDark ? '#2dd4bf' : '#4a7c59',
    neutral: isDark ? '#c4885a' : '#b8860b',
    bear: isDark ? '#d06050' : '#9b3232',
  };

  const signals: { name: string; zone: Zone; detail: string }[] = [
    {
      name: 'HASH PRICE',
      zone: marginPct > 20 ? 'bull' : marginPct > 0 ? 'neutral' : 'bear',
      detail: `${marginPct > 0 ? '+' : ''}${marginPct.toFixed(1)}% margin`,
    },
    {
      name: 'HASH RIBBON',
      zone:
        hashRibbonSignal === 'bullish'
          ? 'bull'
          : hashRibbonSignal === 'bearish'
            ? 'bear'
            : 'neutral',
      detail:
        hashRibbonSignal === 'bullish'
          ? '30d > 60d — recovery'
          : hashRibbonSignal === 'bearish'
            ? '30d < 60d — stress'
            : 'Neutral crossover',
    },
    {
      name: 'ENERGY VALUE',
      zone: energyPremiumPct < -10 ? 'bull' : energyPremiumPct > 20 ? 'bear' : 'neutral',
      detail: `${energyPremiumPct > 0 ? '+' : ''}${energyPremiumPct.toFixed(0)}% vs fair value`,
    },
    {
      name: 'SECURITY',
      zone: subsidyPct > 90 ? 'bull' : subsidyPct > 80 ? 'neutral' : 'bear',
      detail: `${subsidyPct.toFixed(0)}% subsidy-funded`,
    },
  ];

  const bullCount = signals.filter((s) => s.zone === 'bull').length;
  const neutralCount = signals.filter((s) => s.zone === 'neutral').length;
  const bearCount = signals.filter((s) => s.zone === 'bear').length;

  const statusText =
    bullCount === 4
      ? 'All signals aligned — strong mining position'
      : bullCount === 3
        ? 'Majority bullish — favourable conditions'
        : bullCount === 2
          ? 'Mixed signals — proceed with caution'
          : bullCount === 1
            ? 'Headwinds — miner stress indicators present'
            : 'All signals bearish — significant miner pressure';

  const statusColor =
    bullCount >= 3 ? colors.bull : bullCount === 2 ? colors.neutral : colors.bear;

  return (
    <div>
      {/* Section label */}
      <div
        style={{
          fontFamily: MONO,
          fontSize: 9,
          letterSpacing: '0.16em',
          color: 'var(--text-muted)',
          textTransform: 'uppercase',
          marginBottom: 16,
        }}
      >
        MINING CONFLUENCE
      </div>

      {/* Proportional bar */}
      <div
        style={{
          display: 'flex',
          height: 8,
          overflow: 'hidden',
          gap: 1,
          marginBottom: 10,
        }}
      >
        {bullCount > 0 && (
          <div
            style={{
              width: `${(bullCount / 4) * 100}%`,
              backgroundColor: colors.bull,
            }}
          />
        )}
        {neutralCount > 0 && (
          <div
            style={{
              width: `${(neutralCount / 4) * 100}%`,
              backgroundColor: colors.neutral,
            }}
          />
        )}
        {bearCount > 0 && (
          <div
            style={{
              width: `${(bearCount / 4) * 100}%`,
              backgroundColor: colors.bear,
            }}
          />
        )}
      </div>

      {/* Status text */}
      <div
        style={{
          fontSize: 13,
          fontWeight: 700,
          color: statusColor,
          marginBottom: 14,
        }}
      >
        {statusText}
      </div>

      {/* Signal breakdown */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {signals.map((s) => (
          <div
            key={s.name}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            {/* Coloured dot */}
            <div
              style={{
                width: 6,
                height: 6,
                backgroundColor: colors[s.zone],
                flexShrink: 0,
              }}
            />

            {/* Signal name */}
            <div
              style={{
                fontFamily: MONO,
                fontSize: 10,
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                whiteSpace: 'nowrap',
              }}
            >
              {s.name}
            </div>

            {/* Spacer */}
            <div style={{ flex: 1 }} />

            {/* Zone label */}
            <div
              style={{
                fontFamily: MONO,
                fontSize: 10,
                fontWeight: 600,
                color: colors[s.zone],
                textTransform: 'uppercase',
                marginRight: 8,
              }}
            >
              {s.zone.toUpperCase()}
            </div>

            {/* Detail text */}
            <div
              style={{
                fontSize: 10,
                color: 'var(--text-secondary)',
                fontVariantNumeric: 'tabular-nums',
                whiteSpace: 'nowrap',
              }}
            >
              {s.detail}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
