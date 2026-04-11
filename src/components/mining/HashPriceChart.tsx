'use client';

import { useMemo } from 'react';
import { useTheme } from '@/components/layout/ThemeProvider';
import { ParchmentChart } from '@/components/panels/charts/ParchmentChart';

interface Props {
  history: { date: string; hashPrice: number; btcPrice: number }[];
  breakevenHashPrice: number;
  signal: 'profitable' | 'marginal' | 'unprofitable';
  theme: string;
}

function getSignalHex(signal: Props['signal'], isDark: boolean): string {
  if (signal === 'profitable') return isDark ? '#2dd4bf' : '#4a7c59';
  if (signal === 'marginal') return isDark ? '#c4885a' : '#b8860b';
  return isDark ? '#d06050' : '#9b3232';
}

export function HashPriceChart({ history, breakevenHashPrice, signal, theme }: Props) {
  const { theme: currentTheme } = useTheme();
  const isDark = (theme || currentTheme) !== 'parchment';

  const data = useMemo(
    () =>
      history.map((d) => ({
        time: Date.parse(d.date),
        value: d.hashPrice,
      })),
    [history],
  );

  const color = getSignalHex(signal, isDark);

  const refLines = useMemo(
    () => [{ value: breakevenHashPrice, label: 'Breakeven' }],
    [breakevenHashPrice],
  );

  const yFormat = (v: number) => '$' + v.toFixed(3);

  return (
    <div style={{ height: 200, position: 'relative' }}>
      <ParchmentChart
        data={data}
        title="HASH PRICE — 120 DAY"
        color={color}
        theme={theme}
        yFormat={yFormat}
        refLines={refLines}
      />
    </div>
  );
}
