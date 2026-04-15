#!/usr/bin/env node
/**
 * log-btc-price.js
 * Fetches the current BTC/USD price and appends a timestamped entry to
 * data/btc-price-history.ndjson (one JSON object per line).
 *
 * Run every 15 minutes via VPS cron (see cron/crontab.txt).
 *
 * Consumed by /api/data/charts (src/app/api/data/charts/route.ts) to render
 * the high-granularity 30-day BTC price chart. If this script stops running,
 * the chart silently falls back to CoinGecko's hourly data.
 *
 * File format (NDJSON):
 *   {"t":1712000000000,"v":67000.5}
 *   {"t":1712054400000,"v":67350.2}
 *   ...
 *
 * Old entries (> KEEP_DAYS) are pruned on each run to cap file size.
 */

const https = require('https');
const fs    = require('fs');
const path  = require('path');

const DATA_DIR   = path.join(__dirname, '..', 'data');
const HIST_FILE  = path.join(DATA_DIR, 'btc-price-history.ndjson');
const KEEP_DAYS  = 90;
const KEEP_MS    = KEEP_DAYS * 24 * 60 * 60 * 1000;

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'SituationRoom/3.0' } }, (res) => {
      let raw = '';
      res.on('data', (c) => { raw += c; });
      res.on('end', () => {
        try { resolve(JSON.parse(raw)); }
        catch (e) { reject(new Error(`JSON parse error: ${e.message}`)); }
      });
    }).on('error', reject);
  });
}

async function main() {
  // Fetch price — CoinGecko simple endpoint (no API key needed)
  let price;
  try {
    const data = await fetchJson(
      'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd'
    );
    price = data?.bitcoin?.usd;
  } catch (err) {
    // Fallback: Kraken public ticker
    try {
      const data = await fetchJson('https://api.kraken.com/0/public/Ticker?pair=XBTUSD');
      price = parseFloat(data?.result?.XXBTZUSD?.c?.[0]);
    } catch (err2) {
      console.error(`[btc-logger] Both price sources failed: ${err2.message}`);
      process.exit(1);
    }
  }

  if (!price || isNaN(price)) {
    console.error('[btc-logger] No valid price received');
    process.exit(1);
  }

  const entry = JSON.stringify({ t: Date.now(), v: Math.round(price * 100) / 100 });

  // Ensure data directory exists
  fs.mkdirSync(DATA_DIR, { recursive: true });

  // Append new entry
  fs.appendFileSync(HIST_FILE, entry + '\n', 'utf8');

  // Prune entries older than KEEP_DAYS
  const cutoff = Date.now() - KEEP_MS;
  try {
    const lines = fs.readFileSync(HIST_FILE, 'utf8').trim().split('\n');
    const kept  = lines.filter((l) => {
      try { return JSON.parse(l).t >= cutoff; }
      catch { return false; }
    });
    // Only rewrite if we actually pruned something
    if (kept.length < lines.length) {
      fs.writeFileSync(HIST_FILE, kept.join('\n') + '\n', 'utf8');
    }
  } catch { /* leave file as-is if read/write fails */ }

  console.log(`[btc-logger] ${new Date().toISOString()} — $${price.toFixed(2)} logged`);
}

main().catch((e) => { console.error(e); process.exit(1); });
