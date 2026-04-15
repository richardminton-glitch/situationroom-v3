/**
 * POST /api/user/chat-display-name
 * Set the user's Ops Chat display name. Members+ only.
 *
 * Validation:
 *   - 3–20 characters after trim
 *   - ASCII letters/digits/underscore/hyphen only (blocks homoglyph impersonation)
 *   - Reserved handles (case-insensitive) rejected
 *   - Cannot start with "anon-" (reserved for the auto-fallback format)
 *   - Must be unique across users (case-insensitive, excluding self)
 *
 * Note: historical ChatMessage.authorDisplay rows are NOT rewritten on rename —
 * the display name is stamped at post time, so only future messages pick up
 * the new value.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth/session';
import { hasAccess, isAdmin } from '@/lib/auth/tier';
import type { Tier } from '@/types';

export const dynamic = 'force-dynamic';

const MIN_LENGTH = 3;
const MAX_LENGTH = 20;
const VALID_CHARS = /^[a-zA-Z0-9_-]+$/;

const RESERVED = new Set([
  'anon',
  'admin',
  'system',
  'bot',
  'moderator',
  'mod',
  'ops',
  'anthropic',
  'claude',
  'situationroom',
  'situation-room',
]);

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userTier = (session.user.tier as Tier) ?? 'free';
  if (!isAdmin(session.user.email) && !hasAccess(userTier, 'members')) {
    return NextResponse.json({ error: 'Members tier required' }, { status: 403 });
  }

  let body: { displayName?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const displayName = (body.displayName ?? '').trim();

  if (displayName.length < MIN_LENGTH) {
    return NextResponse.json({ error: `Must be at least ${MIN_LENGTH} characters` }, { status: 400 });
  }
  if (displayName.length > MAX_LENGTH) {
    return NextResponse.json({ error: `Must be ${MAX_LENGTH} characters or fewer` }, { status: 400 });
  }
  if (!VALID_CHARS.test(displayName)) {
    return NextResponse.json(
      { error: 'Only letters, digits, underscore and hyphen allowed' },
      { status: 400 },
    );
  }
  if (RESERVED.has(displayName.toLowerCase())) {
    return NextResponse.json({ error: 'That name is reserved' }, { status: 400 });
  }
  if (displayName.toLowerCase().startsWith('anon-')) {
    return NextResponse.json({ error: 'Names starting with "anon-" are reserved' }, { status: 400 });
  }

  // Soft uniqueness check (case-insensitive, excluding self).
  const existing = await prisma.user.findFirst({
    where: {
      chatDisplayName: { equals: displayName, mode: 'insensitive' },
      NOT: { id: session.user.id },
    },
    select: { id: true },
  });
  if (existing) {
    return NextResponse.json({ error: 'That name is already taken' }, { status: 409 });
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { chatDisplayName: displayName },
  });

  return NextResponse.json({ ok: true, displayName });
}
