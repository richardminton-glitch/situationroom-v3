/**
 * POST /api/chat/message
 * Post a message to the Ops Room. Requires Members+ tier.
 * Rate limit: 1 message per 3 seconds per user (enforced via lastSeenAt heuristic + DB check).
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth/session';
import { hasAccess, isAdmin } from '@/lib/auth/tier';
import type { Tier } from '@/types';

export const dynamic = 'force-dynamic';

const MAX_CONTENT_LENGTH = 500;
const RATE_LIMIT_MS = 3000; // 3 seconds between posts

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
  if (!content) return NextResponse.json({ error: 'Message is empty' }, { status: 400 });
  if (content.length > MAX_CONTENT_LENGTH) {
    return NextResponse.json({ error: `Max ${MAX_CONTENT_LENGTH} characters` }, { status: 400 });
  }

  // Rate limit: check most recent message from this user
  const user = session.user;
  const npub = user.nostrNpub ?? user.assignedNpub ?? user.id;

  const lastMsg = await prisma.chatMessage.findFirst({
    where: { authorNpub: npub, roomId: 'ops', isBot: false },
    orderBy: { createdAt: 'desc' },
    select: { createdAt: true },
  });

  if (lastMsg && Date.now() - lastMsg.createdAt.getTime() < RATE_LIMIT_MS) {
    return NextResponse.json({ error: 'Slow down — 1 message per 3 seconds' }, { status: 429 });
  }

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
