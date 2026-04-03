/**
 * GET /api/alerts — list user's active alerts (VIP only)
 * POST /api/alerts — create new alert (VIP only, max 10)
 * Body: { triggerType, condition, threshold?, label }
 */
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { hasAccess } from '@/lib/auth/tier';
import { prisma } from '@/lib/db';
import type { Tier } from '@/types';

export const dynamic = 'force-dynamic';

const VALID_TRIGGERS = ['conviction', 'lth_supply', 'hash_ribbon', 'btc_price', 'fear_greed', 'new_briefing'] as const;
const VALID_CONDITIONS = ['above', 'below', 'flip', 'any'] as const;

type ValidTrigger = typeof VALID_TRIGGERS[number];
type ValidCondition = typeof VALID_CONDITIONS[number];

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const userTier = (session.user.tier as Tier) ?? 'free';
  if (!hasAccess(userTier, 'vip')) return NextResponse.json({ error: 'VIP required' }, { status: 403 });

  const alerts = await (prisma as any).userAlert.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json(alerts);
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const userTier = (session.user.tier as Tier) ?? 'free';
  if (!hasAccess(userTier, 'vip')) return NextResponse.json({ error: 'VIP required' }, { status: 403 });

  const count = await (prisma as any).userAlert.count({ where: { userId: session.user.id } });
  if (count >= 10) return NextResponse.json({ error: 'Maximum 10 alerts' }, { status: 400 });

  const body = await request.json() as {
    triggerType?: string;
    condition?: string;
    threshold?: number;
    label?: string;
  };
  const { triggerType, condition, threshold, label = '' } = body;

  if (!VALID_TRIGGERS.includes(triggerType as ValidTrigger)) {
    return NextResponse.json({ error: 'Invalid trigger type' }, { status: 400 });
  }
  if (!VALID_CONDITIONS.includes(condition as ValidCondition)) {
    return NextResponse.json({ error: 'Invalid condition' }, { status: 400 });
  }

  const alert = await (prisma as any).userAlert.create({
    data: {
      userId: session.user.id,
      triggerType,
      condition,
      threshold: threshold ?? null,
      label: label.slice(0, 100),
      isActive: true,
    },
  });
  return NextResponse.json(alert, { status: 201 });
}
