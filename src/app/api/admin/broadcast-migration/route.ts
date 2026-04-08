/**
 * POST /api/admin/broadcast-migration
 *
 * One-off announcement broadcast for the v2 → v3 cutover (April 2026).
 * Renders MigrationAnnouncementEmail per recipient and sends via Resend.
 * Reuses the per-user try/catch + log-table pattern from the daily newsletter
 * cron, with a 100ms inter-send delay so we stay well under Resend's rate
 * limit on the small (~53 row) v2 cohort.
 *
 * Auth: admin session OR x-cron-secret header.
 *
 * Body:
 *   {
 *     dryRun?:  boolean,                       // default true
 *     variant?: 'main' | 'reminder',           // default 'main' (T-5 announcement; 'reminder' for T-0)
 *     source?:  string,                        // optional source filter (default: any v2-migration-*)
 *     force?:   boolean,                       // re-send to users who already received it
 *     limit?:   number,                        // optional cap (test sends), default unlimited
 *   }
 *
 * Response:
 *   {
 *     dryRun:   boolean,
 *     variant:  'main' | 'reminder',
 *     eligible: number,
 *     sent:     number,
 *     failed:   number,
 *     skipped:  number,    // already sent + force=false
 *     errors:   Array<{ email, reason }>,
 *   }
 *
 * Recipients: User WHERE source LIKE 'v2-migration-%' (or matches the
 * provided source filter exactly), AND (migrationBroadcastSentAt IS NULL OR
 * force=true).
 *
 * Each successful send writes:
 *   - User.migrationBroadcastSentAt = now
 *   - MigrationBroadcast row (audit log)
 */

import { NextRequest, NextResponse } from 'next/server';
import { render } from '@react-email/components';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth/session';
import { isAdmin } from '@/lib/auth/tier';
import { getResend, FROM_ADDRESS, SITE_URL } from '@/lib/newsletter/resend';
import { createNewsletterToken } from '@/lib/newsletter/tokens';
import {
  MigrationAnnouncementEmail,
  migrationAnnouncementSubject,
} from '@/emails/MigrationAnnouncementEmail';

// Same constant as the import route — every imported user expires here.
const GRANDFATHER_END = new Date('2026-07-14T00:00:00.000Z');

const LEGACY_URL = 'https://legacy.situationroom.space';
const LOGIN_URL  = `${SITE_URL}/login`;

// Resend's free tier allows ~10 req/s. 100ms gives plenty of headroom.
const SEND_INTERVAL_MS = 100;

