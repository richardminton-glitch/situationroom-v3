'use client';

import { useEffect, useState, useCallback } from 'react';
import { useTheme } from '@/components/layout/ThemeProvider';
import { BlockStrip } from './BlockStrip';
import { BlockDetail } from './BlockDetail';
import type { ConfirmedBlock, PendingBlock, StripBlock } from './types';

const POLL_MS = 30_000;

export function BlockchainPage() {
  const { theme } = useTheme();
  const isDark = theme !== 'parchment';

  const [confirmed, setConfirmed] = useState<ConfirmedBlock[]>([]);
  const [pending, setPending]     = useState<PendingBlock[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [blocksRes, mempoolRes] = await Promise.all([
        fetch('/api/mempool/v1/blocks'),
        fetch('/api/mempool/v1/fees/mempool-blocks'),
      ]);
      if (!blocksRes.ok) throw new Error(`blocks HTTP ${blocksRes.status}`);
      if (!mempoolRes.ok) throw new Error(`mempool HTTP ${mempoolRes.status}`);
      const blocksJson   = await blocksRes.json() as ConfirmedBlock[];
      const mempoolJson  = await mempoolRes.json() as PendingBlock[];
      setConfirmed(blocksJson.slice(0, 12));
      setPending(mempoolJson.slice(0, 8));
      setError(null);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const t = setInterval(fetchData, POLL_MS);
    return () => clearInterval(t);
  }, [fetchData]);

  // Build unified ordering: pending (furthest-future → soonest) | tip | older confirmed
  // Time flows left → right: oldest confirmed on the far left, tip next to NOW,
  // soonest pending just past NOW, furthest-future pending on the far right.
  const confirmedBlocks: StripBlock[] = confirmed
    .map((c, i) => ({ kind: 'confirmed' as const, data: c, isTip: i === 0 }))
    .reverse(); // API returns tip-first → reverse so tip is last (adjacent to divider)

  // mempool.space returns pending soonest-first; keep that order so the
  // soonest block sits adjacent to the NOW divider and furthest lands on the right.
  const pendingBlocks: StripBlock[] = pending.map((p, i) => ({
    kind: 'pending' as const,
    data: p,
    minutesAway: (i + 1) * 10,
    index: i,
  }));

  const strip: StripBlock[] = [...confirmedBlocks, ...pendingBlocks];

  const tipBlock = confirmedBlocks[confirmedBlocks.length - 1];

  const keyFor = (b: StripBlock): string =>
    b.kind === 'confirmed' ? `c-${b.data.height}` : `p-${b.index}`;

  const selected: StripBlock | null =
    strip.find(b => keyFor(b) === selectedKey) ??
    tipBlock ??
    null;

  return (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: 'var(--bg-primary)',
      color: 'var(--text-primary)',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: '14px 20px 10px',
        borderBottom: '1px solid var(--border-subtle)',
      }}>
        <p style={{
          fontSize: 9,
          letterSpacing: '0.24em',
          color: 'var(--text-muted)',
          margin: 0,
          fontFamily: 'var(--font-mono)',
          textTransform: 'uppercase',
        }}>
          Tool · Blockchain Visualiser
        </p>
        <h1 style={{
          fontSize: 22,
          letterSpacing: '0.04em',
          margin: '4px 0 0',
          fontWeight: 600,
          fontFamily: isDark ? 'var(--font-mono)' : "'Georgia', 'Times New Roman', serif",
          color: 'var(--text-panel-title, var(--text-primary))',
        }}>
          {isDark ? 'CONTACT SHEET' : 'Chronicle of Blocks'}
        </h1>
        <p style={{
          fontSize: 11,
          color: 'var(--text-muted)',
          margin: '4px 0 0',
          fontFamily: isDark ? 'var(--font-mono)' : "'Georgia', 'Times New Roman', serif",
          fontStyle: isDark ? 'normal' : 'italic',
        }}>
          {isDark
            ? 'Developed frames, latent projections. Tip fixes on arrival.'
            : 'Inked past, pencilled future. The wax seal marks the tip.'}
        </p>
      </div>

      {/* Strip */}
      <div style={{ padding: '16px 20px 20px', flexShrink: 0 }}>
        {loading && strip.length === 0 ? (
          <div style={{
            height: 210,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-muted)',
            fontSize: 11,
            letterSpacing: '0.14em',
            fontFamily: 'var(--font-mono)',
          }}>
            LOADING BLOCKS...
          </div>
        ) : error ? (
          <div style={{
            height: 210,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--accent-danger)',
            fontSize: 11,
            letterSpacing: '0.1em',
            fontFamily: 'var(--font-mono)',
          }}>
            FEED ERROR — {error}
          </div>
        ) : (
          <BlockStrip
            blocks={strip}
            selectedKey={selectedKey ?? (tipBlock ? keyFor(tipBlock) : null)}
            onSelect={setSelectedKey}
            keyFor={keyFor}
            theme={theme}
          />
        )}
      </div>

      {/* Detail panels — placeholder for now */}
      <div style={{ flex: 1, overflow: 'auto', padding: '0 20px 20px' }}>
        <BlockDetail selected={selected} />
      </div>
    </div>
  );
}
