import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * DELETE /api/shares/[id]
 *
 * Owner-only revoke: sets revokedAt. Returning 404 for non-owners so we don't
 * leak existence.
 */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const share = await prisma.dashboardShare.findUnique({ where: { id } });
  if (!share || share.ownerId !== session.user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  if (!share.revokedAt) {
    await prisma.dashboardShare.update({
      where: { id },
      data: { revokedAt: new Date() },
    });
  }

  return NextResponse.json({ ok: true });
}
