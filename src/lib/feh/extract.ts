/**
 * Fiscal Event Horizon — shared Grok extraction utility.
 *
 * Wraps the v3 callGrokAgent client with the FEH-specific contract:
 *
 *   - JSON-only prompts (caller passes the full prompt; this lib parses the
 *     response and tries multiple JSON-extraction strategies)
 *   - Sanity bounds enforcement: caller declares low/high per metric, we
 *     reject + keep last-known-good if Grok returns a value out of range
 *   - Audit-trail row written to `feh_extraction_log` for every attempt,
 *     regardless of outcome (published / sanity_failed / parse_failed /
 *     grok_failed). Records the cited source URL so every published number
 *     has verifiable provenance.
 *   - Admin email on any failure that requires human attention, with a
 *     pre-formatted curl override command.
 *
 * Locked decision (auto-publish + sanity bounds): on a sanity-bound trip we
 * keep the last-known-good value and log + alert. We do NOT block the
 * pipeline waiting for review.
 */

import { callGrokAgent } from '@/lib/grok/client';
import { prisma } from '@/lib/db';
import { getResend, FROM_ADDRESS, SITE_URL } from '@/lib/newsletter/resend';
import { ADMIN_EMAILS } from '@/lib/auth/tier';

const ADMIN_EMAIL = ADMIN_EMAILS[0] || 'richardminton@gmail.com';

export type ExtractOutcome = 'published' | 'sanity_failed' | 'parse_failed' | 'grok_failed';

export interface SanityBound {
  /** Hard floor below which any extraction is rejected. */
  low?: number;
  /** Hard ceiling above which any extraction is rejected. */
  high?: number;
  /**
   * If a prior value is known, the new value must be within
   * [prior * relativeFloor, prior * relativeCeil]. Defaults to 0.5× / 2×.
   * Pass tighter bounds for slow movers (debt/GDP cannot move 2× in a quarter).
   */
  relativeFloor?: number;
  relativeCeil?: number;
}

const DEFAULT_REL_FLOOR = 0.5;
const DEFAULT_REL_CEIL = 2.0;

export interface ExtractionResult<T> {
  outcome: ExtractOutcome;
  parsed: T | null;
  /** Filled with values that passed sanity bounds, ready for DB write. */
  publishable: Partial<T>;
  rejected: Array<{ metric: string; reason: string; oldValue?: number; newValue?: number }>;
  /** Cited source URL extracted from Grok response (best effort). */
  sourceUrl: string | null;
  /** Raw Grok response excerpt (first 800 chars) for the audit log. */
  rawExcerpt: string;
  grokModel: string;
}

/** Strip code fences + surrounding text and parse the first JSON object. */
export function tryParseJson(content: string): unknown | null {
  const cleaned = content
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/, '')
    .trim();
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

/**
 * Apply a sanity bound to a single (oldValue, newValue) pair.
 * Returns null on pass, or a reason string on fail.
 */
export function checkSanityBound(
  newValue: number,
  oldValue: number | null,
  bound: SanityBound,
): string | null {
  if (!Number.isFinite(newValue)) return 'value_not_finite';
  if (bound.low !== undefined && newValue < bound.low) return `below_hard_floor_${bound.low}`;
  if (bound.high !== undefined && newValue > bound.high) return `above_hard_ceil_${bound.high}`;
  if (oldValue !== null && Number.isFinite(oldValue) && oldValue !== 0) {
    const relFloor = bound.relativeFloor ?? DEFAULT_REL_FLOOR;
    const relCeil = bound.relativeCeil ?? DEFAULT_REL_CEIL;
    const ratio = newValue / oldValue;
    if (ratio < relFloor) return `relative_drop_${ratio.toFixed(2)}x_vs_prior`;
    if (ratio > relCeil) return `relative_jump_${ratio.toFixed(2)}x_vs_prior`;
  }
  return null;
}

/** Write one row to the audit log. Best-effort — never throws. */
export async function logExtraction(args: {
  module: string;
  metric: string;
  oldValue: number | null;
  newValue: number | null;
  outcome: ExtractOutcome;
  sanityLow?: number | null;
  sanityHigh?: number | null;
  grokModel?: string | null;
  grokRawExcerpt?: string | null;
  sourceUrl?: string | null;
}): Promise<void> {
  try {
    await prisma.fehExtractionLog.create({
      data: {
        module: args.module,
        metric: args.metric,
        oldValue: args.oldValue,
        newValue: args.newValue,
        outcome: args.outcome,
        sanityLow: args.sanityLow ?? null,
        sanityHigh: args.sanityHigh ?? null,
        grokModel: args.grokModel ?? null,
        grokRawExcerpt: args.grokRawExcerpt?.slice(0, 4000) ?? null,
        sourceUrl: args.sourceUrl ?? null,
      },
    });
  } catch (err) {
    console.error('[feh-extract] audit log write failed:', err);
  }
}

/**
 * Run a Grok prompt and parse a JSON response.
 *
 * Sanity-bound enforcement is delegated to the caller (different modules
 * have different metric shapes), but `runGrokExtraction` returns the
 * parsed JSON + Grok metadata + source URL so the caller can apply
 * `checkSanityBound` and `logExtraction` per-metric.
 */
export async function runGrokExtraction<T>(prompt: string): Promise<{
  parsed: T | null;
  failed: boolean;
  reason?: string;
  rawExcerpt: string;
  sourceUrl: string | null;
  model: string;
}> {
  const grok = await callGrokAgent(prompt);
  const rawExcerpt = (grok.content ?? '').slice(0, 800);
  const sourceUrl = grok.sources[0]?.url ?? null;

  if (grok.failed || !grok.content) {
    return { parsed: null, failed: true, reason: 'grok_failed', rawExcerpt, sourceUrl, model: grok.model };
  }
  const parsed = tryParseJson(grok.content) as T | null;
  if (!parsed) {
    return { parsed: null, failed: true, reason: 'parse_failed', rawExcerpt, sourceUrl, model: grok.model };
  }
  return { parsed, failed: false, rawExcerpt, sourceUrl, model: grok.model };
}

/** Send admin email with a structured failure report. */
export async function emailFehAdmin(subject: string, body: string): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    console.warn('[feh-extract] RESEND_API_KEY not set — skipping admin email');
    return;
  }
  try {
    await getResend().emails.send({
      from: FROM_ADDRESS,
      to: ADMIN_EMAIL,
      subject,
      text: body,
    });
  } catch (err) {
    console.error('[feh-extract] admin email failed:', err);
  }
}

/** Format a rejection report block for inclusion in admin emails. */
export function formatRejections(rejections: Array<{ metric: string; reason: string; oldValue?: number; newValue?: number }>): string {
  if (rejections.length === 0) return '(none)';
  return rejections
    .map((r) => `  - ${r.metric}: ${r.reason} (old=${r.oldValue ?? '—'}, new=${r.newValue ?? '—'})`)
    .join('\n');
}

export const FEH_SITE_URL = SITE_URL;
