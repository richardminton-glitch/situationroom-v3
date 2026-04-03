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

  const body = await request.json() as { name?: string; isDefault?: boolean };
  const updated = await prisma.userLayout.update({
    where: { id },
    data: {
      name: body.name ?? layout.name,
      isDefault: body.isDefault ?? layout.isDefault,
    },
  });

  return NextResponse.json(updated);
}
