'use client';

import { useTheme } from '@/components/layout/ThemeProvider';
import CentralBankAssetChart from './CentralBankAssetChart';

export function CentralBankAssetPanel() {
  const { theme } = useTheme();
  return (
    <CentralBankAssetChart
      mode={theme === 'dark' ? 'dark' : 'parchment'}
    />
  );
}
