import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { hasAccess } from '@/lib/auth/tier';
import { prisma } from '@/lib/db';
import type { Tier } from '@/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const layouts = await prisma.userLayout.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
    select: { id: true, name: true, theme: true, isDefault: true, createdAt: true, layoutJson: true },
  });

  return NextResponse.json(
    layouts.map((l) => ({ ...l, panels: JSON.parse(l.layoutJson) }))
  );
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userTier = (session.user.tier as Tier) ?? 'free';
  if (!hasAccess(userTier, 'vip')) {
    return NextResponse.json({ error: 'VIP tier required' }, { status: 403 });
  }

  const body = await request.json() as { name?: string; panels?: unknown[]; theme?: string };
  const { name, panels, theme = 'parchment' } = body;

  if (!name?.trim() || !Array.isArray(panels)) {
    return NextResponse.json({ error: 'name and panels required' }, { status: 400 });
  }

  const count = await prisma.userLayout.count({ where: { userId: session.user.id } });
  if (count >= 5) {
    return NextResponse.json({ error: 'Maximum 5 saved layouts' }, { status: 400 });
  }

  const layout = await prisma.userLayout.create({
    data: {
      userId: session.user.id,
      name: name.trim(),
      layoutJson: JSON.stringify(panels),
      theme,
      isDefault: count === 0,
    },
    select: { id: true, name: true, theme: true, isDefault: true, createdAt: true },
  });

  return NextResponse.json(layout, { status: 201 });
}
