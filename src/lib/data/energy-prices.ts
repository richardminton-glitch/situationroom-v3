/**
 * Energy price fetchers — EIA (US), Eurostat (EU), natural gas proxy.
 * Used by the weekly cron at /api/cron/refresh-energy-prices.
 */

import { fetchJSON } from './fetcher';

// ── EIA (US Energy Information Administration) ──────────────────────────────

interface EIAResponse {
  response: {
    data: {
      period: string;     // "2026-01"
      stateid: string;    // "TX"
      sectorid: string;   // "IND"
      price: number;      // cents/kWh
    }[];
  };
}

/** Key US mining states to track */
const EIA_STATES = ['TX', 'GA', 'WY', 'NY', 'WA', 'KY', 'ND', 'OH', 'PA', 'SC'];

/**
 * Fetch US industrial electricity prices from EIA.
 * Returns $/kWh (not cents) for each state.
 */
export async function fetchEIAPrices(apiKey: string): Promise<Record<string, { priceKwh: number; period: string }>> {
  const stateFilter = EIA_STATES.map(s => `facets[stateid][]=${s}`).join('&');
  const url = `https://api.eia.gov/v2/electricity/retail-sales/data?api_key=${apiKey}&data[]=price&${stateFilter}&facets[sectorid][]=IND&frequency=monthly&sort[0][column]=period&sort[0][direction]=desc&length=100`;

  const raw = await fetchJSON<EIAResponse>(url, { timeout: 20_000 });
  const result: Record<string, { priceKwh: number; period: string }> = {};

  for (const row of raw.response.data) {
    const key = `US-${row.stateid}`;
    // Only keep the most recent period per state
    if (!result[key] && row.price > 0) {
      result[key] = { priceKwh: row.price / 100, period: row.period };
    }
  }

  return result;
}

// ── Eurostat ────────────────────────────────────────────────────────────────

interface EurostatResponse {
  dimension: {
    geo: { category: { index: Record<string, number>; label: Record<string, string> } };
    time: { category: { index: Record<string, number> } };
  };
  value: Record<string, number>;
  size: number[];
}

/** EU/EEA countries relevant to mining */
const EU_COUNTRIES = ['NO', 'SE', 'FI', 'IS', 'DE', 'IE', 'FR', 'NL', 'AT', 'ES'];

/**
 * Fetch EU non-household electricity prices from Eurostat.
 * Dataset: nrg_pc_205 (bi-annual). Returns EUR/kWh.
 */
export async function fetchEurostatPrices(): Promise<Record<string, { priceEurKwh: number; period: string }>> {
  const geoFilter = EU_COUNTRIES.map(c => `geo=${c}`).join('&');
  // Consumption band ID_4500: 2000-20000 MWh (industrial)
  const url = `https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/nrg_pc_205?format=JSON&lang=EN&${geoFilter}&nrg_cons=ID4500&tax=X_TAX&currency=EUR`;

  const raw = await fetchJSON<EurostatResponse>(url, { timeout: 20_000 });
  const result: Record<string, { priceEurKwh: number; period: string }> = {};

  // JSON-stat 2.0: find the latest time period for each geo
  const geoIndex = raw.dimension.geo.category.index;
  const timeIndex = raw.dimension.time.category.index;
  const timePeriods = Object.keys(timeIndex).sort().reverse();
  const geoCount = Object.keys(geoIndex).length;

  for (const [geo, geoIdx] of Object.entries(geoIndex)) {
    for (const period of timePeriods) {
      const timeIdx = timeIndex[period];
      const flatIdx = geoIdx + timeIdx * geoCount;
      const value = raw.value[String(flatIdx)];
      if (value !== undefined && value > 0) {
        result[geo] = { priceEurKwh: value, period };
        break;
      }
    }
  }

  return result;
}

// ── Natural gas proxy ───────────────────────────────────────────────────────

interface CommodityPriceResponse {
  name: string;
  price: number;
  exchange: string;
  updated: number;
}

/**
 * Fetch natural gas price from API-Ninjas and compute implied electricity cost.
 * Conversion: $/MMBtu → $/kWh at 40% plant efficiency.
 * 1 MMBtu = 293.07 kWh thermal, at 40% efficiency = 117.23 kWh electrical.
 */
export async function fetchNaturalGasPrice(apiKey: string): Promise<{ priceMMBtu: number; impliedKwh: number }> {
  const raw = await fetchJSON<CommodityPriceResponse>(
    'https://api.api-ninjas.com/v1/commodityprice?name=natural_gas',
    { headers: { 'X-Api-Key': apiKey }, timeout: 10_000 },
  );

  const priceMMBtu = raw.price;
  const impliedKwh = priceMMBtu / (293.07 * 0.4); // ~$0.017/kWh at $2/MMBtu

  return { priceMMBtu, impliedKwh };
}

// ── EUR/USD conversion (simple) ─────────────────────────────────────────────

/** Approximate EUR → USD (updated periodically). Overridden by live rate if available. */
const EUR_USD_RATE = 1.08;

export function eurToUsd(eur: number): number {
  return eur * EUR_USD_RATE;
}
