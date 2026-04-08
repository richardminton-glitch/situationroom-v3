/**
 * POST /api/admin/import-v2
 *
 * One-off bulk import for the v2 → v3 cutover (April 2026). Upserts a list of
 * { email, tier } rows into the User table, grandfathering each one until a
 * fixed end date (GRANDFATHER_END below). Idempotent and dry-run-by-default.
 *
 * Auth: admin session OR x-cron-secret header.
 *
 * Body:
 *   {
 *     dryRun?: boolean,         // default true — must pass false to write
 *     rows:    Array<{ email: string, tier: 'general' | 'members' }>
 *   }
 *
 * Response:
 *   {
 *     dryRun:        boolean,
 *     rowCount:      number,
 *     insertedCount: number,
 *     updatedCount:  number,
 *     skippedCount:  number,    // existing user already at >= requested tier, or has source already set
 *     errorCount:    number,
 *     errors:        Array<{ email: string, reason: string }>,
 *     sample:        Array<{ email: string, action: 'insert'|'update'|'skip' }>
 *   }
 *
 * Behaviour rules:
 *   - emails are lowercased.
 *   - For new users: pin is left null so they claim a fresh PIN on first
 *     /api/auth/send-pin (matches the existing getOrCreatePin flow).
 *   - For existing users (e.g. an organic v3 signup that happens to share the
 *     v2 email): tier is NEVER downgraded, pin is NEVER overwritten. The
 *     row is updated only if the existing tier ranks below the requested
 *     tier AND `source` is null (i.e. they're not already an imported user).
 *   - subscriptionExpiresAt is set to GRANDFATHER_END for every imported
 *     user. The existing processExpiredSubscriptions cron will auto-drop
 *     them on that date.
 *   - newsletterEnabled is set to true and newsletterConfirmedAt is set to
 *     `now`, because the v2 mailing list is opt-in.
 *
 * Safety rails:
 *   - Reject if rows.length > 5000 (one-off sanity bound).
 *   - Reject any row with a malformed email.
 *   - On dry-run, the whole operation runs inside a transaction that always
 *     rolls back, so counts are accurate without writing.
 *   - On real run, an audit row is written to the MigrationImport table.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth/session';
import { isAdmin, TIER_ORDER } from '@/lib/auth/tier';
import type { Tier } from '@/types';

// Fixed grandfather end date — 90 days from cutover (2026-04-15 + 90d).
// Hardcoded by design: every imported user gets the same expiry, so the
// processExpiredSubscriptions cron drops them all on the same day.
const GRANDFATHER_END = new Date('2026-07-14T00:00:00.000Z');

const MAX_ROWS = 5000;
const MAX_ERRORS_BEFORE_ABORT = 10;
const SAMPLE_SIZE = 20;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type ImportTier = Extract<Tier, 'general' | 'members'>;

interface ImportRow {
  email: string;
  tier: ImportTier;
}

interface RowResult {
  email: string;
  action: 'insert' | 'update' | 'skip' | 'error';
  reason?: string;
}

// Sentinel error to force a transaction rollback for dry-run.
class DryRunRollback extends Error {
  constructor(public payload: unknown) {
    super('DryRunRollback');
  }
}

export async function POST(request: NextRequest) {
  // ── Auth: admin session OR cron secret ─────────────────────────────────────
  const cronSecret = request.headers.get('x-cron-secret');
  const isCronAuth = !!cronSecret && cronSecret === process.env.CRON_SECRET;

  let actorEmail = 'cron';
  if (!isCronAuth) {
    const sessionUser = await getCurrentUser();
    if (!sessionUser || !isAdmin(sessionUser.email)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }
    actorEmail = sessionUser.email;
  }

  // ── Parse + validate body ─────────────────────────────────────────────────
  let body: { dryRun?: boolean; rows?: unknown };
  try { body = await request.json(); } catch { body = {}; }

  const dryRun = body.dryRun !== false; // default true
  const rawRows = Array.isArray(body.rows) ? body.rows : null;
  if (!rawRows) {
    return NextResponse.json({ error: 'rows must be a non-empty array' }, { status: 400 });
  }
  if (rawRows.length === 0) {
    return NextResponse.json({ error: 'rows is empty' }, { status: 400 });
  }
  if (rawRows.length > MAX_ROWS) {
    return NextResponse.json(
      { error: `rows.length > ${MAX_ROWS} — refusing` },
      { status: 400 },
    );
  }

  // Normalise + validate every row up front.
  const rows: ImportRow[] = [];
  const validationErrors: Array<{ email: string; reason: string }> = [];
  for (const r of rawRows) {
    if (!r || typeof r !== 'object') {
      validationErrors.push({ email: String(r), reason: 'row not an object' });
      continue;
    }
    const obj = r as Record<string, unknown>;
    const email = typeof obj.email === 'string' ? obj.email.trim().toLowerCase() : '';
    const tier  = typeof obj.tier  === 'string' ? obj.tier.trim().toLowerCase() : '';
    if (!EMAIL_RE.test(email)) {
      validationErrors.push({ email, reason: 'malformed email' });
      continue;
    }
    if (tier !== 'general' && tier !== 'members') {
      validationErrors.push({ email, reason: `tier must be general|members, got "${tier}"` });
      continue;
    }
    rows.push({ email, tier: tier as ImportTier });
  }
  if (validationErrors.length > MAX_ERRORS_BEFORE_ABORT) {
    return NextResponse.json(
      {
        error: `${validationErrors.length} validation errors — aborting`,
        errors: validationErrors.slice(0, MAX_ERRORS_BEFORE_ABORT),
      },
      { status: 400 },
    );
  }
  // De-dupe by email; keep highest tier if duplicate.
  const byEmail = new Map<string, ImportTier>();
  for (const r of rows) {
    const existing = byEmail.get(r.email);
    if (!existing) {
      byEmail.set(r.email, r.tier);
    } else if (TIER_ORDER.indexOf(r.tier) > TIER_ORDER.indexOf(existing)) {
      byEmail.set(r.email, r.tier);
    }
  }
  const dedupedRows: ImportRow[] = Array.from(byEmail, ([email, tier]) => ({ email, tier }));

  // ── Run the import inside a transaction ──────────────────────────────────
  const counters = { inserted: 0, updated: 0, skipped: 0, errors: 0 };
  const results: RowResult[] = [];

  const runTxn = async () => {
    return prisma.$transaction(async (tx) => {
      for (const row of dedupedRows) {
        try {
          const existing = await tx.user.findUnique({
            where: { email: row.email },
            select: { id: true, tier: true, source: true, pin: true },
          });

          if (!existing) {
            // Create path
            await tx.user.create({
              data: {
                email:                  row.email,
                tier:                   row.tier,
                pin:                    null,
                source:                 `v2-migration-${row.tier}`,
                subscriptionActivatedAt: new Date(),
                subscriptionExpiresAt:   GRANDFATHER_END,
                newsletterEnabled:       true,
                newsletterConfirmedAt:   new Date(),
                timezone:                'Europe/London',
                themePref:               'parchment',
              },
            });
            counters.inserted++;
            results.push({ email: row.email, action: 'insert' });
            continue;
          }

          // Existing user. Skip if:
          //   - already higher-tier than requested (don't downgrade), OR
          //   - already has a source set (already imported by a previous run).
          const existingRank = TIER_ORDER.indexOf(existing.tier as Tier);
          const requestedRank = TIER_ORDER.indexOf(row.tier);
          if (existingRank >= requestedRank) {
            counters.skipped++;
            results.push({ email: row.email, action: 'skip', reason: `existing tier=${existing.tier} >= requested=${row.tier}` });
            continue;
          }
          if (existing.source) {
            counters.skipped++;
            results.push({ email: row.email, action: 'skip', reason: `already imported (source=${existing.source})` });
            continue;
          }

          // Update path: lift the tier, set the grandfather expiry. Never
          // touch pin (the user already claimed one) and do NOT touch their
          // newsletter preferences — they already chose them as a v3 user.
          await tx.user.update({
            where: { id: existing.id },
            data: {
              tier:                    row.tier,
              source:                  `v2-migration-${row.tier}`,
              subscriptionActivatedAt: new Date(),
              subscriptionExpiresAt:   GRANDFATHER_END,
            },
          });
          counters.updated++;
          results.push({ email: row.email, action: 'update' });
        } catch (err) {
          counters.errors++;
          const msg = err instanceof Error ? err.message : String(err);
          results.push({ email: row.email, action: 'error', reason: msg });
          if (counters.errors > MAX_ERRORS_BEFORE_ABORT) {
            throw new Error(`aborting: > ${MAX_ERRORS_BEFORE_ABORT} errors`);
          }
        }
      }

      // Audit row — only on real runs. The throw below rolls back dry runs.
      if (!dryRun) {
        await tx.migrationImport.create({
          data: {
            actorEmail,
            rowCount:      dedupedRows.length,
            insertedCount: counters.inserted,
            updatedCount:  counters.updated,
            skippedCount:  counters.skipped,
            errorCount:    counters.errors,
            notes:         `validation_errors=${validationErrors.length} dryRun=${dryRun}`,
          },
        });
      }

      if (dryRun) {
        // Force rollback by throwing — counts are captured outside the txn.
        throw new DryRunRollback({ counters, results });
      }
    });
  };

  try {
    await runTxn();
  } catch (err) {
    if (!(err instanceof DryRunRollback)) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[import-v2] transaction failed:', err);
      return NextResponse.json({ error: msg, counters, results: results.slice(0, SAMPLE_SIZE) }, { status: 500 });
    }
    // dry-run path: counters/results were populated by the txn before the throw
  }

  return NextResponse.json({
    dryRun,
    rowCount:      dedupedRows.length,
    insertedCount: counters.inserted,
    updatedCount:  counters.updated,
    skippedCount:  counters.skipped,
    errorCount:    counters.errors,
    validationErrors,
    sample:        results.slice(0, SAMPLE_SIZE),
  });
}
