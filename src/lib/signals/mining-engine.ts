/**
 * Mining Intelligence — Pure Computation Functions
 *
 * No API calls. Receives pre-fetched data, returns derived metrics.
 * Used by /api/mining-intel route.
 */

// ── Hash Price ──────────────────────────────────────────────────────────────

export interface HashPricePoint {
  date: string;
  hashPrice: number;   // USD per TH/s per day
  btcPrice: number;
}

/**
 * Compute daily hash price series.
 * Hash price = (block_subsidy_BTC × 144 × btcPrice) / (hashrate_EH × 1e6)
 *
 * The 1e6 converts EH/s to TH/s (1 EH = 1e6 TH).
 * We use 144 blocks/day and current subsidy of 3.125 BTC.
 */
export function computeHashPriceSeries(
  prices: number[],
  hashrates: number[],    // EH/s
  dates: string[],
  subsidyBtc: number = 3.125,
  blocksPerDay: number = 144,
): HashPricePoint[] {
  const len = Math.min(prices.length, hashrates.length, dates.length);
  const result: HashPricePoint[] = [];

  for (let i = 0; i < len; i++) {
    const p = prices[i];
    const h = hashrates[i];
    if (!p || !h || h <= 0) continue;

    const dailyRevenueUsd = subsidyBtc * blocksPerDay * p;
    const hashrateTH = h * 1e6;
    const hashPrice = dailyRevenueUsd / hashrateTH;

    result.push({ date: dates[i], hashPrice, btcPrice: p });
  }

  return result;
}

// ── Margin Signal ───────────────────────────────────────────────────────────

export type MarginSignal = 'profitable' | 'marginal' | 'unprofitable';

/**
 * Determine miner margin signal based on hash price vs breakeven energy cost.
 *
 * Breakeven = (energyCostKwh × joulePerTH × 24) / 1000
 * At 25 J/TH and $0.05/kWh: breakeven = $0.03/TH/day
 */
export function computeMarginSignal(
  hashPrice: number,
  energyCostKwh: number = 0.05,
  efficiency: number = 25,   // J/TH (lower = more efficient)
): { signal: MarginSignal; breakevenHashPrice: number; marginPct: number } {
  // Energy cost per TH per day in USD
  // Power per TH = efficiency W = efficiency/1000 kW
  // Cost per TH per day = (efficiency/1000) × 24 × energyCostKwh
  const breakevenHashPrice = (efficiency / 1000) * 24 * energyCostKwh;
  const marginPct = hashPrice > 0 ? ((hashPrice - breakevenHashPrice) / hashPrice) * 100 : 0;

  let signal: MarginSignal;
  if (marginPct > 20) signal = 'profitable';
  else if (marginPct > 0) signal = 'marginal';
  else signal = 'unprofitable';

  return { signal, breakevenHashPrice, marginPct };
}

// ── Security Budget Projections ─────────────────────────────────────────────

export interface SecurityBudgetProjection {
  year: number;
  halvingEpoch: number;      // 0 = genesis, 4 = current (2024-2028)
  subsidyBtc: number;        // BTC per block
  dailySubsidyUsd: number;
  dailyFeesUsd: number;
  dailyTotalUsd: number;
  subsidyPct: number;
  feePct: number;
}

/** Bitcoin halving schedule */
const HALVINGS = [
  { year: 2009, epoch: 0, subsidy: 50 },
  { year: 2012, epoch: 1, subsidy: 25 },
  { year: 2016, epoch: 2, subsidy: 12.5 },
  { year: 2020, epoch: 3, subsidy: 6.25 },
  { year: 2024, epoch: 4, subsidy: 3.125 },
  { year: 2028, epoch: 5, subsidy: 1.5625 },
  { year: 2032, epoch: 6, subsidy: 0.78125 },
  { year: 2036, epoch: 7, subsidy: 0.390625 },
  { year: 2040, epoch: 8, subsidy: 0.1953125 },
];

/**
 * Project the security budget through future halvings.
 *
 * Fee scenarios (per block):
 *   conservative: current daily fees maintained
 *   base: 2× current
 *   optimistic: 5× current
 */
