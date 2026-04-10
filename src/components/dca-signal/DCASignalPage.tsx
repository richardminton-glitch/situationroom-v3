'use client';

import { useState, useEffect } from 'react';
import type { BtcSignalResponse } from '@/app/api/btc-signal/route';
import { PageHeader }      from './PageHeader';
import { HeroSignal }      from './HeroSignal';
import { SignalGrid }      from './SignalGrid';
import { ConfluenceBar }   from './ConfluenceBar';
import { SignalChart }     from './SignalChart';
import { SignalHistory }   from './SignalHistory';
import { ReturnsSummary }  from './ReturnsSummary';
import { SignalEmailSignup } from './SignalEmailSignup';

const FONT       = "'JetBrains Mono', 'IBM Plex Mono', 'SF Mono', monospace";
const LS_BASE    = 'sr-dca-base-amount';

interface Props {
  data:    BtcSignalResponse | null;
  loading: boolean;
  error:   string | null;
}

export function DCASignalPage({ data, loading, error }: Props) {
  // Read baseAmount here so ReturnsSummary and SignalEmailSignup can share it
  const [baseAmount, setBaseAmount] = useState(100);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(LS_BASE);
      if (stored) {
        const n = parseInt(stored, 10);
        if (!isNaN(n) && n > 0) setBaseAmount(n);
      }
    } catch { /* SSR */ }
  }, []);

  // Loading state
  if (loading) {
    return (
      <div style={{
        height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
        backgroundColor: '#090d12', fontFamily: FONT,
      }}>
        <p style={{ color: '#6b7a8d', fontSize: 11, letterSpacing: '0.16em' }}>COMPUTING SIGNALS...</p>
      </div>
    );
  }

  // Error state
  if (error || !data) {
    return (
      <div style={{
        height: '100%', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        backgroundColor: '#090d12', fontFamily: FONT, gap: 8,
      }}>
        <p style={{ color: '#d06050', fontSize: 11, letterSpacing: '0.14em' }}>SIGNAL ERROR</p>
        <p style={{ color: '#6b7a8d', fontSize: 10 }}>{error ?? 'No data returned'}</p>
      </div>
    );
  }

  return (
    <div style={{
      height:        '100%',
      overflowY:     'auto',
      backgroundColor: '#090d12',
      fontFamily:    FONT,
      color:         '#e8edf2',
      padding:       '24px 32px',
      display:       'flex',
      flexDirection: 'column',
      gap:           24,
    }}>

      {/* Top bar — price + date + last updated */}
      <PageHeader btcPrice={data.btcPrice} timestamp={data.timestamp} />

      {/* Hero — large composite number, frequency toggle, base input, recommended buy */}
      <HeroSignal composite={data.composite} tier={data.tier} />

      {/* Signal grid + confluence bar */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <SignalGrid data={data} />
        <ConfluenceBar maMult={data.maMult} puellMult={data.puellMult} />
      </div>

      {/* Returns vs vanilla DCA */}
      {data.backtestSummary && data.backtestSummary.length > 0 && (
        <ReturnsSummary
          backtestSummary={data.backtestSummary}
          btcPrice={data.btcPrice}
          baseAmount={baseAmount}
        />
      )}

      {/* 12-month chart */}
      <SignalChart chartData={data.chartData} />

      {/* Weekly signal history table */}
      <SignalHistory data={data} />

      {/* Email signup */}
      <SignalEmailSignup baseAmount={baseAmount} />

      {/* Footer */}
      <div style={{
        paddingTop: 8, paddingBottom: 16,
        borderTop: '1px solid rgba(255,255,255,0.06)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16,
      }}>
        <span style={{ fontSize: 9, color: '#4a5568', letterSpacing: '0.1em' }}>
          DATA: COINGECKO · BITVIEW.SPACE
        </span>
        <span style={{ fontSize: 9, color: '#4a5568', letterSpacing: '0.1em' }}>
          NOT FINANCIAL ADVICE
        </span>
        <span style={{ fontSize: 9, color: '#4a5568', letterSpacing: '0.1em' }}>
          ENGINE V3 · 200W MA + PUELL MULTIPLE
        </span>
      </div>

    </div>
  );
}
