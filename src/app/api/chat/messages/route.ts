/**
 * GET /api/chat/messages?limit=50&before=[timestamp]
 * Returns recent chat messages. Free/General: read access. Members+: post access.
 * No auth required to read (Ops Room chat is public-readable).
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const limit = Math.min(100, parseInt(req.nextUrl.searchParams.get('limit') ?? '50'));
  const before = req.nextUrl.searchParams.get('before');

  const messages = await prisma.chatMessage.findMany({
    where: {
      roomId: 'ops',
      ...(before ? { createdAt: { lt: new Date(parseInt(before)) } } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
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

  // Return in chronological order (oldest first for display)
  return NextResponse.json(messages.reverse());
}
