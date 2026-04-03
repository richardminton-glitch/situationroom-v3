#!/usr/bin/env node
/**
 * backfill-btc-price.js
 * One-time script — populates data/btc-price-history.ndjson with 90 days
 * of hourly BTC price data from CoinGecko (free API, no key needed).
 *
 * Run once after deploy:
 *   node /opt/situationroom-v3/scripts/backfill-btc-price.js
 */

const https = require('https');
const fs    = require('fs');
const path  = require('path');

const DATA_DIR  = path.join(__dirname, '..', 'data');
const HIST_FILE = path.join(DATA_DIR, 'btc-price-history.ndjson');

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'SituationRoom/3.0' } }, (res) => {
      let raw = '';
      res.on('data', (c) => { raw += c; });
      res.on('end', () => {
        try { resolve(JSON.parse(raw)); }
        catch (e) { reject(new Error(`JSON parse: ${e.message}`)); }
      });
    }).on('error', reject);
  });
}

async function main() {
  console.log('[backfill] Fetching 90 days of hourly BTC price from CoinGecko...');

  // CoinGecko returns hourly data automatically for days <= 90 when no interval param
  const data = await fetchJson(
    'https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=90'
  );

  if (!data?.prices?.length) {
    console.error('[backfill] No price data returned');
    process.exit(1);
  }

  fs.mkdirSync(DATA_DIR, { recursive: true });

  // If file exists, read existing timestamps so we don't duplicate
  let existingTimestamps = new Set();
  if (fs.existsSync(HIST_FILE)) {
    const lines = fs.readFileSync(HIST_FILE, 'utf8').trim().split('\n');
    for (const l of lines) {
      try { existingTimestamps.add(JSON.parse(l).t); } catch { /* skip */ }
    }
    console.log(`[backfill] ${existingTimestamps.size} existing entries found`);
  }

  // Write new entries (round timestamps to nearest minute to avoid near-duplicates)
  const ROUND = 60_000;
  const seen = new Set([...existingTimestamps].map((t) => Math.round(t / ROUND)));

  let added = 0;
  const lines = [];
  for (const [t, v] of data.prices) {
    const rounded = Math.round(t / ROUND);
    if (!seen.has(rounded)) {
      seen.add(rounded);
      lines.push(JSON.stringify({ t, v: Math.round(v * 100) / 100 }));
      added++;
    }
  }

  if (lines.length > 0) {
    fs.appendFileSync(HIST_FILE, lines.join('\n') + '\n', 'utf8');
  }

  // Sort the whole file by timestamp
  const all = fs.readFileSync(HIST_FILE, 'utf8').trim().split('\n')
    .map((l) => { try { return JSON.parse(l); } catch { return null; } })
    .filter(Boolean)
    .sort((a, b) => a.t - b.t);

  fs.writeFileSync(HIST_FILE, all.map((e) => JSON.stringify(e)).join('\n') + '\n', 'utf8');

  console.log(`[backfill] Done — added ${added} new entries, total ${all.length} data points`);
  console.log(`[backfill] Date range: ${new Date(all[0].t).toISOString()} → ${new Date(all[all.length - 1].t).toISOString()}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
