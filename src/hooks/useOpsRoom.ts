'use client';

/**
 * useOpsRoom — centralised data fetching for the Ops Room page.
 * Polls multiple endpoints at different intervals and provides
 * all data needed by the four zones.
 */

import { useState, useEffect, useCallback, useRef } from 'react';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AssetStatus {
  name: string;
  key: string;
  price: number;
  delta: number;
}

export interface NetworkHealth {
  hashrateEH: number;
  hashrateStatus: 'NOMINAL' | 'DEGRADED';
  mempoolMB: number;
  mempoolStatus: 'CLEAR' | 'CONGESTED';
  feeFast: number;
  feeStatus: 'LOW' | 'ELEVATED';
  nextBlockMin: number;
}

export interface ConvictionSignal {
  name: string;
  key: string;
  score: number;
  weight: number;
  direction: 'bullish' | 'bearish' | 'neutral';
  interpretation: string;
  rawValue: number;
  rawLabel: string;
}

export interface ConvictionData {
  composite: number;
  band: string;
  bandColor: string;
  signals: ConvictionSignal[];
  signalsAvailable?: number;
  signalsTotal?: number;
}

export interface PoolData {
  balanceSats: number;
  position: 'FLAT' | 'LONG' | 'SHORT';
  lastTradeDesc: string;
  unrealisedPlSats: number;
}

export interface SignalArticle {
  id: string;
  title: string;
  description: string;
  link: string;
  source: string;
  time: number;
  primaryCategory: string;
  categoryDot: string;
  categoryIcon: string;
  relevanceToBitcoin: number;
  isHighRelevance: boolean;
  geoReference: string | null;
  classificationConfidence: number;
  lat?: number;
  lon?: number;
}

export interface ChatMessage {
  id: string;
  authorNpub: string;
  authorDisplay: string;
  authorIcon: 'lightning' | 'email' | 'bot';
  content: string;
  isBot: boolean;
  isAdmin: boolean;
  eventType: string | null;
  createdAt: string;
}

export interface OpsRoomData {
  // Zone 1 - Header
  threatLevel: string;
  operatorCount: number;

  // Zone 2 - Operations
  assets: AssetStatus[];
  network: NetworkHealth | null;
  conviction: ConvictionData | null;
  outlookText: string;
  pool: PoolData | null;

  // Zone 3 - Globe
  eventMarkers: SignalArticle[];

  // Zone 4 - Signals Board
  articles: SignalArticle[];

  // Zone 5 - Channel
  messages: ChatMessage[];

  // Flash Traffic
  flashTraffic: SignalArticle | null;

