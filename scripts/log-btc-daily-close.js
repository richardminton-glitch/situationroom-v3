#!/usr/bin/env node
/**
 * log-btc-daily-close.js
 *
 * Once-a-day job that prepends yesterday's BTC daily-close to
 * data/btc-price-history.csv (DD/MM/YYYY,price), used by the
 * "Drawdowns from ATH to Cycle Low" chart on /tools/cycle-gauge.
 *
 * The chart's API route (src/app/api/data/drawdown-chart/route.ts) reads
 * this CSV, computes per-cycle drawdowns from each ATH, and caches the
 * result in-process for an hour. Without this job the live (2024) cycle
 * silently drifts behind real time — the chart looked frozen at 24/03/2026
 * before this script existed.
 *
 * Schedule: VPS cron at 00:10 UTC daily (see cron/crontab.txt).
 *
 * Source: CoinGecko free public API (no key). Fetches the most recent
 * closed daily candle (yesterday in UTC) — running just past midnight UTC
 * means yesterday's candle is finalised by then.
 *
 * Idempotent: skips if the target date is already the top row.
 */

const https = require('https');
const fs    = require('fs');
const path  = require('path');

const DATA_DIR  = path.join(__dirname, '..', 'data');
const CSV_FILE  = path.join(DATA_DIR, 'btc-price-history.csv');
// Static seed shipped with the repo. Used to bootstrap data/btc-price-history.csv
// the first time this script runs on a fresh checkout. Never written to —
// the route prefers the runtime copy in data/ for daily appends.
const SEED_CSV  = path.join(__dirname, '..', 'src', 'lib', 'data', 'btc-price-history.csv');

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'SituationRoom/3.0' } }, (res) => {
      let raw = '';
      res.on('data', (c) => { raw += c; });
      res.on('end', () => {
        if (res.statusCode && res.statusCode >= 400) {
          reject(new Error(`HTTP ${res.statusCode}: ${raw.slice(0, 200)}`));
          return;
        }
        try { resolve(JSON.parse(raw)); }
        catch (e) { reject(new Error(`JSON parse error: ${e.message}`)); }
      });
    }).on('error', reject);
  });
}

/** Format a Date as DD/MM/YYYY (UTC) — matches the CSV column. */
function fmtDateDdMmYyyy(d) {
  const dd   = String(d.getUTCDate()).padStart(2, '0');
  const mm   = String(d.getUTCMonth() + 1).padStart(2, '0');
  const yyyy = d.getUTCFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

/** Get yesterday's UTC Date. */
function yesterdayUtc() {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 1);
  return d;
}

async function fetchYesterdayClose() {
  // CoinGecko market_chart with daily granularity. Past 2 days returns
  // 2-3 daily snapshots; the second-to-last is yesterday's close.
  const data = await fetchJson(
    'https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=2&interval=daily'
  );
  const prices = data?.prices;
  if (!Array.isArray(prices) || prices.length < 2) {
    throw new Error('Unexpected CoinGecko response shape');
  }
  // Each entry is [timestampMs, price]. Use the second-to-last as the
  // most recent FULLY-closed daily candle.
  const candle = prices[prices.length - 2];
  if (!candle || typeof candle[1] !== 'number') {
    throw new Error('No closed daily candle in response');
  }
  return Math.round(candle[1]);
}

function prependRow(csvPath, dateStr, price) {
  if (!fs.existsSync(csvPath)) {
    console.warn(`[btc-daily] ${csvPath} does not exist — skipping`);
    return false;
  }
  const raw = fs.readFileSync(csvPath, 'utf8');
  if (!raw.trim()) {
    console.warn(`[btc-daily] ${csvPath} is empty — skipping`);
    return false;
  }
  const bom = raw.startsWith('\uFEFF') ? '\uFEFF' : '';
  const body = bom ? raw.slice(1) : raw;
  const lines = body.split('\n');
  const header = lines[0];
  const firstRow = lines[1] ?? '';

  // Idempotency: skip if today's row already at top
  if (firstRow.trim().startsWith(dateStr + ',')) {
    console.log(`[btc-daily] ${dateStr} already present — skipping ${csvPath}`);
    return false;
  }

  const rest = lines.slice(1).join('\n');
  const next = `${bom}${header}\n${dateStr},${price}\n${rest}`;
  fs.writeFileSync(csvPath, next, 'utf8');
  console.log(`[btc-daily] prepended ${dateStr},${price} to ${csvPath}`);
  return true;
}

/** First-boot bootstrap: copy the static seed into data/ if no runtime CSV
 *  exists yet. Skipped silently if the seed itself is missing. */
function ensureRuntimeCsv() {
  if (fs.existsSync(CSV_FILE)) return;
  if (!fs.existsSync(SEED_CSV)) {
    console.warn(`[btc-daily] No seed at ${SEED_CSV} — runtime CSV will be created from scratch`);
    return;
  }
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.copyFileSync(SEED_CSV, CSV_FILE);
  console.log(`[btc-daily] Seeded ${CSV_FILE} from ${SEED_CSV}`);
}

async function main() {
  const yDate = yesterdayUtc();
  const dateStr = fmtDateDdMmYyyy(yDate);

  let price;
  try {
    price = await fetchYesterdayClose();
  } catch (err) {
    console.error(`[btc-daily] Fetch failed: ${err.message}`);
    process.exit(1);
  }

  if (!price || isNaN(price) || price <= 0) {
    console.error('[btc-daily] No valid price received');
    process.exit(1);
  }

  ensureRuntimeCsv();
  prependRow(CSV_FILE, dateStr, price);

  console.log(`[btc-daily] ${new Date().toISOString()} — done`);
}

main().catch((e) => { console.error(e); process.exit(1); });
