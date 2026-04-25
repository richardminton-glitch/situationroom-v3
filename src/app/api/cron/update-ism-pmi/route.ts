/**
 * GET /api/cron/update-ism-pmi
 *
 * Monthly cron: fetches the most recently released ISM Manufacturing PMI
 * value via Grok with web search, validates it strictly, and merges it
 * into /data/ism-cycle.json (used by the Macro Cycle room).
 *
 * Schedule: 1st – 3rd business day of each month, after ISM's 10:00 ET
 * release window. Suggested crontab line on the VPS:
 *
 *   0 18 1-5 * *  curl -s -H "x-cron-secret: $CRON_SECRET" \
 *     https://situationroom.space/api/cron/update-ism-pmi \
 *     >> /opt/situationroom-v3/logs/cron.log 2>&1
 *
 * The route is idempotent — running multiple times in the same window is
 * safe. If the latest reading already covers the target month, it returns
 * immediately without calling Grok.
 *
 * Failure modes (any → admin email, no file write):
 *   - Grok returns no value or non-JSON
 *   - Parsed value out of plausible PMI range (35–70)
 *   - Parsed month is not the expected target month
 *
 * Auth: x-cron-secret header (matched against CRON_SECRET env).
 */

import { NextRequest, NextResponse } from 'next/server';
import { callGrokAgent } from '@/lib/grok/client';
import { readIsmCycle, writeIsmCycle, upsertReading } from '@/lib/macro-cycle/storage';
import type { IsmReading } from '@/lib/macro-cycle/types';
import { getResend, FROM_ADDRESS, SITE_URL } from '@/lib/newsletter/resend';
import { ADMIN_EMAILS } from '@/lib/auth/tier';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

const CRON_SECRET = process.env.CRON_SECRET || '';
const ADMIN_EMAIL = ADMIN_EMAILS[0] || 'richardminton@gmail.com';

/** Returns the YYYY-MM that ISM should have just released (i.e. previous calendar month). */
function targetMonth(now: Date = new Date()): string {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  return d.toISOString().slice(0, 7);
}

const PROMPT = (target: string) => `What is the headline value of the most recently released ISM Manufacturing PMI from the Institute for Supply Management?

I am looking for the survey month "${target}" (released on the first business day of the following month).

Search the official ISM Report On Business release, PR Newswire, or a reputable financial news outlet (Reuters, Bloomberg, MarketWatch, Trading Economics, YCharts).

Return ONLY a JSON object with no commentary, no markdown, no code fences:
{"month":"YYYY-MM","value":number,"source":"short URL or outlet name"}

Example: {"month":"${target}","value":50.4,"source":"ismworld.org"}

If you cannot find the ${target} reading with high confidence (because it has not been released yet, or sources disagree, or the value is unclear), return:
{"month":null,"value":null,"source":null}

Do not guess. Do not return any text outside the JSON object.`;

interface ParsedResponse {
  month: string | null;
  value: number | null;
  source: string | null;
}

function tryParse(content: string): ParsedResponse | null {
  // Grok sometimes wraps JSON in code fences or adds whitespace — strip those.
  const cleaned = content
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/, '')
    .trim();

  // Grab the first {...} block.
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    const parsed = JSON.parse(match[0]);
    return {
      month:  typeof parsed.month  === 'string' ? parsed.month  : null,
      value:  typeof parsed.value  === 'number' ? parsed.value  : null,
      source: typeof parsed.source === 'string' ? parsed.source : null,
    };
  } catch {
    return null;
  }
}

async function emailAdmin(subject: string, body: string): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    console.warn('[update-ism-pmi] RESEND_API_KEY not set — skipping admin email');
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
    console.error('[update-ism-pmi] admin email failed:', err);
  }
}

