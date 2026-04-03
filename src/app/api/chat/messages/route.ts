/**
 * GET /api/chat/messages?limit=50&before=[timestamp]
 * Returns recent chat messages. Free/General: read access. Members+: post access.
 * No auth required to read (Ops Room chat is public-readable).
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { ADMIN_EMAILS } from '@/lib/auth/tier';

export const dynamic = 'force-dynamic';

// Build a set of admin npubs for fast lookup (cached per process)
let adminNpubs: Set<string> | null = null;
async function getAdminNpubs(): Promise<Set<string>> {
  if (adminNpubs) return adminNpubs;
  const admins = await prisma.user.findMany({
    where: { email: { in: ADMIN_EMAILS } },
    select: { nostrNpub: true, assignedNpub: true, id: true },
  });
  adminNpubs = new Set<string>();
  for (const a of admins) {
    if (a.nostrNpub) adminNpubs.add(a.nostrNpub);
    if (a.assignedNpub) adminNpubs.add(a.assignedNpub);
    adminNpubs.add(a.id);
  }
  return adminNpubs;
}

export async function GET(req: NextRequest) {
  const limit = Math.min(100, parseInt(req.nextUrl.searchParams.get('limit') ?? '50'));
  const before = req.nextUrl.searchParams.get('before');

  const [messages, admins] = await Promise.all([
    prisma.chatMessage.findMany({
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
    }),
    getAdminNpubs(),
  ]);

  // Return in chronological order with isAdmin flag
  const result = messages.reverse().map((m) => ({
    ...m,
    isAdmin: admins.has(m.authorNpub),
  }));

  return NextResponse.json(result);
}
