'use client';

import type { BtcSignalResponse } from '@/app/api/btc-signal/route';
import { SignalCard } from './SignalCard';

interface Props {
  data: BtcSignalResponse;
}

export function SignalGrid({ data }: Props) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

      <SignalCard
        label="200-WEEK MA"
        sublabel="ratio to 200-week moving average"
        value={data.maRatio.toFixed(3)}
        multiplier={data.maMult}
      />

      <SignalCard
        label="PUELL MULTIPLE"
        sublabel="miner revenue vs 1-year average"
        value={data.puellValue.toFixed(2)}
        multiplier={data.puellMult}
      />

    </div>
  );
}
