'use client';

import { useTheme } from '@/components/layout/ThemeProvider';
import EpochAlmanacChart from './EpochAlmanacChart';

export function EpochAlmanacPanel() {
  const { theme } = useTheme();
  return <EpochAlmanacChart mode={theme === 'dark' ? 'dark' : 'parchment'} />;
}
