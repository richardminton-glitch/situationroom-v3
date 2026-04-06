import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const layout = await prisma.userLayout.findUnique({ where: { id } });

  if (!layout || layout.userId !== session.user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  await prisma.userLayout.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const layout = await prisma.userLayout.findUnique({ where: { id } });

  if (!layout || layout.userId !== session.user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const body = await request.json() as { name?: string; isDefault?: boolean; panels?: unknown[] };

  const data: Record<string, unknown> = {};
  if (body.name !== undefined) data.name = body.name;
  if (body.isDefault !== undefined) data.isDefault = body.isDefault;
  if (body.panels !== undefined) data.layoutJson = JSON.stringify(body.panels);

  const updated = await prisma.userLayout.update({
    where: { id },
    data,
    select: { id: true, name: true, theme: true, isDefault: true, createdAt: true, layoutJson: true },
  });

  return NextResponse.json({ ...updated, panels: JSON.parse(updated.layoutJson) });
}
