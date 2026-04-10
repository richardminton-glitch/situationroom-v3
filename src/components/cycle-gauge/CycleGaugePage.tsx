'use client';

import type { CycleGaugeResponse } from '@/app/api/cycle-gauge/route';
import { HeroGauge }          from './HeroGauge';
import { IndicatorGrid }      from './IndicatorGrid';
import { ConfidenceDisplay }  from './ConfidenceDisplay';
import { HistoricalAnalogues } from './HistoricalAnalogues';

interface Props {
  data:    CycleGaugeResponse | null;
  loading: boolean;
  error:   string | null;
}

const FONT = "'JetBrains Mono', 'IBM Plex Mono', 'SF Mono', monospace";

function formatPrice(price: number): string {
  return `$${price.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}

function formatTimestamp(ts: string): string {
  try {
    return new Date(ts).toLocaleString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit', timeZoneName: 'short',
    });
  } catch {
    return ts;
  }
}

function Divider() {
  return (
    <div style={{ height: 1, background: 'rgba(255,255,255,0.05)', margin: '4px 0' }} />
  );
}

export function CycleGaugePage({ data, loading, error }: Props) {
  // Loading state
  if (loading) {
    return (
      <div style={{
        height:          '100%',
        display:         'flex',
        alignItems:      'center',
        justifyContent:  'center',
        backgroundColor: '#090d12',
        fontFamily:      FONT,
      }}>
        <p style={{ color: '#6b7a8d', fontSize: 11, letterSpacing: '0.14em' }}>
          COMPUTING CYCLE POSITION...
        </p>
      </div>
    );
  }

  // Error state
  if (error || !data) {
    return (
      <div style={{
        height:          '100%',
        display:         'flex',
        alignItems:      'center',
        justifyContent:  'center',
        backgroundColor: '#090d12',
        fontFamily:      FONT,
      }}>
        <p style={{ color: '#d06050', fontSize: 11, letterSpacing: '0.14em' }}>
          CYCLE DATA ERROR — {error ?? 'No data available'}
        </p>
      </div>
    );
  }

  return (
    <div style={{
      minHeight:       '100%',
      backgroundColor: '#090d12',
      fontFamily:      FONT,
      overflowY:       'auto',
    }}>
      <div style={{
        maxWidth:  900,
        margin:    '0 auto',
        padding:   '24px 32px 48px',
        display:   'flex',
        flexDirection: 'column',
        gap:       24,
      }}>

        {/* Page header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
          <div>
            <p style={{ fontSize: 9, letterSpacing: '0.18em', color: 'rgba(200,220,218,0.4)', margin: 0, marginBottom: 4 }}>
              SITUATION ROOM
            </p>
            <h1 style={{ fontSize: 18, color: '#e8edf2', margin: 0, fontWeight: 600, letterSpacing: '0.06em' }}>
              CYCLE POSITION GAUGE
            </h1>
          </div>
          <div style={{ textAlign: 'right' }}>
            {data.btcPrice > 0 && (
              <div style={{ fontSize: 16, color: '#e8edf2', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                {formatPrice(data.btcPrice)}
              </div>
            )}
            <div style={{ fontSize: 9, color: 'rgba(200,220,218,0.35)', letterSpacing: '0.08em', marginTop: 2 }}>
              {formatTimestamp(data.timestamp)}
            </div>
          </div>
        </div>

        <Divider />

        {/* Hero gauge */}
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <HeroGauge
            composite={data.composite}
            phase={data.phase}
            phaseColor={data.phaseColor}
            confidence={data.confidence}
          />
        </div>

        <Divider />

        {/* Indicator grid */}
        <div>
          <p style={{ fontSize: 9, letterSpacing: '0.14em', color: 'rgba(200,220,218,0.35)', margin: '0 0 12px', textTransform: 'uppercase' }}>
            Signal Breakdown
          </p>
          <IndicatorGrid indicators={data.indicators} />
        </div>

        <Divider />

        {/* Confidence display */}
        <ConfidenceDisplay confidence={data.confidence} indicators={data.indicators} />

        <Divider />

        {/* Historical analogues */}
        <HistoricalAnalogues />

        {/* Footer */}
        <div style={{
          paddingTop:    16,
          borderTop:     '1px solid rgba(255,255,255,0.04)',
          fontSize:      9,
          color:         'rgba(200,220,218,0.25)',
          letterSpacing: '0.08em',
          lineHeight:    1.8,
        }}>
          <p style={{ margin: 0 }}>
            SOURCES — MVRV &amp; REALISED PRICE: CoinMetrics Community API · PUELL MULTIPLE: bitview.space ·
            PI CYCLE &amp; RAINBOW: CoinGecko price history · HISTORICAL ANALOGUES: xAI Grok (weekly)
          </p>
          <p style={{ margin: '4px 0 0' }}>
            NOT FINANCIAL ADVICE. Composite indicators are for informational purposes only.
          </p>
        </div>

      </div>
    </div>
  );
}