export async function GET(req: NextRequest) {
  // Auth
  const secret = req.headers.get('x-cron-secret') || req.nextUrl.searchParams.get('secret');
  if (CRON_SECRET && secret !== CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const target = targetMonth();
  const current = readIsmCycle();
  const latestMonth = current.readings.at(-1)?.month ?? null;

  // Idempotency — already up-to-date.
  if (latestMonth && latestMonth >= target) {
    return NextResponse.json({
      ok: true, action: 'skip', reason: 'already up-to-date',
      target, latestMonth,
    });
  }

  // Ask Grok
  const grok = await callGrokAgent(PROMPT(target));
  if (grok.failed || !grok.content) {
    await emailAdmin(
      `[Situation Room] ISM PMI cron — Grok call failed`,
      [
        `Target month: ${target}`,
        `Latest stored: ${latestMonth ?? 'none'}`,
        `Grok model: ${grok.model}`,
        ``,
        `Update manually with:`,
        `curl -X POST -H "x-cron-secret: $CRON_SECRET" -H "Content-Type: application/json" \\`,
        `  -d '{"month":"${target}","value":XX.X}' \\`,
        `  ${SITE_URL}/api/admin/update-ism`,
        ``,
        `(or via the /admin page — TODO if not yet built)`,
      ].join('\n'),
    );
    return NextResponse.json({ ok: false, reason: 'grok_failed', target, model: grok.model }, { status: 502 });
  }

  const parsed = tryParse(grok.content);
  const sources = grok.sources.slice(0, 5).map((s) => `- ${s.title || ''} ${s.url}`).join('\n') || '(none)';

  const fail = (reason: string, extra?: Record<string, unknown>) => {
    emailAdmin(
      `[Situation Room] ISM PMI cron — needs manual update`,
      [
        `Target month: ${target}`,
        `Latest stored: ${latestMonth ?? 'none'}`,
        `Reason: ${reason}`,
        `Grok raw: ${grok.content.slice(0, 400)}`,
        `Parsed: ${JSON.stringify(parsed)}`,
        ``,
        `Sources Grok cited:`,
        sources,
        ``,
        `Update manually:`,
        `curl -X POST -H "x-cron-secret: $CRON_SECRET" -H "Content-Type: application/json" \\`,
        `  -d '{"month":"${target}","value":XX.X}' \\`,
        `  ${SITE_URL}/api/admin/update-ism`,
      ].join('\n'),
    );
    return NextResponse.json({ ok: false, reason, target, parsed, ...extra }, { status: 422 });
  };

  if (!parsed) return fail('unparseable_response');
  if (parsed.month === null || parsed.value === null) return fail('grok_uncertain');
  if (parsed.month !== target) return fail('month_mismatch');
  if (!Number.isFinite(parsed.value) || parsed.value < 35 || parsed.value > 70) {
    return fail('value_out_of_range');
  }

  // Write
  const reading: IsmReading = {
    month: target,
    value: Math.round(parsed.value * 10) / 10,
    note: `auto · ${parsed.source ?? 'grok'}`,
  };
  const updated = upsertReading(current, reading);

  try {
    writeIsmCycle(updated);
  } catch (err) {
    await emailAdmin(
      `[Situation Room] ISM PMI cron — write failed`,
      `Parsed: ${JSON.stringify(parsed)}\nError: ${String(err)}`,
    );
    return NextResponse.json({ ok: false, reason: 'write_failed' }, { status: 500 });
  }

  await emailAdmin(
    `[Situation Room] ISM PMI updated — ${reading.month} = ${reading.value}`,
    [
      `Successfully updated Macro Cycle room with the latest ISM Manufacturing PMI.`,
      ``,
      `Month:  ${reading.month}`,
      `Value:  ${reading.value}`,
      `Source: ${parsed.source ?? '(grok)'}`,
      `Total readings now: ${updated.readings.length}`,
      ``,
      `Sources Grok cited:`,
      sources,
      ``,
      `View: ${SITE_URL}/rooms/macro-cycle`,
    ].join('\n'),
  );

  return NextResponse.json({ ok: true, action: 'updated', reading, total: updated.readings.length });
}
