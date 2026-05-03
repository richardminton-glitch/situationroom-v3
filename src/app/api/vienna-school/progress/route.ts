/**
 * /api/vienna-school/progress
 *
 * GET  → returns the current user's curriculum progress
 *        ({ modulesCompleted: string[], graduationDate: string|null })
 *
 * POST → upserts the user's progress. Idempotent: posting an
 *        already-recorded slug is a no-op. Sets graduationDate the first
 *        time the modulesCompleted set covers all 6 module slugs.
 *
 * Both routes are auth-gated. Anonymous users fall back to the localStorage
 * branch in useVsProgress — they get a working tracker for the duration
 * of their session but lose it on browser-data wipe.
 *
 * The dev-master synthetic user has id "dev-master-{role}" which is not a
 * real DB row — for that case we short-circuit and return ephemeral state
 * rather than upserting a row that would orphan a foreign key.
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db';
import { MODULE_STUB_ORDER, TOTAL_MODULES } from '@/content/vienna-school';

const VALID_SLUGS = new Set(MODULE_STUB_ORDER.map((s) => s.slug));

/**
 * POST body is a discriminated union — either:
 *
 *   { moduleSlug }       → mark a module complete (idempotent add)
 *   { bookId, read }     → toggle a reading-ladder book on/off
 *
 * Validating up-front with Zod gives us a clean 400 on malformed bodies
 * and lets the handler branch on shape rather than peeking at fields.
 */
const PostBody = z.discriminatedUnion('kind', [
  z.object({
    kind:       z.literal('module'),
    moduleSlug: z.string().refine((s) => VALID_SLUGS.has(s), 'Unknown module slug'),
  }),
  z.object({
    kind:   z.literal('book'),
    /** Composite ID `{moduleSlug}:{slugifiedTitle}`. Validated only for
     *  shape — we trust the slug content since the source of truth is
     *  the curriculum data file in the same repo. */
    bookId: z.string().min(3).max(120).regex(/^[a-z0-9-]+:[a-z0-9-]+$/, 'Bad bookId shape'),
    /** True = mark read; false = mark unread. */
    read:   z.boolean(),
  }),
]);

interface ProgressView {
  modulesCompleted:  string[];
  booksRead:         string[];
  graduationDate:    string | null;
}

const EMPTY: ProgressView = { modulesCompleted: [], booksRead: [], graduationDate: null };

function isDevMaster(userId: string): boolean {
  return userId.startsWith('dev-master-');
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ authed: false, progress: EMPTY }, { status: 401 });
  if (isDevMaster(user.id)) {
    // Dev-master users aren't backed by a real DB row; their progress is
    // session-local. Return empty and let localStorage take over.
    return NextResponse.json({ authed: true, devMaster: true, progress: EMPTY });
  }

  const row = await prisma.vienneSchoolProgress.findUnique({ where: { userId: user.id } });
  return NextResponse.json({
    authed:   true,
    progress: row
      ? {
          modulesCompleted: row.modulesCompleted,
          booksRead:        row.booksRead,
          graduationDate:   row.graduationDate?.toISOString() ?? null,
        }
      : EMPTY,
  });
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });

  // Backwards-compat: older clients (< this commit) post `{ moduleSlug }`
  // without a `kind` discriminator. Sniff the body and inject a default.
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }
  if (raw && typeof raw === 'object' && !('kind' in raw)) {
    if ('moduleSlug' in raw) (raw as Record<string, unknown>).kind = 'module';
    else if ('bookId' in raw) (raw as Record<string, unknown>).kind = 'book';
  }

  let body: z.infer<typeof PostBody>;
  try {
    body = PostBody.parse(raw);
  } catch (err) {
    return NextResponse.json({ error: 'invalid body', detail: String(err) }, { status: 400 });
  }

  if (isDevMaster(user.id)) {
    return NextResponse.json({ ok: true, devMaster: true, progress: EMPTY });
  }

  const result = await prisma.$transaction(async (tx) => {
    const existing = await tx.vienneSchoolProgress.findUnique({ where: { userId: user.id } });
    const currModules = existing?.modulesCompleted ?? [];
    const currBooks   = existing?.booksRead        ?? [];

    if (body.kind === 'module') {
      if (currModules.includes(body.moduleSlug)) {
        return existing ?? { userId: user.id, modulesCompleted: [], booksRead: [], graduationDate: null, updatedAt: new Date() };
      }
      const nextModules = [...currModules, body.moduleSlug];
      const graduating  = !existing?.graduationDate && nextModules.length >= TOTAL_MODULES;
      return tx.vienneSchoolProgress.upsert({
        where:  { userId: user.id },
        create: {
          userId:           user.id,
          modulesCompleted: nextModules,
          booksRead:        currBooks,
          graduationDate:   graduating ? new Date() : null,
        },
        update: {
          modulesCompleted: nextModules,
          ...(graduating ? { graduationDate: new Date() } : {}),
        },
      });
    }

    // body.kind === 'book' — toggle on/off
    const has = currBooks.includes(body.bookId);
    if (body.read && has) return existing!;        // no-op: already read
    if (!body.read && !has) return existing!;      // no-op: already unread
    const nextBooks = body.read
      ? [...currBooks, body.bookId]
      : currBooks.filter((b) => b !== body.bookId);
    return tx.vienneSchoolProgress.upsert({
      where:  { userId: user.id },
      create: {
        userId:           user.id,
        modulesCompleted: currModules,
        booksRead:        nextBooks,
      },
      update: { booksRead: nextBooks },
    });
  });

  return NextResponse.json({
    ok: true,
    progress: {
      modulesCompleted: result.modulesCompleted,
      booksRead:        result.booksRead,
      graduationDate:   result.graduationDate?.toISOString() ?? null,
    },
  });
}
