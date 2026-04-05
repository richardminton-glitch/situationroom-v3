/**
 * GET /api/bot/messages
 *
 * Returns bot room chat messages (trading announcements from SitRoom AI).
 * Requires Members+ tier.
 *
 * Query params:
 *   limit  — max messages to return (default 50, max 200)
 *   before — cursor for pagination (ISO datetime)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { hasAccess } from '@/lib/auth/tier';
import { prisma } from '@/lib/db';
import type { Tier } from '@/types';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userTier = (session.user.tier as Tier) ?? 'free';
  if (!hasAccess(userTier, 'members')) {
    return NextResponse.json({ error: 'Members tier required' }, { status: 403 });
  }

  const { searchParams } = request.nextUrl;
  const limit  = Math.min(parseInt(searchParams.get('limit') ?? '50', 10) || 50, 200);
  const before = searchParams.get('before');

  const where: Record<string, unknown> = {
    roomId: 'bot',
    isBot: true,
  };

  if (before) {
    where.createdAt = { lt: new Date(before) };
  }

  const messages = await prisma.chatMessage.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: {
      id: true,
      content: true,
      eventType: true,
      createdAt: true,
    },
  });

  // Return in chronological order (oldest first) for display
  const result = messages.reverse().map((m) => ({
    id:        m.id,
    timestamp: m.createdAt.getTime(),
    author:    'SitRoom AI',
    content:   m.content,
    eventType: m.eventType,
  }));

  return NextResponse.json({ messages: result });
}
