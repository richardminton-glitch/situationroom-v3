'use client';

import { useState, useEffect } from 'react';
import type { BtcSignalResponse } from '@/app/api/btc-signal/route';
import { useTheme }        from '@/components/layout/ThemeProvider';
import { useIsMobile }     from '@/hooks/useIsMobile';
import { PageHeader }      from './PageHeader';
import { HeroSignal }      from './HeroSignal';
import { SignalGrid }      from './SignalGrid';
import { ConfluenceBar }   from './ConfluenceBar';
import { SignalChart }     from './SignalChart';
import { SignalHistory }   from './SignalHistory';
import { ReturnsSummary }  from './ReturnsSummary';
import { StackingChart }   from './StackingChart';
import { DCAOutSection }   from './DCAOutSection';
import { SignalEmailSignup } from './SignalEmailSignup';

const FONT    = "'JetBrains Mono', 'IBM Plex Mono', 'SF Mono', monospace";
const LS_BASE = 'sr-dca-base-amount';

interface Props {
  data:    BtcSignalResponse | null;
  loading: boolean;
  error:   string | null;
}

export function DCASignalPage({ data, loading, error }: Props) {
  const { theme } = useTheme();
  const isDark = theme !== 'parchment';
  const isMobile = useIsMobile();

  // Single shared base amount — drives HeroSignal, ReturnsSummary, StackingChart, DCAOutSection
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

  function handleBaseAmountChange(n: number) {
    setBaseAmount(n);
    try { localStorage.setItem(LS_BASE, String(n)); } catch { /* noop */ }
  }

  // ── Loading state ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{
        height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
        backgroundColor: 'var(--bg-primary)', fontFamily: FONT,
      }}>
        <p style={{ color: 'var(--text-secondary)', fontSize: 13, letterSpacing: '0.16em' }}>COMPUTING SIGNALS...</p>
      </div>
    );
  }

  // ── Error state ────────────────────────────────────────────────────────────
  if (error || !data) {
    return (
      <div style={{
        height: '100%', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        backgroundColor: 'var(--bg-primary)', fontFamily: FONT, gap: 8,
      }}>
        <p style={{ color: isDark ? '#d06050' : '#9b3232', fontSize: 13, letterSpacing: '0.14em' }}>SIGNAL ERROR</p>
        <p style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{error ?? 'No data returned'}</p>
      </div>
    );
  }

  return (
    <div style={{
      height:          '100%',
      overflowY:       'auto',
      backgroundColor: 'var(--bg-primary)',
      fontFamily:      FONT,
      color:           'var(--text-primary)',
      padding:         isMobile ? '16px 12px' : '24px 32px',
      display:         'flex',
      flexDirection:   'column',
      gap:             24,
    }}>

      {/* Top bar — price + date + last updated */}
      <PageHeader btcPrice={data.btcPrice} timestamp={data.timestamp} />

      {/* Hero — large composite number, frequency toggle, base input, recommended buy */}
      <HeroSignal
        composite={data.composite}
        tier={data.tier}
        baseAmount={baseAmount}
        onBaseAmountChange={handleBaseAmountChange}
      />

      {/* Signal grid + confluence bar */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 16 }}>
        <SignalGrid data={data} />
        <ConfluenceBar maMult={data.maMult} puellMult={data.puellMult} />
      </div>

      {/* Returns vs vanilla DCA — scales with baseAmount */}
      {data.backtestSummary && data.backtestSummary.length > 0 && (
        <ReturnsSummary
          backtestSummary={data.backtestSummary}
          btcPrice={data.btcPrice}
          baseAmount={baseAmount}
        />
      )}

      {/* 12-month signal chart */}
      <SignalChart chartData={data.chartData} />

      {/* BTC stacking chart — signal vs vanilla, scales with baseAmount */}
      {data.stackingHistory && data.stackingHistory.length > 0 && (
        <StackingChart stackingHistory={data.stackingHistory} baseAmount={baseAmount} />
      )}

      {/* Weekly signal history */}
      <SignalHistory data={data} />

      {/* Email signup — last general-tier item; everything below is VIP */}
      <SignalEmailSignup baseAmount={baseAmount} />

      {/* DCA Exit Strategy — VIP gated, scales with baseAmount */}
      <DCAOutSection data={data} baseAmount={baseAmount} />

      {/* Footer */}
      <div style={{
        paddingTop: 8, paddingBottom: 16,
        borderTop:  '1px solid var(--border-subtle)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16,
      }}>
        <span style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.1em' }}>
          DATA: COINGECKO · BITVIEW.SPACE
        </span>
        <span style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.1em' }}>
          NOT FINANCIAL ADVICE
        </span>
        <span style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.1em' }}>
          ENGINE V3 · 200W MA + PUELL MULTIPLE
        </span>
      </div>

    </div>
  );
}
