/**
 * LNMarkets v3 REST client — direct HMAC-SHA256 HTTP implementation.
 *
 * Replaces the broken @ln-markets/api SDK (hardcoded to /v2 paths which 404).
 * All authenticated requests use HMAC-SHA256 signatures per LNM v3 spec.
 *
 * Two accounts:
 *   Bot client  — trading pool (futures, account info)
 *   Ops client  — subscription invoices (deposits)
 *
 * Usage:
 *   import { getBotClient, getOpsClient, LnmV3Client } from '@/lib/lnm/client'
 *   const bot = getBotClient()
 *   const account = await bot.getAccount()
 *
 * NOTE: v3 API returns all Bitcoin amounts in satoshis.
 */

import { createHmac } from 'crypto';

const BASE_URL = 'https://api.lnmarkets.com';
const VERSION  = '/v3';

// ── Core client ──────────────────────────────────────────────────────────────

export class LnmV3Client {
  constructor(
    private key: string,
    private secret: string,
    private passphrase: string,
  ) {}

  /** HMAC-SHA256 signature: base64(hmac(secret, timestamp+method+path+data)) */
  private sign(timestamp: string, method: string, path: string, data: string): string {
    const payload = `${timestamp}${method}${path}${data}`;
    return createHmac('sha256', this.secret).update(payload).digest('base64');
  }

  /** Core HTTP request with HMAC auth */
  private async request<T>(method: string, endpoint: string, data?: Record<string, unknown>): Promise<T> {
    let path = `${VERSION}${endpoint}`;
    const timestamp = Date.now().toString();
    const lowerMethod = method.toLowerCase();

    let url = `${BASE_URL}${path}`;
    let signBody = '';

    if (method === 'GET' || method === 'DELETE') {
      // v3: query string is part of the signed path (path?key=val)
      if (data && Object.keys(data).length > 0) {
        const params = new URLSearchParams();
        for (const [k, v] of Object.entries(data)) {
          if (v != null) params.append(k, String(v));
        }
        const qs = params.toString();
        if (qs) {
          url += `?${qs}`;
          path += `?${qs}`;
        }
      }
    } else {
      // POST/PUT — JSON body
      if (data) signBody = JSON.stringify(data);
    }

    const signature = this.sign(timestamp, lowerMethod, path, signBody);

    const headers: Record<string, string> = {
      'lnm-access-key':        this.key,
      'lnm-access-passphrase': this.passphrase,
      'lnm-access-timestamp':  timestamp,
      'lnm-access-signature':  signature,
    };

    if (method === 'POST' || method === 'PUT') {
      headers['Content-Type'] = 'application/json';
    }

    const fetchOpts: RequestInit = { method, headers };
    if ((method === 'POST' || method === 'PUT') && signData) {
      fetchOpts.body = signData;
    }

    const res = await fetch(url, fetchOpts);

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`LNM ${method} ${path} → ${res.status}: ${text}`);
    }

    return res.json();
  }

  // ── Public endpoints (no auth) ─────────────────────────────────────────────

  /** Futures ticker — public, no auth required */
  static async getTicker(): Promise<{
    index: number;
    fundingRate: number;
    lastPrice: number;
  }> {
    const res = await fetch(`${BASE_URL}${VERSION}/futures/ticker`);
    if (!res.ok) throw new Error(`LNM ticker → ${res.status}`);
    return res.json();
  }

  // ── Account ────────────────────────────────────────────────────────────────

  /** Get account info. balance is in satoshis (v3). */
  async getAccount(): Promise<{
    balance: number;
    syntheticUsdBalance: number;
    [k: string]: unknown;
  }> {
    return this.request('GET', '/account');
  }

  // ── Futures — positions ────────────────────────────────────────────────────

  /** All currently running (open) positions */
  async getRunningTrades(): Promise<Record<string, unknown>[]> {
    return this.request('GET', '/futures/isolated/trades/running');
  }

  /** Recently closed trades (unwraps pagination — returns flat array) */
  async getClosedTrades(limit = 20): Promise<Record<string, unknown>[]> {
    const res = await this.request<{ data: Record<string, unknown>[]; nextCursor: string | null }>(
      'GET', '/futures/isolated/trades/closed', { limit },
    );
    return res.data ?? res as unknown as Record<string, unknown>[];
  }

  /** Open a new futures position */
  async openTrade(params: {
    side: 'buy' | 'sell';
    quantity: number;
    leverage: number;
    type: 'market' | 'limit';
    takeprofit?: number;
    stoploss?: number;
  }): Promise<Record<string, unknown>> {
    return this.request('POST', '/futures/isolated/trade', params as unknown as Record<string, unknown>);
  }

  /** Close an open position by ID */
  async closeTrade(id: string): Promise<Record<string, unknown>> {
    return this.request('POST', '/futures/isolated/trade/close', { id });
  }

  /** Update stop-loss on a running trade */
  async updateStopLoss(id: string, value: number): Promise<Record<string, unknown>> {
    return this.request('PUT', '/futures/isolated/trade/stoploss', { id, value });
  }

  /** Update take-profit on a running trade */
  async updateTakeProfit(id: string, value: number): Promise<Record<string, unknown>> {
    return this.request('PUT', '/futures/isolated/trade/takeprofit', { id, value });
  }

  // ── Deposits (Lightning) ───────────────────────────────────────────────────

  /** Create a Lightning deposit invoice. Amount in satoshis. */
  async createDeposit(amount: number, comment?: string): Promise<{
    depositId: string;
    paymentRequest: string;
  }> {
    return this.request('POST', '/account/deposit/lightning', {
      amount,
      ...(comment ? { comment } : {}),
    });
  }

  /** Recent Lightning deposits (unwraps pagination — returns flat array) */
  async getDepositHistory(limit = 100): Promise<{
    id: string;
    amount: number;
    settledAt: string | null;
    comment: string;
    createdAt: string;
  }[]> {
    const res = await this.request<{
      data: { id: string; amount: number; settledAt: string | null; comment: string; createdAt: string }[];
      nextCursor: string | null;
    }>('GET', '/account/deposits/lightning', { limit });
    return res.data ?? res as unknown as { id: string; amount: number; settledAt: string | null; comment: string; createdAt: string }[];
  }
}

// ── Factory functions ────────────────────────────────────────────────────────

function makeClient(key?: string, secret?: string, passphrase?: string): LnmV3Client {
  if (!key || !secret || !passphrase) {
    throw new Error('LNMarkets credentials not configured');
  }
  return new LnmV3Client(key, secret, passphrase);
}

export function getBotClient(): LnmV3Client {
  return makeClient(
    process.env.LNM_BOT_KEY,
    process.env.LNM_BOT_SECRET,
    process.env.LNM_BOT_PASSPHRASE,
  );
}

export function getOpsClient(): LnmV3Client {
  return makeClient(
    process.env.LNM_OPS_KEY,
    process.env.LNM_OPS_SECRET,
    process.env.LNM_OPS_PASSPHRASE,
  );
}
