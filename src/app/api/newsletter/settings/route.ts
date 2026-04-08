/**
 * GET  /api/newsletter/settings  — return current newsletter preferences
 * POST /api/newsletter/settings  — update newsletter preferences
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth/session';
import { hasAccess } from '@/lib/auth/tier';
import type { Tier } from '@/types';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const u = session.user;
  return NextResponse.json({
    email: u.email,
    newsletterEnabled: u.newsletterEnabled,
    newsletterFrequency: u.newsletterFrequency,
    newsletterDay: u.newsletterDay,
    newsletterVipTopics: u.newsletterVipTopics,
    newsletterLastSent: u.newsletterLastSent,
    newsletterConfirmedAt: u.newsletterConfirmedAt,
  });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userTier = (session.user.tier as Tier) ?? 'free';
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const data: Record<string, unknown> = {};

  if (typeof body.newsletterEnabled === 'boolean') {
    // Disabling is always allowed; enabling requires a later confirmation step
    data.newsletterEnabled = body.newsletterEnabled;
    if (!body.newsletterEnabled) {
      data.newsletterConfirmedAt = null;
    }
  }

  if (body.newsletterFrequency !== undefined) {
    // Only General+ can choose daily
    if (body.newsletterFrequency === 'daily' && !hasAccess(userTier, 'general')) {
      return NextResponse.json({ error: 'Daily frequency requires General tier' }, { status: 403 });
    }
    if (['daily', 'weekly'].includes(body.newsletterFrequency as string)) {
      data.newsletterFrequency = body.newsletterFrequency;
    }
  }

  if (body.newsletterDay !== undefined) {
    const day = Number(body.newsletterDay);
    if (Number.isInteger(day) && day >= 0 && day <= 6) {
      data.newsletterDay = day;
    }
  }

  if (body.newsletterVipTopics !== undefined) {
    if (!hasAccess(userTier, 'vip')) {
      return NextResponse.json({ error: 'Topic selection requires VIP tier' }, { status: 403 });
    }
    const topics = body.newsletterVipTopics as string[];
    if (Array.isArray(topics) && topics.length <= 3) {
      data.newsletterVipTopics = topics;
    }
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
  }

  const updated = await prisma.user.update({
    where: { id: session.userId },
    data,
  });

  return NextResponse.json({ ok: true, newsletterConfirmedAt: updated.newsletterConfirmedAt });
}