// Maximum unsubscribe-token TTL — 30 days, since users may not open the
// email immediately and we don't want broken links.
const UNSUB_TOKEN_TTL_SECONDS = 30 * 24 * 60 * 60;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function POST(request: NextRequest) {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const cronSecret = request.headers.get('x-cron-secret');
  const isCronAuth = !!cronSecret && cronSecret === process.env.CRON_SECRET;

  if (!isCronAuth) {
    const sessionUser = await getCurrentUser();
    if (!sessionUser || !isAdmin(sessionUser.email)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }
  }

  // ── Parse body ────────────────────────────────────────────────────────────
  let body: {
    dryRun?:  unknown;
    variant?: unknown;
    source?:  unknown;
    force?:   unknown;
    limit?:   unknown;
  };
  try { body = await request.json(); } catch { body = {}; }

  const dryRun  = body.dryRun !== false; // default true
  const variant = body.variant === 'reminder' ? 'reminder' : 'main';
  const force   = body.force === true;
  const limit   = typeof body.limit === 'number' && body.limit > 0 ? body.limit : undefined;
  const sourceFilter = typeof body.source === 'string' && body.source.trim().length > 0
    ? body.source.trim()
    : null;

  // ── Eligible users ────────────────────────────────────────────────────────
  const where: Prisma.UserWhereInput = sourceFilter
    ? { source: sourceFilter }
    : { source: { startsWith: 'v2-migration-' } };
  if (!force) {
    where.migrationBroadcastSentAt = null;
  }

  const users = await prisma.user.findMany({
    where,
    select: {
      id:                       true,
      email:                    true,
      tier:                     true,
      source:                   true,
      subscriptionExpiresAt:    true,
      migrationBroadcastSentAt: true,
    },
    orderBy: { email: 'asc' },
    ...(limit ? { take: limit } : {}),
  });

  if (users.length === 0) {
    return NextResponse.json({ dryRun, variant, eligible: 0, sent: 0, failed: 0, skipped: 0, errors: [] });
  }

  // Dry run: report counts and the recipient list (truncated). Do not call Resend.
  if (dryRun) {
    return NextResponse.json({
      dryRun:   true,
      variant,
      eligible: users.length,
      sent:     0,
      failed:   0,
      skipped:  0,
      errors:   [],
      sample:   users.slice(0, 20).map((u) => ({ email: u.email, tier: u.tier, source: u.source })),
    });
  }

  // ── Real send ─────────────────────────────────────────────────────────────
  const resend = getResend();
  const subject = migrationAnnouncementSubject[variant];
  const errors: Array<{ email: string; reason: string }> = [];
  let sent    = 0;
  let failed  = 0;
  let skipped = 0;

  for (const user of users) {
    // Tier filter — only General and Members are valid grandfather targets.
    // (Defensive: source filter above should already exclude others.)
    if (user.tier !== 'general' && user.tier !== 'members') {
      skipped++;
      continue;
    }

    const expiresAt = user.subscriptionExpiresAt ?? GRANDFATHER_END;
    const unsubscribeToken = createNewsletterToken(user.id, 'unsubscribe', UNSUB_TOKEN_TTL_SECONDS);
    const unsubscribeUrl = `${SITE_URL}/api/newsletter/unsubscribe?token=${unsubscribeToken}`;

    let emailHtml: string;
    try {
      emailHtml = await render(
        MigrationAnnouncementEmail({
          email:          user.email,
          tier:           user.tier as 'general' | 'members',
          expiresAt,
          loginUrl:       LOGIN_URL,
          legacyUrl:      LEGACY_URL,
          unsubscribeUrl,
          siteUrl:        SITE_URL,
          variant,
        })
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[broadcast-migration] render failed for ${user.email}:`, err);
      errors.push({ email: user.email, reason: `render: ${msg}` });
      failed++;
      continue;
    }

    let status: 'sent' | 'failed' = 'sent';
    let error: string | undefined;

    try {
      await resend.emails.send({
        from:    FROM_ADDRESS,
        to:      user.email,
        subject,
        html:    emailHtml,
      });
      sent++;
    } catch (err) {
      status = 'failed';
      error = err instanceof Error ? err.message : String(err);
      failed++;
      errors.push({ email: user.email, reason: error });
      console.error(`[broadcast-migration] send failed for ${user.email}:`, err);
    }

    // Audit log + flag user as sent. Both wrapped in their own try/catch so a
    // logging failure doesn't stop the whole broadcast.
    try {
      await prisma.migrationBroadcast.create({
        data: {
          userId: user.id,
          email:  user.email,
          tier:   user.tier,
          status,
          error:  error ?? null,
        },
      });
    } catch (logErr) {
      console.error('[broadcast-migration] failed to write MigrationBroadcast row:', logErr);
    }

    if (status === 'sent') {
      try {
        await prisma.user.update({
          where: { id: user.id },
          data:  { migrationBroadcastSentAt: new Date() },
        });
      } catch (updErr) {
        console.error('[broadcast-migration] failed to set migrationBroadcastSentAt:', updErr);
      }
    }

    await sleep(SEND_INTERVAL_MS);
  }

  return NextResponse.json({
    dryRun:   false,
    variant,
    eligible: users.length,
    sent,
    failed,
    skipped,
    errors,
  });
}