export function computeSecurityBudget(
  currentBtcPrice: number,
  currentDailyFeesUsd: number,
): { current: SecurityBudgetProjection; projections: SecurityBudgetProjection[] } {
  const blocksPerDay = 144;

  // Current state
  const currentSubsidy = 3.125;
  const currentDailySubsidy = currentSubsidy * blocksPerDay * currentBtcPrice;
  const currentTotal = currentDailySubsidy + currentDailyFeesUsd;

  const current: SecurityBudgetProjection = {
    year: 2026,
    halvingEpoch: 4,
    subsidyBtc: currentSubsidy,
    dailySubsidyUsd: currentDailySubsidy,
    dailyFeesUsd: currentDailyFeesUsd,
    dailyTotalUsd: currentTotal,
    subsidyPct: currentTotal > 0 ? (currentDailySubsidy / currentTotal) * 100 : 0,
    feePct: currentTotal > 0 ? (currentDailyFeesUsd / currentTotal) * 100 : 0,
  };

  // Project future years (each halving + mid-epoch)
  const projections: SecurityBudgetProjection[] = [];

  for (const h of HALVINGS) {
    if (h.year < 2024) continue;

    // Assume BTC price stays constant (conservative) — the chart shows
    // the structural challenge of declining subsidy, not price speculation.
    const dailySub = h.subsidy * blocksPerDay * currentBtcPrice;

    // Three fee levels: we return the "base" (2×) as default
    const dailyFees = currentDailyFeesUsd * 2; // base scenario
    const total = dailySub + dailyFees;

    projections.push({
      year: h.year,
      halvingEpoch: h.epoch,
      subsidyBtc: h.subsidy,
      dailySubsidyUsd: dailySub,
      dailyFeesUsd: dailyFees,
      dailyTotalUsd: total,
      subsidyPct: total > 0 ? (dailySub / total) * 100 : 0,
      feePct: total > 0 ? (dailyFees / total) * 100 : 0,
    });
  }

  return { current, projections };
}

/**
 * Compute security budget projections for all three fee scenarios.
 */
export function computeSecurityBudgetScenarios(
  currentBtcPrice: number,
  currentDailyFeesUsd: number,
): {
  current: SecurityBudgetProjection;
  conservative: SecurityBudgetProjection[];
  base: SecurityBudgetProjection[];
  optimistic: SecurityBudgetProjection[];
} {
  const blocksPerDay = 144;
  const currentSubsidy = 3.125;
  const currentDailySubsidy = currentSubsidy * blocksPerDay * currentBtcPrice;
  const currentTotal = currentDailySubsidy + currentDailyFeesUsd;

  const current: SecurityBudgetProjection = {
    year: 2026,
    halvingEpoch: 4,
    subsidyBtc: currentSubsidy,
    dailySubsidyUsd: currentDailySubsidy,
    dailyFeesUsd: currentDailyFeesUsd,
    dailyTotalUsd: currentTotal,
    subsidyPct: currentTotal > 0 ? (currentDailySubsidy / currentTotal) * 100 : 0,
    feePct: currentTotal > 0 ? (currentDailyFeesUsd / currentTotal) * 100 : 0,
  };

  const feeMultipliers = { conservative: 1, base: 2, optimistic: 5 };
  const scenarios: Record<string, SecurityBudgetProjection[]> = {
    conservative: [],
    base: [],
    optimistic: [],
  };

  for (const [scenario, multiplier] of Object.entries(feeMultipliers)) {
    for (const h of HALVINGS) {
      if (h.year < 2024) continue;
      const dailySub = h.subsidy * blocksPerDay * currentBtcPrice;
      const dailyFees = currentDailyFeesUsd * multiplier;
      const total = dailySub + dailyFees;

      scenarios[scenario].push({
        year: h.year,
        halvingEpoch: h.epoch,
        subsidyBtc: h.subsidy,
        dailySubsidyUsd: dailySub,
        dailyFeesUsd: dailyFees,
        dailyTotalUsd: total,
        subsidyPct: total > 0 ? (dailySub / total) * 100 : 0,
        feePct: total > 0 ? (dailyFees / total) * 100 : 0,
      });
    }
  }

  return {
    current,
    conservative: scenarios.conservative,
    base: scenarios.base,
    optimistic: scenarios.optimistic,
  };
}

