/**
 * GET /api/feh
 *
 * Single read endpoint for the Fiscal Event Horizon page. Returns all six
 * modules' data — DB rows where the cron has populated, seed values
 * everywhere else. The client provider (FehDataProvider) consumes the JSON
 * and falls back gracefully if the response 5xxs (seed remains rendered).
 *
 * Public — page is publicly visible, drilldowns gate via Redacted, not
 * via the API.
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { SOVEREIGNS_SEED } from '@/lib/feh/sovereigns-seed';
import {
  RCDI_HISTORY, RCDI_COMPONENTS, RCDI_ANNOTATIONS,
  type RCDIPoint, type RCDIComponent, type RCDIAnnotation,
} from '@/lib/feh/rcdi-seed';
import { CB_RATES, type CBRate } from '@/lib/feh/cb-rates-seed';
import { MALINVESTMENT_SECTORS, type MalinvestmentSector } from '@/lib/feh/malinvestment-seed';
import { WARTIME_COUNTRIES, type WartimeCountry, type WartimeStage } from '@/lib/feh/wartime-seed';
import { PETRO_HISTORY, PETRO_ANNOTATIONS, type PetroPoint } from '@/lib/feh/petro-dollar-seed';
import type { Sovereign } from '@/lib/feh/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  // Default: seed. Each block below upgrades its slice when DB has data.
  let sovereigns: Sovereign[] = SOVEREIGNS_SEED;
  let rcdiHistory: RCDIPoint[] = RCDI_HISTORY;
  let rcdiComponents: RCDIComponent[] = RCDI_COMPONENTS;
  let cbRates: CBRate[] = CB_RATES;
  let malinvestmentSectors: MalinvestmentSector[] = MALINVESTMENT_SECTORS;
  let wartimeCountries: WartimeCountry[] = WARTIME_COUNTRIES;
  let petroHistory: PetroPoint[] = PETRO_HISTORY;

  let source: 'seed' | 'db' | 'mixed' = 'seed';

  try {
    const [sovDb, rcdiDb, cbDb, malDb, warDb, petroDb] = await Promise.all([
      prisma.fehSovereignMetric.findMany(),
      prisma.fehRcdiPoint.findMany({ orderBy: { date: 'asc' } }),
      prisma.fehCbRate.findMany(),
      prisma.fehMalinvestmentSector.findMany(),
      prisma.fehWartimeCountry.findMany(),
      prisma.fehPetroDollarPoint.findMany({ orderBy: { date: 'asc' } }),
    ]);

    // Sovereign metrics — use DB if it has the full panel.
    if (sovDb.length >= SOVEREIGNS_SEED.length) {
      sovereigns = sovDb.map((r) => ({
        iso3: r.iso3,
        isoNumeric: r.isoNumeric,
        name: r.countryName,
        region: r.region as Sovereign['region'],
        debtGdp: r.debtGdp,
        interestPctRevenue: r.interestPctRevenue,
        primaryBalance: r.primaryBalance,
        realGdpGrowth: r.realGdpGrowth,
        effectiveRate: r.effectiveRate,
        avgMaturity: r.avgMaturity,
        fxDebtShare: r.fxDebtShare,
        externalDebtShare: r.externalDebtShare,
        reserveAdequacyScore: r.reserveAdequacyScore,
      }));
      source = 'mixed';
    }

    // RCDI — merge DB rows over seed history by date so a thin DB tail (cron
    // typically writes a single current-month row) doesn't collapse the chart.
    // Components are derived from the latest row of the merged history.
    if (rcdiDb.length > 0) {
      const dbByDate = new Map(rcdiDb.map((r) => [r.date, r] as const));
      const merged: RCDIPoint[] = RCDI_HISTORY.map((seed) => {
        const r = dbByDate.get(seed.date);
        return r ? { date: r.date, value: r.composite } : seed;
      });
      const seedDates = new Set(RCDI_HISTORY.map((s) => s.date));
      for (const r of rcdiDb) {
        if (!seedDates.has(r.date)) {
          merged.push({ date: r.date, value: r.composite });
        }
      }
      merged.sort((a, b) => a.date.localeCompare(b.date));
      rcdiHistory = merged;

      // Use the chronologically latest DB row's components for the gauges
      // (cron writes per-component scores; the seed has a single current set).
      const latestDb = rcdiDb.reduce((acc, r) => (r.date > acc.date ? r : acc), rcdiDb[0]);
      rcdiComponents = [
        { id: 'gold-usd',    label: 'CB GOLD vs USD ALLOC',  value: latestDb.goldUsdScore,    weight: 0.30 },
        { id: 'cips-swift',  label: 'CIPS / SWIFT VOL',      value: latestDb.cipsSwiftScore,  weight: 0.25 },
        { id: 'yuan-oil',    label: 'YUAN OIL SETTLEMENT',   value: latestDb.yuanOilScore,    weight: 0.25 },
        { id: 'brics-swaps', label: 'BRICS BILATERAL SWAPS', value: latestDb.bricsSwapScore,  weight: 0.20 },
      ];
      source = 'mixed';
    }

    if (cbDb.length >= CB_RATES.length) {
      cbRates = cbDb.map((r) => ({
        iso3: r.iso3,
        name: r.countryName,
        bank: r.bank,
        rate: r.rate,
        lastMoveBps: r.lastMoveBps,
        lastMoveDate: r.lastMoveDate,
        stance: r.stance as CBRate['stance'],
        marketImpliedBps12m: r.marketImpliedBps12m,
        gdpUsdT: r.gdpUsdT,
      }));
      source = 'mixed';
    }

    if (malDb.length >= MALINVESTMENT_SECTORS.length) {
      malinvestmentSectors = malDb.map((r) => {
        const seed = MALINVESTMENT_SECTORS.find((s) => s.id === r.id);
        return {
          id: r.id,
          short: r.short ?? seed?.short ?? r.id,
          label: r.label,
          stress: r.stress,
          headline: r.headline,
          yoyDelta: r.yoyDelta,
          halfLifeMonths: r.halfLifeMonths,
        };
      });
      source = 'mixed';
    }

    if (warDb.length >= WARTIME_COUNTRIES.length) {
      wartimeCountries = warDb.map((r) => {
        let evidence: string[] = [];
        try {
          const parsed = JSON.parse(r.evidenceJson);
          if (Array.isArray(parsed)) evidence = parsed.filter((x): x is string => typeof x === 'string');
        } catch { /* fall through */ }
        return {
          iso3: r.iso3,
          name: r.name,
          flag: r.flag,
          stage: Math.max(1, Math.min(5, r.stage)) as WartimeStage,
          defenceSpendPctGdp: r.defenceSpendPctGdp,
          defenceCagr3y: r.defenceCagr3y,
          m2Growth3y: r.m2Growth3y,
          cpiYoY: r.cpiYoY,
          evidence,
        };
      });
      source = 'mixed';
    }

    if (petroDb.length > 0) {
      // The cron only ever appends the current month, so petroDb is typically
      // a thin tail (often 1 row). Merge over seed by date — DB wins where it
      // has a value, seed fills the historical gap. Without this the chart
      // collapses to a single point and divides by zero.
      const dbByDate = new Map(petroDb.map((r) => [r.date, r] as const));
      petroHistory = PETRO_HISTORY.map((seed) => {
        const r = dbByDate.get(seed.date);
        return r
          ? { date: r.date, dxy: r.dxy, yuanOil: r.yuanOil, goldRepat: r.goldRepat, bricsSwaps: r.bricsSwaps }
          : seed;
      });
      // Append any DB dates that fall after the seed window (cron-extended
      // future months once we live past Apr 2026).
      const seedDates = new Set(PETRO_HISTORY.map((s) => s.date));
      for (const r of petroDb) {
        if (!seedDates.has(r.date)) {
          petroHistory.push({
            date: r.date, dxy: r.dxy, yuanOil: r.yuanOil,
            goldRepat: r.goldRepat, bricsSwaps: r.bricsSwaps,
          });
        }
      }
      petroHistory.sort((a, b) => a.date.localeCompare(b.date));
      source = 'mixed';
    }
  } catch (err) {
    // Tables may not exist (migrate not yet run) — fall through to seed values.
    console.warn('[/api/feh] DB read failed — returning seed:', err);
  }

  return NextResponse.json({
    source,
    sovereigns,
    rcdiHistory,
    rcdiComponents,
    rcdiAnnotations: RCDI_ANNOTATIONS,
    cbRates,
    malinvestmentSectors,
    wartimeCountries,
    petroHistory,
    petroAnnotations: PETRO_ANNOTATIONS,
  });
}
