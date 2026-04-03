import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ paymentId: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const { paymentId } = await params;

  const payment = await prisma.subscriptionPayment.findFirst({
    where: { id: paymentId, userId: user.id },
    select: { status: true, tier: true, activatedAt: true },
  });

  if (!payment) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return NextResponse.json({
    status:   payment.status,
    tier:     payment.tier,
    activatedAt: payment.activatedAt?.toISOString() ?? null,
  });
}
