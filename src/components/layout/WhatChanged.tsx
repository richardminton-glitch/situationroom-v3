'use client';

import { useState, useEffect, useRef } from 'react';
import { useData } from './DataProvider';
import { formatPrice, formatPct, pctColor } from '@/components/panels/shared';

interface LastSnapshot {
  btcPrice: number;
  fearGreed: number;
  hashrateEH: number;
  threatLevel: string;
  timestamp: number;
}

const STORAGE_KEY = 'sr_last_snapshot';
const MIN_ABSENCE_MS = 30 * 60 * 1000; // 30 minutes

function formatTimeAway(ms: number): string {
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    return `${days} day${days > 1 ? 's' : ''}`;
  }
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export function WhatChanged() {
  const { data } = useData();
  const [lastSnapshot, setLastSnapshot] = useState<LastSnapshot | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [timeAway, setTimeAway] = useState('');
  const threatRef = useRef('LOW');

  // Load last snapshot on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const snap: LastSnapshot = JSON.parse(raw);
        const absence = Date.now() - snap.timestamp;
        if (absence > MIN_ABSENCE_MS) {
          setLastSnapshot(snap);
          setTimeAway(formatTimeAway(absence));
        }
      }
    } catch { /* no stored data */ }
  }, []);

  // Fetch threat level (same algorithm as Members Room)
  useEffect(() => {
    async function loadThreat() {
      try {
        const res = await fetch('/api/data/threat-score');
        if (res.ok) {
          const { state } = await res.json();
          threatRef.current = state;
        }
      } catch { /* */ }
    }
    loadThreat();
  }, []);

  // Save current snapshot on every data update
  useEffect(() => {
    if (!data?.btcMarket) return;
    const snap: LastSnapshot = {
      btcPrice: data.btcMarket.price,
      fearGreed: data.fearGreed?.value ?? 0,
      hashrateEH: data.btcNetwork?.hashrateEH ?? 0,
      threatLevel: threatRef.current,
      timestamp: Date.now(),
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(snap));
    } catch { /* storage full */ }
  }, [data]);

  if (dismissed || !lastSnapshot || !data?.btcMarket) return null;

  const priceChange = data.btcMarket.price - lastSnapshot.btcPrice;
  const priceChangePct = lastSnapshot.btcPrice ? (priceChange / lastSnapshot.btcPrice) * 100 : 0;
  const fgChange = (data.fearGreed?.value ?? 0) - lastSnapshot.fearGreed;
  const hrChange = (data.btcNetwork?.hashrateEH ?? 0) - lastSnapshot.hashrateEH;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
      onClick={() => setDismissed(true)}
    >
      <div
        className="panel-card w-full max-w-md p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2
            className="text-lg font-bold"
            style={{ fontFamily: 'var(--font-heading)', color: 'var(--text-primary)' }}
          >
            Since Your Last Visit
          </h2>
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {timeAway} ago
          </span>
        </div>

        <div className="space-y-3">
          {/* BTC Price */}
          <div className="flex items-center justify-between">
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Bitcoin</span>
            <div className="text-right">
              <span
                className="text-sm font-medium"
                style={{ fontFamily: 'var(--font-data)', color: 'var(--text-primary)' }}
              >
                ${formatPrice(data.btcMarket.price, 0)}
              </span>
              <span
                className="text-xs ml-2"
                style={{ fontFamily: 'var(--font-data)', color: pctColor(priceChangePct) }}
              >
                {priceChange >= 0 ? '+' : ''}{formatPrice(Math.abs(priceChange), 0)} ({formatPct(priceChangePct)})
              </span>
            </div>
          </div>

          {/* Fear & Greed */}
          {lastSnapshot.fearGreed > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Fear & Greed</span>
              <div className="text-right">
                <span
                  className="text-sm font-medium"
                  style={{ fontFamily: 'var(--font-data)', color: 'var(--text-primary)' }}
                >
                  {data.fearGreed?.value ?? '—'}
                </span>
                <span
                  className="text-xs ml-2"
                  style={{ fontFamily: 'var(--font-data)', color: pctColor(fgChange) }}
                >
                  {fgChange >= 0 ? '+' : ''}{fgChange}
                </span>
              </div>
            </div>
          )}

          {/* Hashrate */}
          {lastSnapshot.hashrateEH > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Hashrate</span>
              <div className="text-right">
                <span
                  className="text-sm font-medium"
                  style={{ fontFamily: 'var(--font-data)', color: 'var(--text-primary)' }}
                >
                  {(data.btcNetwork?.hashrateEH ?? 0).toFixed(1)} EH/s
                </span>
                <span
                  className="text-xs ml-2"
                  style={{ fontFamily: 'var(--font-data)', color: pctColor(hrChange) }}
                >
                  {hrChange >= 0 ? '+' : ''}{hrChange.toFixed(1)}
                </span>
              </div>
            </div>
          )}
        </div>

        <button
          onClick={() => setDismissed(true)}
          className="w-full mt-5 px-4 py-2 rounded text-sm"
          style={{
            backgroundColor: 'var(--accent-primary)',
            color: 'var(--bg-primary)',
          }}
        >
          Continue to Dashboard
        </button>
      </div>
    </div>
  );
}
