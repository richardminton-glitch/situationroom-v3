import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth/session';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json({
      displayName: user.displayName,
      timezone: user.timezone,
      currencyPref: user.currencyPref,
      themePref: user.themePref,
      isPublic: user.isPublic,
      tvChartState: user.tvChartState,
    });
  } catch (error) {
    console.error('Get preferences error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

const ALLOWED_FIELDS = ['displayName', 'timezone', 'currencyPref', 'themePref', 'isPublic', 'tvChartState'] as const;
type AllowedField = typeof ALLOWED_FIELDS[number];

export async function PATCH(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const updates: Record<string, unknown> = {};

    for (const field of ALLOWED_FIELDS) {
      if (field in body) {
        updates[field] = body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: updates,
    });

    return NextResponse.json({
      displayName: updated.displayName,
      timezone: updated.timezone,
      currencyPref: updated.currencyPref,
      themePref: updated.themePref,
      isPublic: updated.isPublic,
      tvChartState: updated.tvChartState,
    });
  } catch (error) {
    console.error('Update preferences error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