// ── Energy Value Model (Capriole / Fidelity) ────────────────────────────────

export interface EnergyValueResult {
  fairValue: number;           // USD — model's estimate of Bitcoin's "fair value"
  premiumPct: number;          // % — how far spot is above/below fair value
  fleetEfficiency: number;     // J/TH — the fleet average used
  energyInputGW: number;       // network power consumption in GW
  supplyGrowthRate: number;    // fractional growth rate (1/s)
}

/**
 * Compute Bitcoin's Energy Value (Charles Edwards / Capriole model).
 *
 * Formula: EV = (Hashrate_H × FleetEfficiency_J/H) / SupplyGrowthRate × FiatFactor
 *
 * Where:
 *   - Hashrate in H/s
 *   - FleetEfficiency = average J per hash across active mining fleet
 *   - SupplyGrowthRate = (new_coins_per_second) / circulating_supply (1/s)
 *   - FiatFactor = 2.0 × 10⁻¹⁵ $/J (fixed constant from model)
 *
 * The fleet efficiency is the hardest input — it's not the latest ASIC (25 J/TH)
 * but the weighted average across the active fleet (~30 J/TH in 2026).
 */
export function computeEnergyValue(
  hashrateEH: number,
  fleetEfficiencyJPerTH: number,
  circulatingSupply: number,
  btcPrice: number,
  subsidyBtc: number = 3.125,
  blocksPerDay: number = 144,
): EnergyValueResult {
  const FIAT_FACTOR = 2.0e-15;

  // Convert hashrate to H/s
  const hashrateH = hashrateEH * 1e18;

  // Convert fleet efficiency from J/TH to J/H
  const fleetEfficiencyJPerH = fleetEfficiencyJPerTH * 1e-12;

  // Energy input (Watts = J/s)
  const energyInputW = hashrateH * fleetEfficiencyJPerH;
  const energyInputGW = energyInputW / 1e9;

  // Supply growth rate: new coins per second / circulating supply
  const newCoinsPerSecond = (subsidyBtc * blocksPerDay) / 86400;
  const supplyGrowthRate = circulatingSupply > 0
    ? newCoinsPerSecond / circulatingSupply
    : 0;

  // Energy Value = energy_input / supply_growth_rate × fiat_factor
  const fairValue = supplyGrowthRate > 0
    ? (energyInputW / supplyGrowthRate) * FIAT_FACTOR
    : 0;

  // Premium/discount vs spot
  const premiumPct = fairValue > 0
    ? ((btcPrice - fairValue) / fairValue) * 100
    : 0;

  return {
    fairValue,
    premiumPct,
    fleetEfficiency: fleetEfficiencyJPerTH,
    energyInputGW,
    supplyGrowthRate,
  };
}

// ── Breakeven BTC Price ─────────────────────────────────────────────────────

/**
 * At what BTC price do miners break even, given current hashrate + energy cost?
 */
export function computeBreakevenBtcPrice(
  hashrateEH: number,
  energyCostKwh: number = 0.05,
  efficiency: number = 25,
  subsidyBtc: number = 3.125,
  blocksPerDay: number = 144,
): number {
  // Daily energy cost for entire network
  // Network power = hashrateEH × 1e18 (H/s) × efficiency (J/TH) / 1e12 (TH/H) = hashrateEH × 1e6 × efficiency W
  // In kW = hashrateEH × 1e6 × efficiency / 1000
  // Daily kWh = above × 24
  // Daily cost = daily kWh × energyCostKwh
  const networkPowerKW = hashrateEH * 1e6 * efficiency / 1000;
  const dailyEnergyCost = networkPowerKW * 24 * energyCostKwh;

  // Daily revenue = subsidy × blocks × price
  // At breakeven: subsidy × blocks × price = dailyEnergyCost
  // price = dailyEnergyCost / (subsidy × blocks)
  const dailyBtcMined = subsidyBtc * blocksPerDay;
  return dailyBtcMined > 0 ? dailyEnergyCost / dailyBtcMined : 0;
}