  // Status
  loading: boolean;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useOpsRoom() {
  const [data, setData] = useState<OpsRoomData>({
    threatLevel: 'LOW',
    operatorCount: 0,
    assets: [],
    network: null,
    conviction: null,
    outlookText: '',
    pool: null,
    eventMarkers: [],
    articles: [],
    messages: [],
    flashTraffic: null,
    loading: true,
  });

  const lastFlashRef = useRef<number>(0);
  const mountedRef = useRef(true);

  // ── Snapshot (assets + network) — every 30s ──
  const fetchSnapshot = useCallback(async () => {
    try {
      const res = await fetch('/api/data/snapshot');
      if (!res.ok) return;
      const snap = await res.json();
      if (!mountedRef.current) return;

      const assets: AssetStatus[] = [];
      if (snap.btcMarket) {
        assets.push({ name: 'BTC', key: 'btc', price: snap.btcMarket.price, delta: snap.btcMarket.change24h });
      }
      if (snap.commodities?.gold) {
        assets.push({ name: 'GOLD', key: 'gold', price: snap.commodities.gold.price, delta: snap.commodities.gold.changePct });
      }
      if (snap.commodities?.['crude-oil']) {
        const oil = snap.commodities['crude-oil'];
        assets.push({ name: 'OIL', key: 'oil', price: oil.price, delta: oil.changePct });
      }
      if (snap.commodities?.dxy) {
        assets.push({ name: 'DXY', key: 'dxy', price: snap.commodities.dxy.price, delta: snap.commodities.dxy.changePct });
      }

      const network: NetworkHealth | null = snap.btcNetwork ? {
        hashrateEH: snap.btcNetwork.hashrateEH ?? 0,
        hashrateStatus: (snap.btcNetwork.hashrateEH ?? 0) > 800 ? 'NOMINAL' : 'DEGRADED',
        mempoolMB: snap.btcNetwork.mempoolSizeMB ?? 0,
        mempoolStatus: (snap.btcNetwork.mempoolSizeMB ?? 0) < 50 ? 'CLEAR' : 'CONGESTED',
        feeFast: snap.btcNetwork.feeFast ?? 0,
        feeStatus: (snap.btcNetwork.feeFast ?? 0) < 5 ? 'LOW' : 'ELEVATED',
        nextBlockMin: Math.round((snap.btcNetwork.blocksUntilRetarget ?? 0) > 0 ? 10 : 10),
      } : null;

      setData((prev) => ({ ...prev, assets, network }));
    } catch { /* non-critical */ }
  }, []);

  // ── Conviction — every 5min ──
  const fetchConviction = useCallback(async () => {
    try {
      const [convRes, briefRes] = await Promise.all([
        fetch('/api/data/conviction'),
        fetch('/api/briefing/latest'),
      ]);
      if (!mountedRef.current) return;

      let conviction: ConvictionData | null = null;
      let outlookText = '';

      if (convRes.ok) {
        const c = await convRes.json();
        conviction = {
          composite: c.composite,
          band: c.band,
          bandColor: c.bandColor,
          signals: (c.signals ?? []).map((s: Record<string, unknown>) => ({
            name: s.name as string || '',
            key: s.key as string || '',
            score: s.score as number || 0,
            weight: s.weight as number || 0.2,
            direction: (s.direction as string) || 'neutral',
            interpretation: s.interpretation as string || '',
            rawValue: s.rawValue as number || 0,
            rawLabel: s.rawLabel as string || '',
          })),
          signalsAvailable: c.signalsAvailable ?? (c.signals?.length ?? 0),
          signalsTotal: c.signalsTotal ?? 5,
        };
      }

      if (briefRes.ok) {
        const b = await briefRes.json();
        outlookText = b.sections?.outlook || '';
      }

      setData((prev) => ({ ...prev, conviction, outlookText }));
    } catch { /* non-critical */ }
  }, []);

  // ── RSS (signals + event markers) — every 5min ──
  const fetchSignals = useCallback(async () => {
    try {
      const res = await fetch('/api/data/rss');
      if (!res.ok || !mountedRef.current) return;
      const rss = await res.json();

      const now = Date.now();
      const oneDayAgo = now - 24 * 60 * 60 * 1000;

      const articles: SignalArticle[] = (rss.headlines || []).map((h: Record<string, unknown>, i: number) => ({
        id: `rss-${i}-${h.time}`,
        title: h.title as string || '',
        description: h.description as string || '',
        link: h.link as string || '',
        source: h.source as string || '',
        time: h.time as number || 0,
        primaryCategory: h.primaryCategory as string || h.category as string || 'economy',
        categoryDot: h.categoryDot as string || '#4a6060',
        categoryIcon: h.categoryIcon as string || '',
        relevanceToBitcoin: h.relevanceToBitcoin as number || 0,
        isHighRelevance: h.isHighRelevance as boolean || false,
        geoReference: h.geoReference as string | null || null,
        classificationConfidence: h.classificationConfidence as number || 0,
      }));

      // Sort by relevance desc, then by time desc
      articles.sort((a, b) => {
        if (b.relevanceToBitcoin !== a.relevanceToBitcoin) return b.relevanceToBitcoin - a.relevanceToBitcoin;
        return b.time - a.time;
      });

      // Event markers: high relevance + geo + last 24h
      const eventMarkers = articles.filter(
        (a) => a.isHighRelevance && a.geoReference && (a.time * 1000) > oneDayAgo
      );

      // Flash Traffic: score 10 articles
      const flashCandidate = articles.find(
        (a) => a.relevanceToBitcoin === 10 && (a.time * 1000) > lastFlashRef.current
      );
      if (flashCandidate) {
        lastFlashRef.current = Date.now();
        setData((prev) => ({ ...prev, flashTraffic: flashCandidate }));
      }

      // Threat level from headlines
      const threatKeywords = ['war', 'attack', 'missile', 'bomb', 'invasion', 'casualties', 'killed', 'nuclear', 'sanctions'];
      let threatScore = 0;
      for (const a of articles.slice(0, 20)) {
        const lower = a.title.toLowerCase();
        for (const kw of threatKeywords) {
          if (lower.includes(kw)) { threatScore += 2; break; }
        }
      }
      let threatLevel = 'LOW';
      if (threatScore >= 16) threatLevel = 'CRITICAL';
      else if (threatScore >= 12) threatLevel = 'SEVERE';
      else if (threatScore >= 8) threatLevel = 'HIGH';
      else if (threatScore >= 4) threatLevel = 'ELEVATED';
      else if (threatScore >= 2) threatLevel = 'GUARDED';

      setData((prev) => ({ ...prev, articles, eventMarkers, threatLevel }));
    } catch { /* non-critical */ }
  }, []);

  // ── Viewers — every 10s ──
  const fetchViewers = useCallback(async () => {
    try {
      const res = await fetch('/api/viewers', { method: 'POST' });
      if (!res.ok || !mountedRef.current) return;
      const { viewers } = await res.json();
      setData((prev) => ({ ...prev, operatorCount: viewers ?? 0 }));
    } catch { /* non-critical */ }
  }, []);

  // ── Chat messages — every 5s ──
  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch('/api/chat/messages?limit=50');
      if (!res.ok || !mountedRef.current) return;
      const messages: ChatMessage[] = await res.json();
      setData((prev) => ({ ...prev, messages: messages.slice(-200) }));
    } catch { /* non-critical */ }
  }, []);

  // ── Pool status — every 60s ──
  const fetchPool = useCallback(async () => {
    try {
      const res = await fetch('/api/pool/status');
      if (!res.ok || !mountedRef.current) return;
      const p = await res.json();
      setData((prev) => ({
        ...prev,
        pool: {
          balanceSats: p.balanceSats ?? 0,
          position: p.position ?? 'FLAT',
          lastTradeDesc: p.lastTradeDesc ?? '--',
          unrealisedPlSats: p.unrealisedPlSats ?? 0,
        },
      }));
    } catch {
      // Pool may not be active — that's fine
    }
  }, []);

  // ── Lifecycle ──
  useEffect(() => {
    mountedRef.current = true;

    // Initial fetch
    Promise.all([
      fetchSnapshot(),
      fetchConviction(),
      fetchSignals(),
      fetchViewers(),
      fetchMessages(),
      fetchPool(),
    ]).then(() => {
      if (mountedRef.current) setData((prev) => ({ ...prev, loading: false }));
    });

    // Polling intervals
    const snapshotInterval = setInterval(fetchSnapshot, 30_000);
    const convictionInterval = setInterval(fetchConviction, 300_000);
    const signalsInterval = setInterval(fetchSignals, 300_000);
    const viewersInterval = setInterval(fetchViewers, 10_000);
    const messagesInterval = setInterval(fetchMessages, 5_000);
    const poolInterval = setInterval(fetchPool, 60_000);

    return () => {
      mountedRef.current = false;
      clearInterval(snapshotInterval);
      clearInterval(convictionInterval);
      clearInterval(signalsInterval);
      clearInterval(viewersInterval);
      clearInterval(messagesInterval);
      clearInterval(poolInterval);
    };
  }, [fetchSnapshot, fetchConviction, fetchSignals, fetchViewers, fetchMessages, fetchPool]);

  // ── Actions ──
  const dismissFlash = useCallback(() => {
    setData((prev) => ({ ...prev, flashTraffic: null }));
  }, []);

  const sendMessage = useCallback(async (content: string): Promise<boolean> => {
    try {
      const res = await fetch('/api/chat/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
      if (res.ok) {
        const msg = await res.json();
        setData((prev) => ({ ...prev, messages: [...prev.messages, msg].slice(-200) }));
        return true;
      }
    } catch { /* */ }
    return false;
  }, []);

  return { data, dismissFlash, sendMessage };
}
