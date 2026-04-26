'use client';

/**
 * CountdownClock — the namesake hero element.
 *
 * Ticks every second from a precomputed runway value (Y / D / H / M / S).
 * For runway = 0 (already-crossed sovereigns like Argentina, Lebanon)
 * shows DEFAULT IN PROGRESS pulsing in critical red. For runway >= 100
 * shows 100Y+ with stable colour and no tick.
 *
 * The "computedAt" timestamp anchors the count — every viewer sees the
 * same time-since-computation, regardless of when their browser opened.
 */

import { useEffect, useState } from 'react';
import { colorForRunway } from '@/lib/feh/colors';

interface CountdownClockProps {
  runwayYears: number;
  /** Epoch ms when runway was computed. */
  computedAt: number;
  countryName: string;
  confidenceYears: number;
  failureMode: string;
}

const SEC_PER_YEAR = 365.25 * 86400;

export function CountdownClock({ runwayYears, computedAt, countryName, confidenceYears, failureMode }: CountdownClockProps) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (runwayYears === 0 || runwayYears >= 100) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [runwayYears]);

  const isCritical = runwayYears <= 5;
  const isStable = runwayYears >= 100;
  const color = colorForRunway(runwayYears);

  let display: string;
  if (runwayYears === 0) {
    display = 'DEFAULT IN PROGRESS';
  } else if (isStable) {
    display = '100Y+ ';
  } else {
    const totalSec = runwayYears * SEC_PER_YEAR;
    const elapsed = (now - computedAt) / 1000;
    const remaining = Math.max(0, totalSec - elapsed);
    const Y = Math.floor(remaining / SEC_PER_YEAR);
    const remD = remaining - Y * SEC_PER_YEAR;
    const D = Math.floor(remD / 86400);
    const H = Math.floor((remD % 86400) / 3600);
    const M = Math.floor((remD % 3600) / 60);
    const S = Math.floor(remD % 60);
    display = `${pad(Y, 2)}Y ${pad(D, 3)}D ${pad(H, 2)}H ${pad(M, 2)}M ${pad(S, 2)}S`;
  }

  return (
    <div
      className="border px-4 py-4"
      style={{
        borderColor: color,
        backgroundColor: 'var(--bg-card)',
      }}
    >
      <div
        style={{
          fontFamily: 'var(--feh-font-mono)',
          fontSize: 9,
          letterSpacing: '0.24em',
          color: 'var(--text-muted)',
          marginBottom: 8,
        }}
      >
        RUNWAY TO FISCAL EVENT HORIZON
      </div>
      <div
        className={isCritical && runwayYears > 0 ? 'feh-distress' : ''}
        style={{
          fontFamily: 'var(--feh-font-mono)',
          fontSize: 'clamp(20px, 2.4vw, 30px)',
          fontWeight: 700,
          color,
          letterSpacing: '0.06em',
          fontVariantNumeric: 'tabular-nums',
          lineHeight: 1.1,
        }}
      >
        {display}
      </div>
      <div
        style={{
          marginTop: 10,
          fontFamily: 'var(--feh-font-mono)',
          fontSize: 10,
          letterSpacing: '0.18em',
          color: 'var(--text-secondary)',
        }}
      >
        {countryName.toUpperCase()}
      </div>
      <div
        className="flex items-center justify-between gap-3"
        style={{
          marginTop: 4,
          fontFamily: 'var(--feh-font-mono)',
          fontSize: 9,
          letterSpacing: '0.16em',
          color: 'var(--text-muted)',
        }}
      >
        <span>CONFIDENCE: ±{confidenceYears.toFixed(1)}Y</span>
        <span>FAILURE MODE: <span style={{ color }}>{failureMode}</span></span>
      </div>
    </div>
  );
}

function pad(n: number, len: number): string {
  return String(n).padStart(len, '0');
}
