/**
 * WartimeStats — three sub-readouts above the pipeline.
 */

interface WartimeStatsProps {
  globalDefenceSpendUsdT: number;
  defenceSpendYoYPct: number;
  countriesAtStage3Plus: number;
  countriesAtStage3PlusYoYDelta: number;
  medianG20Stage: number;
  medianG20StageYoYDelta: number;
}

export function WartimeStats({
  globalDefenceSpendUsdT,
  defenceSpendYoYPct,
  countriesAtStage3Plus,
  countriesAtStage3PlusYoYDelta,
  medianG20Stage,
  medianG20StageYoYDelta,
}: WartimeStatsProps) {
  return (
    <div
      className="grid grid-cols-1 sm:grid-cols-3 gap-3 border"
      style={{ borderColor: 'var(--border-primary)', backgroundColor: 'var(--bg-card)' }}
    >
      <Stat
        label="GLOBAL DEFENCE SPEND"
        value={`${globalDefenceSpendUsdT.toFixed(1)}T USD`}
        delta={`${defenceSpendYoYPct >= 0 ? '↗ +' : '↘ '}${defenceSpendYoYPct}% YoY`}
        deltaColor={defenceSpendYoYPct >= 0 ? 'var(--feh-critical)' : 'var(--feh-stable)'}
      />
      <Stat
        label="COUNTRIES @ STAGE 3+"
        value={String(countriesAtStage3Plus)}
        delta={`${countriesAtStage3PlusYoYDelta >= 0 ? '↗ +' : '↘ '}${countriesAtStage3PlusYoYDelta} vs LY`}
        deltaColor={countriesAtStage3PlusYoYDelta >= 0 ? 'var(--feh-critical)' : 'var(--feh-stable)'}
      />
      <Stat
        label="MEDIAN G20 STAGE"
        value={medianG20Stage.toFixed(1)}
        delta={`${medianG20StageYoYDelta >= 0 ? '↗ +' : '↘ '}${medianG20StageYoYDelta.toFixed(1)} vs LY`}
        deltaColor={medianG20StageYoYDelta >= 0 ? 'var(--feh-critical)' : 'var(--feh-stable)'}
      />
    </div>
  );
}

function Stat({ label, value, delta, deltaColor }: { label: string; value: string; delta: string; deltaColor: string }) {
  return (
    <div className="px-4 py-3" style={{ borderRight: '1px solid var(--border-subtle)' }}>
      <div
        style={{
          fontFamily: 'var(--feh-font-mono)',
          fontSize: 9,
          letterSpacing: '0.22em',
          color: 'var(--text-muted)',
        }}
      >
        {label}
      </div>
      <div className="flex items-baseline gap-3 mt-0.5">
        <span
          style={{
            fontFamily: 'var(--feh-font-mono)',
            fontSize: 22,
            fontWeight: 900,
            color: 'var(--text-primary)',
            fontVariantNumeric: 'tabular-nums',
            letterSpacing: '-0.01em',
            lineHeight: 1.05,
          }}
        >
          {value}
        </span>
        <span
          style={{
            fontFamily: 'var(--feh-font-mono)',
            fontSize: 11,
            color: deltaColor,
            letterSpacing: '0.14em',
            fontWeight: 700,
          }}
        >
          {delta}
        </span>
      </div>
    </div>
  );
}
