import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth/session';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const layouts = await prisma.userLayout.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      layouts: layouts.map((l: any) => ({
        id: l.id,
        name: l.name,
        isDefault: l.isDefault,
        layout: JSON.parse(l.layoutJson),
        createdAt: l.createdAt,
      })),
    });
  } catch (error) {
    console.error('Get layouts error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name, layout, isDefault } = await request.json();

    if (!name || !layout) {
      return NextResponse.json({ error: 'Name and layout are required' }, { status: 400 });
    }

    // If setting as default, unset other defaults
    if (isDefault) {
      await prisma.userLayout.updateMany({
        where: { userId: user.id, isDefault: true },
        data: { isDefault: false },
      });
    }

    const saved = await prisma.userLayout.create({
      data: {
        userId: user.id,
        name,
        layoutJson: JSON.stringify(layout),
        isDefault: isDefault ?? false,
      },
    });

    return NextResponse.json({
      id: saved.id,
      name: saved.name,
      isDefault: saved.isDefault,
      layout: JSON.parse(saved.layoutJson),
    });
  } catch (error) {
    console.error('Save layout error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
