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

    // RCDI — use DB history if there's anything there. Components are derived
    // from the latest history row's per-component scores when DB-backed.
    if (rcdiDb.length > 0) {
      rcdiHistory = rcdiDb.map((r) => ({ date: r.date, value: r.composite }));
      const latest = rcdiDb[rcdiDb.length - 1];
      rcdiComponents = [
        { id: 'gold-usd',    label: 'CB GOLD vs USD ALLOC',  value: latest.goldUsdScore,    weight: 0.30 },
        { id: 'cips-swift',  label: 'CIPS / SWIFT VOL',      value: latest.cipsSwiftScore,  weight: 0.25 },
        { id: 'yuan-oil',    label: 'YUAN OIL SETTLEMENT',   value: latest.yuanOilScore,    weight: 0.25 },
        { id: 'brics-swaps', label: 'BRICS BILATERAL SWAPS', value: latest.bricsSwapScore,  weight: 0.20 },
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
      petroHistory = petroDb.map((r) => ({
        date: r.date,
        dxy: r.dxy,
        yuanOil: r.yuanOil,
        goldRepat: r.goldRepat,
        bricsSwaps: r.bricsSwaps,
      }));
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
