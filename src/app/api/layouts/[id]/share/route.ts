import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { getSession } from '@/lib/auth/session';
import { hasAccess, isAdmin } from '@/lib/auth/tier';
import { prisma } from '@/lib/db';
import type { Tier } from '@/types';

export const dynamic = 'force-dynamic';

const MAX_SHARES_PER_OWNER = 5;

/**
 * POST /api/layouts/[id]/share
 *
 * VIP creates a new tokenised invite for one of their custom dashboards.
 * Enforces:
 *   - Caller is VIP (or admin).
 *   - Layout belongs to caller.
 *   - Caller has < MAX_SHARES_PER_OWNER non-revoked shares.
 *   - If the caller already has active shares on a DIFFERENT layout,
 *     refuses with 409 (UI must resolve by revoking first).
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userTier = (session.user.tier as Tier) ?? 'free';
  const admin = isAdmin(session.user.email);
  if (!admin && !hasAccess(userTier, 'vip')) {
    return NextResponse.json({ error: 'VIP tier required' }, { status: 403 });
  }

  const { id: layoutId } = await params;
  const layout = await prisma.userLayout.findUnique({ where: { id: layoutId } });
  if (!layout || layout.userId !== session.user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const body = await request.json() as { label?: string; inviteEmail?: string };
  const label = (body.label ?? '').trim().slice(0, 60);
  const inviteEmail = body.inviteEmail?.trim().toLowerCase() || null;

  const activeShares = await prisma.dashboardShare.findMany({
    where: { ownerId: session.user.id, revokedAt: null },
    select: { id: true, layoutId: true },
  });

  if (activeShares.length >= MAX_SHARES_PER_OWNER) {
    return NextResponse.json(
      { error: `Maximum ${MAX_SHARES_PER_OWNER} active shares` },
      { status: 400 }
    );
  }

  const otherLayoutShares = activeShares.find((s) => s.layoutId !== layoutId);
  if (otherLayoutShares) {
    return NextResponse.json(
      { error: 'Active shares exist on another dashboard. Revoke them first.', conflictLayoutId: otherLayoutShares.layoutId },
      { status: 409 }
    );
  }

  const token = crypto.randomBytes(32).toString('hex');

  const share = await prisma.dashboardShare.create({
    data: {
      ownerId: session.user.id,
      layoutId,
      token,
      label,
      inviteEmail,
    },
    select: { id: true, token: true, label: true, inviteEmail: true, createdAt: true, lastViewedAt: true, boundUserId: true },
  });

  return NextResponse.json(share, { status: 201 });
}

/**
 * GET /api/layouts/[id]/share
 *
 * Owner lists active shares for this layout (for the share modal).
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: layoutId } = await params;
  const layout = await prisma.userLayout.findUnique({ where: { id: layoutId } });
  if (!layout || layout.userId !== session.user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const shares = await prisma.dashboardShare.findMany({
    where: { layoutId, ownerId: session.user.id, revokedAt: null },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      token: true,
      label: true,
      inviteEmail: true,
      createdAt: true,
      lastViewedAt: true,
      boundUserId: true,
    },
  });

  return NextResponse.json({ max: MAX_SHARES_PER_OWNER, shares });
}
