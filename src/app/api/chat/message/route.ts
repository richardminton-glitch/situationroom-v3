/**
 * POST /api/chat/message
 * Post a message to the Ops Room. Requires Members+ tier.
 *
 * Spam rules (layered — fails the first check that trips):
 *   1. Min 2 non-whitespace chars (blocks "." / whitespace spam).
 *   2. Max 500 chars.
 *   3. Hard throttle: 1 message per 3 seconds per user (prevents double-submit).
 *   4. Flood guard: max 10 messages per rolling 60 seconds.
 *   5. Dedup: identical content from same user within 60s is rejected.
 *   6. Caps lock: if > 20 chars AND > 70% uppercase letters, reject.
 *   7. Character repetition: any char repeated 10+ times in a row, reject.
 *   8. Link flood: max 2 URLs per message.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth/session';
import { hasAccess, isAdmin } from '@/lib/auth/tier';
import type { Tier } from '@/types';

export const dynamic = 'force-dynamic';

const MIN_CONTENT_LENGTH       = 2;
const MAX_CONTENT_LENGTH       = 500;
const RATE_LIMIT_MS            = 3_000;              // 3s between consecutive posts
const FLOOD_WINDOW_MS          = 60_000;             // 60s rolling window for flood guard
const FLOOD_WINDOW_MAX         = 10;                 // max messages in the 60s window
const DEDUP_WINDOW_MS          = 60_000;             // reject identical content within 60s
const CAPS_MIN_LENGTH          = 20;                 // only evaluate caps-lock above this length
const CAPS_MAX_RATIO           = 0.7;                // > 70% uppercase letters = shouting
const MAX_REPEAT_CHARS         = 9;                  // "aaaaaaaaaa" (10+ of a kind) is spam
const MAX_URLS_PER_MESSAGE     = 2;                  // Members+ get some link leeway, not a flood

// ── Content validators ───────────────────────────────────────────────────────

function countLetters(s: string): { total: number; upper: number } {
  let total = 0, upper = 0;
  for (const ch of s) {
    if (/[A-Za-z]/.test(ch)) {
      total++;
      if (ch >= 'A' && ch <= 'Z') upper++;
    }
  }
  return { total, upper };
}

function hasCharRepetition(s: string, max: number): boolean {
  // Returns true if any character (other than whitespace) appears more than
  // `max` times in a row. Uses a compact regex so the repeat count stays
  // trivial to read.
  const re = new RegExp(`([^\\s])\\1{${max},}`);
  return re.test(s);
}

function countUrls(s: string): number {
  const matches = s.match(/https?:\/\/[^\s]+/gi);
  return matches?.length ?? 0;
}

/**
 * Run every spam rule against the trimmed content and return the first
 * violation as a user-facing reason. null means the message is clean.
 */
function validateContent(content: string): string | null {
  if (content.length < MIN_CONTENT_LENGTH) return 'Message is too short';
  if (content.length > MAX_CONTENT_LENGTH) return `Max ${MAX_CONTENT_LENGTH} characters`;

  if (hasCharRepetition(content, MAX_REPEAT_CHARS)) {
    return 'Too many repeated characters';
  }

  if (countUrls(content) > MAX_URLS_PER_MESSAGE) {
    return `Max ${MAX_URLS_PER_MESSAGE} links per message`;
  }

  if (content.length >= CAPS_MIN_LENGTH) {
    const { total, upper } = countLetters(content);
    if (total > 0 && upper / total > CAPS_MAX_RATIO) {
      return 'Please don\u2019t shout \u2014 turn off caps lock';
    }
  }

  return null;
}

// ── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userTier = (session.user.tier as Tier) ?? 'free';
  if (!isAdmin(session.user.email) && !hasAccess(userTier, 'members')) {
    return NextResponse.json({ error: 'Members tier required to post' }, { status: 403 });
  }

  let body: { content?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const content = body.content?.trim() ?? '';

  // 1-2 + 6-8: content-only validation (length, caps, repeats, urls)
  const contentErr = validateContent(content);
  if (contentErr) return NextResponse.json({ error: contentErr }, { status: 400 });

  const user = session.user;
  const npub = user.nostrNpub ?? user.assignedNpub ?? user.id;

  // 3 + 4 + 5: look at recent history for this author to enforce flood +
  // dedup + 3s cooldown in a single DB query.
  const now = Date.now();
  const recentMessages = await prisma.chatMessage.findMany({
    where: {
      authorNpub: npub,
      roomId: 'ops',
      isBot: false,
      createdAt: { gte: new Date(now - FLOOD_WINDOW_MS) },
    },
    orderBy: { createdAt: 'desc' },
    select: { content: true, createdAt: true },
    take: FLOOD_WINDOW_MAX + 1, // only need enough to prove the flood cap
  });

  // 3. Hard 3-second cooldown between consecutive messages.
  if (recentMessages.length > 0 && now - recentMessages[0].createdAt.getTime() < RATE_LIMIT_MS) {
    return NextResponse.json(
      { error: 'Slow down \u2014 1 message per 3 seconds' },
      { status: 429 },
    );
  }

  // 4. Flood guard: >= FLOOD_WINDOW_MAX in the last FLOOD_WINDOW_MS.
  if (recentMessages.length >= FLOOD_WINDOW_MAX) {
    return NextResponse.json(
      { error: `Too many messages \u2014 max ${FLOOD_WINDOW_MAX} per minute` },
      { status: 429 },
    );
  }

  // 5. Dedup: reject exact repeats within the dedup window.
  const dedupCutoff = now - DEDUP_WINDOW_MS;
  const isDuplicate = recentMessages.some(
    (m) => m.content === content && m.createdAt.getTime() >= dedupCutoff,
  );
  if (isDuplicate) {
    return NextResponse.json(
      { error: 'Duplicate of a recent message' },
      { status: 429 },
    );
  }

  // All checks passed — store the message.
  const message = await prisma.chatMessage.create({
    data: {
      roomId: 'ops',
      authorNpub: npub,
      authorDisplay: user.chatDisplayName || `anon-${user.id.slice(0, 4)}`,
      authorIcon: user.chatIcon || 'email',
      content,
      isBot: false,
    },
    select: {
      id: true,
      authorNpub: true,
      authorDisplay: true,
      authorIcon: true,
      content: true,
      isBot: true,
      eventType: true,
      createdAt: true,
    },
  });

  return NextResponse.json(message);
}
