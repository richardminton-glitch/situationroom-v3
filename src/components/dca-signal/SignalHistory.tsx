'use client';

import { useState, useEffect } from 'react';
import type { BtcSignalResponse } from '@/app/api/btc-signal/route';

const FONT    = "'JetBrains Mono', 'IBM Plex Mono', 'SF Mono', monospace";
const LS_KEY  = 'sr-dca-signal-history';
const MAX_ROWS = 12;

interface SignalSnapshot {
  week:            string;   // "2025-W14"
  date:            string;   // Monday YYYY-MM-DD
  composite:       number;
  tier:            string;
  recommendedBuy:  number;   // at $100 base
  btcPrice:        number;
  maRatio:         number;
  puellMultiple:   number;
}

/** ISO week number for a given Date (ISO 8601 — week starts Monday) */
function isoWeek(d: Date): { year: number; week: number; monday: string } {
  // Thursday in current week determines the year
  const dayOfWeek = d.getUTCDay() || 7; // Sun=7
  const thursday  = new Date(d);
  thursday.setUTCDate(d.getUTCDate() + (4 - dayOfWeek));

  const year  = thursday.getUTCFullYear();
  const jan1  = new Date(Date.UTC(year, 0, 1));
  const week  = Math.ceil((((thursday.getTime() - jan1.getTime()) / 86_400_000) + 1) / 7);

  // Monday of this week
  const monday = new Date(d);
  monday.setUTCDate(d.getUTCDate() - (dayOfWeek - 1));
  const mondayStr = monday.toISOString().slice(0, 10);

  return { year, week, monday: mondayStr };
}

function weekString(d: Date): string {
  const { year, week } = isoWeek(d);
  return `${year}-W${String(week).padStart(2, '0')}`;
}

function compositeColour(composite: number): string {
  if (composite >= 1.5) return '#00d4c8';
  if (composite >= 0.85) return '#c4885a';
  return '#d06050';
}

interface Props {
  data: BtcSignalResponse | null;
}

export function SignalHistory({ data }: Props) {
  const [snapshots, setSnapshots] = useState<SignalSnapshot[]>([]);

  useEffect(() => {
    if (!data) return;

    try {
      // Load existing history
      const raw     = localStorage.getItem(LS_KEY);
      const existing: SignalSnapshot[] = raw ? JSON.parse(raw) : [];

      const now         = new Date(data.timestamp);
      const currentWeek = weekString(now);

      // Write snapshot for current week if not already present
      const hasThisWeek = existing.some(s => s.week === currentWeek);
      let updated       = [...existing];

      if (!hasThisWeek) {
        const { monday } = isoWeek(now);
        const newSnap: SignalSnapshot = {
          week:           currentWeek,
          date:           monday,
          composite:      data.composite,
          tier:           data.tier,
          recommendedBuy: Math.round(100 * data.composite),
          btcPrice:       data.btcPrice,
          maRatio:        data.maRatio,
          puellMultiple:  data.puellValue,
        };
        updated = [...existing, newSnap];
      }

      // Trim to last MAX_ROWS (keep newest), sort newest-first for display
      const trimmed = updated
        .sort((a, b) => b.week.localeCompare(a.week))
        .slice(0, MAX_ROWS);

      localStorage.setItem(LS_KEY, JSON.stringify(trimmed));
      setSnapshots(trimmed);
    } catch { /* SSR / localStorage guard */ }
  }, [data]);

  if (snapshots.length === 0) return null;

  return (
    <div style={{
      paddingTop:  16,
      borderTop:   '1px solid rgba(255,255,255,0.06)',
      fontFamily:  FONT,
    }}>

      {/* Section label */}
      <span style={{
        display:       'block',
        fontSize: 11,
        letterSpacing: '0.14em',
        color:         '#8a9bb0',
        marginBottom:  12,
      }}>
        SIGNAL HISTORY
      </span>

      <div style={{ overflowX: 'auto' }}>
        <table style={{
          width:           '100%',
          borderCollapse:  'collapse',
          fontSize: 12,
          letterSpacing:   '0.06em',
        }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              {['WEEK', 'DATE', 'SIGNAL', 'TIER', 'BUY (AT $100)', 'BTC PRICE'].map(h => (
                <th key={h} style={{
                  textAlign:     'left',
                  paddingBottom: 6,
                  paddingRight:  16,
                  fontSize: 10,
                  letterSpacing: '0.14em',
                  color:         '#6b7a8d',
                  fontWeight:    600,
                }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {snapshots.map((s, i) => (
              <tr
                key={s.week}
                style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
              >
                <td style={{ padding: '6px 16px 6px 0', color: i === 0 ? '#e8edf2' : '#8a9bb0' }}>
                  {s.week}
                </td>
                <td style={{ padding: '6px 16px 6px 0', color: '#8a9bb0' }}>
                  {s.date}
                </td>
                <td style={{ padding: '6px 16px 6px 0', color: compositeColour(s.composite), fontWeight: 600 }}>
                  {s.composite.toFixed(2)}×
                </td>
                <td style={{ padding: '6px 16px 6px 0', color: compositeColour(s.composite) }}>
                  {s.tier}
                </td>
                <td style={{ padding: '6px 16px 6px 0', color: '#e8edf2' }}>
                  ${s.recommendedBuy}
                </td>
                <td style={{ padding: '6px 0 6px 0', color: '#8aaba6' }}>
                  ${s.btcPrice.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p style={{
        marginTop:     8,
        fontSize: 10,
        color:         '#6b7a8d',
        letterSpacing: '0.08em',
      }}>
        STORED LOCALLY · CLEARS WITH BROWSER CACHE · SHOWS LAST {MAX_ROWS} WEEKS
      </p>

    </div>
  );
}
