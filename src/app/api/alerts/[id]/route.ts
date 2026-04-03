/**
 * DELETE /api/alerts/[id] — delete an alert (ownership checked)
 * PATCH /api/alerts/[id] — toggle isActive or update threshold
 */
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const alert = await (prisma as any).userAlert.findUnique({ where: { id } });
  if (!alert || alert.userId !== session.user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  await (prisma as any).userAlert.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const alert = await (prisma as any).userAlert.findUnique({ where: { id } });
  if (!alert || alert.userId !== session.user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  const body = await request.json() as { isActive?: boolean; threshold?: number };
  const updated = await (prisma as any).userAlert.update({
    where: { id },
    data: {
      isActive: body.isActive ?? alert.isActive,
      threshold: body.threshold ?? alert.threshold,
    },
  });
  return NextResponse.json(updated);
}
