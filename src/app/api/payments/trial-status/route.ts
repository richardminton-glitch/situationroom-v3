/**
 * GET /api/payments/trial-status
 *
 * Returns which tiers the current user has already trialled.
 * Checks across all accounts sharing the same email or nostr npub
 * (trial is once per tier, once per identity).
 */

import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }

  // Find all user IDs sharing this email or nostr npub
  const identityFilter: { OR: Array<Record<string, string>> } = {
    OR: [{ email: user.email }],
  };
  if (user.nostrNpub) identityFilter.OR.push({ nostrNpub: user.nostrNpub });

  const relatedUsers = await prisma.user.findMany({
    where: identityFilter,
    select: { id: true },
  });
  const relatedIds = relatedUsers.map((u) => u.id);

  // Find all confirmed or pending trial payments for these identities
  const trials = await prisma.subscriptionPayment.findMany({
    where: {
      userId: { in: relatedIds },
      tier: 'trial',
      status: { in: ['confirmed', 'pending'] },
    },
    select: { memo: true },
  });

  // Parse target tiers from memos: SITROOM-TRIAL-GENERAL-userId-ts
  const usedTiers: string[] = [];
  for (const t of trials) {
    const parts = t.memo.split('-');
    if (parts[1] === 'TRIAL' && parts[2]) {
      const tier = parts[2].toLowerCase();
      if (['general', 'members', 'vip'].includes(tier) && !usedTiers.includes(tier)) {
        usedTiers.push(tier);
      }
    }
  }

  return NextResponse.json({ usedTiers });
}
