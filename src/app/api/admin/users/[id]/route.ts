/**
 * PATCH /api/admin/users/[id]
 * Admin-only endpoint to update a user's manageable fields.
 *
 * Allowed fields:
 *   tier                 — 'free' | 'general' | 'members' | 'vip'
 *   newsletterFrequency  — 'daily' | 'weekly'
 *   newsletterEnabled    — boolean
 *   chatDisplayName      — string
 *   subscriptionExpiresAt — ISO string | null (extend/revoke subscription)
 */

import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { isAdmin } from '@/lib/auth/tier';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const VALID_TIERS = ['free', 'general', 'members', 'vip'];
const VALID_FREQUENCIES = ['daily', 'weekly'];

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user || !isAdmin(user.email)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;

  // Verify target user exists
  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const body = await req.json();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: Record<string, any> = {};

  // Tier
  if (body.tier !== undefined) {
    if (!VALID_TIERS.includes(body.tier)) {
      return NextResponse.json({ error: 'Invalid tier' }, { status: 400 });
    }
    data.tier = body.tier;
  }

  // Newsletter frequency
  if (body.newsletterFrequency !== undefined) {
    if (!VALID_FREQUENCIES.includes(body.newsletterFrequency)) {
      return NextResponse.json({ error: 'Invalid frequency' }, { status: 400 });
    }
    data.newsletterFrequency = body.newsletterFrequency;
  }

  // Newsletter enabled
  if (body.newsletterEnabled !== undefined) {
    data.newsletterEnabled = Boolean(body.newsletterEnabled);
  }

  // Chat display name
  if (body.chatDisplayName !== undefined) {
    data.chatDisplayName = String(body.chatDisplayName).slice(0, 50);
  }

  // Subscription expiry
  if (body.subscriptionExpiresAt !== undefined) {
    data.subscriptionExpiresAt = body.subscriptionExpiresAt
      ? new Date(body.subscriptionExpiresAt)
      : null;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
  }

  const updated = await prisma.user.update({
    where: { id },
    data,
    select: {
      id: true,
      email: true,
      tier: true,
      newsletterEnabled: true,
      newsletterFrequency: true,
      subscriptionExpiresAt: true,
      chatDisplayName: true,
    },
  });

  return NextResponse.json({ user: updated });
}
