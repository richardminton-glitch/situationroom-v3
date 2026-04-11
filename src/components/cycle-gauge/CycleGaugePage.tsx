'use client';

import { useTheme } from '@/components/layout/ThemeProvider';
import { HeroGauge }          from './HeroGauge';

// Inline types — do NOT import from the route file (it uses fs/path, which
// Turbopack would bundle into the client if imported from here).
interface CycleIndicatorResult {
  name: string; key: string; score: number; weight: number;
  direction: 'bullish' | 'bearish' | 'neutral';
  zone: string; rawValue: number; rawLabel: string; interpretation: string;
}
interface ConfidenceBand {
  level: string; agreementCount: number; dominantDirection: string;
}
interface CycleGaugeResponse {
  composite: number; phase: string; phaseColor: string;
  btcPrice: number; mvrv: number | null; puell: number | null;
  piCycleRatio: number | null; rainbowBand: number | null;
  realisedPriceRatio: number | null;
  indicators: CycleIndicatorResult[];
  confidence: ConfidenceBand;
  timestamp: string;
}
import { IndicatorGrid }      from './IndicatorGrid';
import { ConfidenceDisplay }  from './ConfidenceDisplay';
import { HistoricalAnalogues } from './HistoricalAnalogues';
import { DrawdownChart }       from './DrawdownChart';

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
  return <div style={{ height: 1, background: 'var(--border-subtle)', margin: '4px 0' }} />;
}

export function CycleGaugePage({ data, loading, error }: Props) {
  const { theme } = useTheme();
  const isDark    = theme === 'dark';

  const bgPrimary  = 'var(--bg-primary)';
  const textPrimary  = 'var(--text-primary)';
  const textMuted    = 'var(--text-muted)';

  if (loading) {
    return (
      <div style={{
        height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
        backgroundColor: bgPrimary, fontFamily: FONT,
      }}>
        <p style={{ color: textMuted, fontSize: 11, letterSpacing: '0.14em' }}>
          COMPUTING CYCLE POSITION...
        </p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{
        height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
        backgroundColor: bgPrimary, fontFamily: FONT,
      }}>
        <p style={{ color: isDark ? '#d06050' : '#9b3232', fontSize: 11, letterSpacing: '0.14em' }}>
          CYCLE DATA ERROR — {error ?? 'No data available'}
        </p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100%', backgroundColor: bgPrimary, fontFamily: FONT, overflowY: 'auto' }}>
      <div style={{
        maxWidth:      1100,
        margin:        '0 auto',
        padding:       '20px 28px 48px',
        display:       'flex',
        flexDirection: 'column',
        gap:           20,
      }}>

        {/* Page header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
          <div>
            <p style={{ fontSize: 9, letterSpacing: '0.18em', color: textMuted, margin: 0, marginBottom: 4 }}>
              SITUATION ROOM
            </p>
            <h1 style={{ fontSize: 18, color: textPrimary, margin: 0, fontWeight: 600, letterSpacing: '0.06em', fontFamily: isDark ? FONT : "'Georgia', 'Times New Roman', serif" }}>
              CYCLE POSITION GAUGE
            </h1>
          </div>
          <div style={{ textAlign: 'right' }}>
            {data.btcPrice > 0 && (
              <div style={{ fontSize: 16, color: textPrimary, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                {formatPrice(data.btcPrice)}
              </div>
            )}
            <div style={{ fontSize: 9, color: textMuted, letterSpacing: '0.08em', marginTop: 2 }}>
              {formatTimestamp(data.timestamp)}
            </div>
          </div>
        </div>

        <Divider />

        {/* Two-column: spiral (left) + signals (right) */}
        <div style={{
          display:             'grid',
          gridTemplateColumns: 'auto 1fr',
          gap:                 32,
          alignItems:          'start',
        }}>
          {/* Left: log-polar spiral */}
          <HeroGauge
            composite={data.composite}
            phase={data.phase}
            phaseColor={data.phaseColor}
            confidence={data.confidence}
          />

          {/* Right: signal breakdown + confidence */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <p style={{ fontSize: 9, letterSpacing: '0.14em', color: textMuted, margin: 0, textTransform: 'uppercase' }}>
              Signal Breakdown
            </p>
            <IndicatorGrid indicators={data.indicators} columns="repeat(2, 1fr)" />
            <ConfidenceDisplay confidence={data.confidence} indicators={data.indicators} />
          </div>
        </div>

        <Divider />

        <HistoricalAnalogues />

        <Divider />

        {/* Drawdown chart */}
        <DrawdownChart />

        {/* Footer */}
        <div style={{
          paddingTop:    16,
          borderTop:     '1px solid var(--border-subtle)',
          fontSize:      9,
          color:         textMuted,
          letterSpacing: '0.08em',
          lineHeight:    1.8,
          opacity:       0.65,
        }}>
          <p style={{ margin: 0 }}>
            SOURCES — MVRV &amp; REALISED PRICE: BRK (bitview.space) · PUELL MULTIPLE: bitview.space ·
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
