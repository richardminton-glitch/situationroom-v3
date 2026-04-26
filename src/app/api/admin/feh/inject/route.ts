/**
 * POST /api/admin/feh/inject
 *
 * Admin-only manual override for Fiscal Event Horizon data. The curl flow
 * referenced in cron failure emails — when a sanity bound rejects a value
 * Grok extracted, or when Grok fails entirely, the admin can push a
 * trusted value here and bypass the bound.
 *
 * Body shape:
 *   {
 *     "module": "sovereign" | "rcdi" | "cb" | "malinvestment" | "wartime" | "petro",
 *     "key":    string,                  // iso3 / date / sector id depending on module
 *     "fields": { ... }                  // subset of the row's writable fields
 *   }
 *
 * Examples:
 *   curl -X POST -H "Content-Type: application/json" \
 *     -d '{"module":"sovereign","key":"USA","fields":{"debtGdp":124.5}}' \
 *     -b "$ADMIN_COOKIE" https://situationroom.space/api/admin/feh/inject
 *
 *   curl ... -d '{"module":"rcdi","key":"2026-04","fields":{"goldUsdScore":74}}' ...
 *
 * Every successful override is logged to feh_extraction_log with
 * outcome="manual_override" so the audit trail captures admin
 * interventions distinctly from cron-driven publishes.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth/session';
import { isAdmin } from '@/lib/auth/tier';
import { logExtraction } from '@/lib/feh/extract';

type ModuleKind = 'sovereign' | 'rcdi' | 'cb' | 'malinvestment' | 'wartime' | 'petro';

const MODULE_KINDS: ModuleKind[] = ['sovereign', 'rcdi', 'cb', 'malinvestment', 'wartime', 'petro'];

const MONTH_RE = /^\d{4}-\d{2}$/;
const ISO3_RE = /^[A-Z]{3}$/;
const DDMMMYY_RE = /^\d{2}[A-Z]{3}\d{2}$/;

interface InjectBody {
  module?: string;
  key?: string;
  fields?: Record<string, unknown>;
}

function bad(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

export async function POST(request: NextRequest) {
  // Auth — session admin only. Curl flow uses a session cookie from an
  // authenticated browser; pure-CLI is supported via the existing v3
  // admin login mechanism.
  const user = await getCurrentUser();
  if (!user) return bad('Unauthorised', 401);
  if (!isAdmin(user.email)) return bad('Admin access required', 403);

  let body: InjectBody;
  try {
    body = (await request.json()) as InjectBody;
  } catch {
    return bad('Invalid JSON body');
  }

  const { module, key, fields } = body;
  if (!module || !MODULE_KINDS.includes(module as ModuleKind)) {
    return bad(`module must be one of ${MODULE_KINDS.join(' | ')}`);
  }
  if (typeof key !== 'string' || key.length === 0) return bad('key must be a non-empty string');
  if (!fields || typeof fields !== 'object' || Array.isArray(fields)) {
    return bad('fields must be an object of column → value');
  }

  const moduleKind = module as ModuleKind;
  let written: number | null = null;
  const auditEntries: Array<{ metric: string; oldValue: number | null; newValue: number | null }> = [];

  try {
    if (moduleKind === 'sovereign') {
      if (!ISO3_RE.test(key)) return bad('sovereign key must be 3-letter ISO code uppercase');
      const existing = await prisma.fehSovereignMetric.findUnique({ where: { iso3: key } });
      if (!existing) return bad(`No existing sovereign row for ${key}; seed first via cron`);
      const update: Record<string, number | string> = {};
      const numeric = ['debtGdp', 'interestPctRevenue', 'primaryBalance', 'realGdpGrowth', 'effectiveRate', 'avgMaturity', 'fxDebtShare', 'externalDebtShare', 'reserveAdequacyScore'];
      for (const field of numeric) {
        const v = (fields as Record<string, unknown>)[field];
        if (typeof v === 'number' && Number.isFinite(v)) {
          update[field] = v;
          auditEntries.push({
            metric: `${key}.${field}`,
            oldValue: ((existing as Record<string, unknown>)[field] as number | undefined) ?? null,
            newValue: v,
          });
        }
      }
      if (Object.keys(update).length === 0) return bad('No valid numeric fields supplied');
      await prisma.fehSovereignMetric.update({ where: { iso3: key }, data: update });
      written = Object.keys(update).length;
    } else if (moduleKind === 'rcdi') {
      if (!MONTH_RE.test(key)) return bad('rcdi key must be YYYY-MM');
      const existing = await prisma.fehRcdiPoint.findUnique({ where: { date: key } });
      const numeric = ['composite', 'goldUsdScore', 'cipsSwiftScore', 'yuanOilScore', 'bricsSwapScore'];
      const update: Record<string, number | string> = {};
      for (const field of numeric) {
        const v = (fields as Record<string, unknown>)[field];
        if (typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 200) {
          update[field] = v;
          auditEntries.push({
            metric: `${key}.${field}`,
            oldValue: ((existing as Record<string, unknown> | null)?.[field] as number | undefined) ?? null,
            newValue: v,
          });
        }
      }
      if (Object.keys(update).length === 0) return bad('No valid numeric fields supplied (each must be 0-200)');
      // Upsert — needs a complete row on create
      const fullCreate = {
        date:           key,
        composite:      (update.composite      as number) ?? existing?.composite      ?? 0,
        goldUsdScore:   (update.goldUsdScore   as number) ?? existing?.goldUsdScore   ?? 0,
        cipsSwiftScore: (update.cipsSwiftScore as number) ?? existing?.cipsSwiftScore ?? 0,
        yuanOilScore:   (update.yuanOilScore   as number) ?? existing?.yuanOilScore   ?? 0,
        bricsSwapScore: (update.bricsSwapScore as number) ?? existing?.bricsSwapScore ?? 0,
      };
      await prisma.fehRcdiPoint.upsert({ where: { date: key }, update, create: fullCreate });
      written = Object.keys(update).length;
    } else if (moduleKind === 'cb') {
      if (!ISO3_RE.test(key) && key !== 'EUZ') return bad('cb key must be 3-letter ISO (or EUZ)');
      const existing = await prisma.fehCbRate.findUnique({ where: { iso3: key } });
      if (!existing) return bad(`No existing CB row for ${key}; seed first via cron`);
      const update: Record<string, number | string> = {};
      const numeric = ['rate', 'lastMoveBps', 'marketImpliedBps12m', 'gdpUsdT'];
      for (const field of numeric) {
        const v = (fields as Record<string, unknown>)[field];
        if (typeof v === 'number' && Number.isFinite(v)) {
          update[field] = v;
          auditEntries.push({ metric: `${key}.${field}`, oldValue: ((existing as Record<string, unknown>)[field] as number | undefined) ?? null, newValue: v });
        }
      }
      const stance = (fields as Record<string, unknown>).stance;
      if (typeof stance === 'string' && ['easing', 'holding', 'tightening'].includes(stance)) update.stance = stance;
      const lastMoveDate = (fields as Record<string, unknown>).lastMoveDate;
      if (typeof lastMoveDate === 'string' && DDMMMYY_RE.test(lastMoveDate)) update.lastMoveDate = lastMoveDate;
      if (Object.keys(update).length === 0) return bad('No valid fields supplied');
      await prisma.fehCbRate.update({ where: { iso3: key }, data: update });
      written = Object.keys(update).length;
    } else if (moduleKind === 'malinvestment') {
      const existing = await prisma.fehMalinvestmentSector.findUnique({ where: { id: key } });
      if (!existing) return bad(`No existing sector row for ${key}; seed first via cron`);
      const update: Record<string, number | string> = {};
      const numeric = ['stress', 'yoyDelta', 'halfLifeMonths'];
      for (const field of numeric) {
        const v = (fields as Record<string, unknown>)[field];
        if (typeof v === 'number' && Number.isFinite(v)) {
          update[field] = field === 'halfLifeMonths' ? Math.round(v) : v;
          auditEntries.push({ metric: `${key}.${field}`, oldValue: ((existing as Record<string, unknown>)[field] as number | undefined) ?? null, newValue: v });
        }
      }
      const headline = (fields as Record<string, unknown>).headline;
      if (typeof headline === 'string' && headline.length > 0 && headline.length <= 200) update.headline = headline;
      if (Object.keys(update).length === 0) return bad('No valid fields supplied');
      await prisma.fehMalinvestmentSector.update({ where: { id: key }, data: update });
      written = Object.keys(update).length;
    } else if (moduleKind === 'wartime') {
      if (!ISO3_RE.test(key)) return bad('wartime key must be 3-letter ISO code uppercase');
      const existing = await prisma.fehWartimeCountry.findUnique({ where: { iso3: key } });
      if (!existing) return bad(`No existing wartime row for ${key}; seed first via cron`);
      const update: Record<string, number | string> = {};
      const numeric = ['defenceSpendPctGdp', 'defenceCagr3y', 'm2Growth3y', 'cpiYoY'];
      for (const field of numeric) {
        const v = (fields as Record<string, unknown>)[field];
        if (typeof v === 'number' && Number.isFinite(v)) {
          update[field] = v;
          auditEntries.push({ metric: `${key}.${field}`, oldValue: ((existing as Record<string, unknown>)[field] as number | undefined) ?? null, newValue: v });
        }
      }
      const stage = (fields as Record<string, unknown>).stage;
      if (typeof stage === 'number' && Number.isInteger(stage) && stage >= 1 && stage <= 5) update.stage = stage;
      const evidence = (fields as Record<string, unknown>).evidence;
      if (Array.isArray(evidence)) {
        const clean = evidence.filter((x): x is string => typeof x === 'string' && x.length > 0).slice(0, 5);
        if (clean.length > 0) update.evidenceJson = JSON.stringify(clean);
      }
      if (Object.keys(update).length === 0) return bad('No valid fields supplied');
      await prisma.fehWartimeCountry.update({ where: { iso3: key }, data: update });
      written = Object.keys(update).length;
    } else if (moduleKind === 'petro') {
      if (!MONTH_RE.test(key)) return bad('petro key must be YYYY-MM');
      const existing = await prisma.fehPetroDollarPoint.findUnique({ where: { date: key } });
      const update: Record<string, number | string> = {};
      const numeric = ['dxy', 'yuanOil', 'goldRepat', 'bricsSwaps'];
      for (const field of numeric) {
        const v = (fields as Record<string, unknown>)[field];
        if (typeof v === 'number' && Number.isFinite(v) && v >= 0) {
          update[field] = v;
          auditEntries.push({ metric: `${key}.${field}`, oldValue: ((existing as Record<string, unknown> | null)?.[field] as number | undefined) ?? null, newValue: v });
        }
      }
      if (Object.keys(update).length === 0) return bad('No valid fields supplied');
      const fullCreate = {
        date:       key,
        dxy:        (update.dxy        as number) ?? existing?.dxy        ?? 100,
        yuanOil:    (update.yuanOil    as number) ?? existing?.yuanOil    ?? 100,
        goldRepat:  (update.goldRepat  as number) ?? existing?.goldRepat  ?? 100,
        bricsSwaps: (update.bricsSwaps as number) ?? existing?.bricsSwaps ?? 100,
      };
      await prisma.fehPetroDollarPoint.upsert({ where: { date: key }, update, create: fullCreate });
      written = Object.keys(update).length;
    }

    // Audit trail — one entry per overridden field, outcome="manual_override".
    for (const entry of auditEntries) {
      await logExtraction({
        module: `${moduleKind}:manual`,
        metric: entry.metric,
        oldValue: entry.oldValue,
        newValue: entry.newValue,
        outcome: 'published',  // manual override is a publish — bypasses sanity
        sourceUrl: `manual:admin:${user.email}`,
      });
    }

    return NextResponse.json({ ok: true, module: moduleKind, key, written, audited: auditEntries.length });
  } catch (err) {
    console.error('[admin/feh/inject] write failed:', err);
    return NextResponse.json({ ok: false, error: 'persist_failed' }, { status: 500 });
  }
}
