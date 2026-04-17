'use client';

import { useTheme } from '@/components/layout/ThemeProvider';
import type { StripBlock } from './types';
import { formatSats, formatTxCount, minutesAgo, feeRangeLabel, medianSatVb } from './utils';

interface Props {
  selected: StripBlock | null;
}

export function BlockDetail({ selected }: Props) {
  const { theme } = useTheme();
  const isDark = theme !== 'parchment';

  if (!selected) return null;

  const rows: Array<[string, string]> = [];
  let title = '';
  let subtitle = '';

  if (selected.kind === 'confirmed') {
    const b = selected.data;
    title    = `BLOCK ${b.height.toLocaleString()}`;
    subtitle = selected.isTip ? 'Chain tip — most recently mined' : minutesAgo(b.timestamp);
    rows.push(['Height', b.height.toLocaleString()]);
    rows.push(['Mined', minutesAgo(b.timestamp)]);
    rows.push(['Transactions', formatTxCount(b.tx_count)]);
    rows.push(['Size', `${(b.size / 1e6).toFixed(2)} MB`]);
    rows.push(['Weight', `${(b.weight / 1e6).toFixed(2)} MWU`]);
    rows.push(['Median fee', medianSatVb(b.extras?.medianFee)]);
    rows.push(['Fee range', `${feeRangeLabel(b.extras?.feeRange)} sat/vB`]);
    rows.push(['Total fees', b.extras?.totalFees != null ? formatSats(b.extras.totalFees) : '—']);
    rows.push(['Reward', b.extras?.reward != null ? formatSats(b.extras.reward) : '—']);
    rows.push(['Mined by', b.extras?.pool?.name ?? 'unknown']);
    rows.push(['Hash', b.id.slice(0, 16) + '…' + b.id.slice(-8)]);
  } else {
    const b = selected.data;
    title    = `PENDING · +${selected.minutesAway} MIN`;
    subtitle = 'Projected block from current mempool';
    rows.push(['Arrives in', `~${selected.minutesAway} minutes`]);
    rows.push(['Transactions', formatTxCount(b.nTx)]);
    rows.push(['Virtual size', `${(b.blockVSize / 1e6).toFixed(2)} MvB`]);
    rows.push(['Block size', `${(b.blockSize / 1e6).toFixed(2)} MB`]);
    rows.push(['Median fee', medianSatVb(b.medianFee)]);
    rows.push(['Fee range', `${feeRangeLabel(b.feeRange)} sat/vB`]);
    rows.push(['Total fees', formatSats(b.totalFees)]);
  }

  return (
    <div style={{
      marginTop: 8,
      padding: '18px 20px',
      backgroundColor: 'var(--bg-card)',
      border: '1px solid var(--border-primary)',
      borderRadius: 3,
    }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 14 }}>
        <div style={{
          fontFamily: isDark ? 'var(--font-mono)' : "'Georgia', 'Times New Roman', serif",
          fontSize: 16,
          fontWeight: 600,
          letterSpacing: '0.06em',
          color: 'var(--text-panel-title, var(--text-primary))',
        }}>
          {title}
        </div>
        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 10,
          letterSpacing: '0.14em',
          color: 'var(--text-muted)',
          textTransform: 'uppercase',
        }}>
          {subtitle}
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '4px 32px',
      }}>
        {rows.map(([label, value]) => (
          <div key={label} style={{
            display: 'flex',
            justifyContent: 'space-between',
            padding: '6px 0',
            borderBottom: '1px dotted var(--border-subtle)',
          }}>
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              letterSpacing: '0.1em',
              color: 'var(--text-secondary)',
              textTransform: 'uppercase',
            }}>
              {label}
            </span>
            <span style={{
              fontFamily: 'var(--font-data)',
              fontSize: 12,
              color: 'var(--text-primary)',
              fontWeight: 500,
            }}>
              {value}
            </span>
          </div>
        ))}
      </div>

      <div style={{
        marginTop: 16,
        padding: '10px 12px',
        background: 'var(--bg-secondary)',
        borderRadius: 2,
        fontFamily: 'var(--font-mono)',
        fontSize: 10,
        color: 'var(--text-muted)',
        letterSpacing: '0.08em',
        fontStyle: isDark ? 'normal' : 'italic',
      }}>
        ◇ Placeholder panel — we'll replace this with the tuned Bitcoin data containers.
      </div>
    </div>
  );
}
