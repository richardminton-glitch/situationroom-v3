/**
 * GET /api/dca-signal-unsubscribe?token=xxx
 *
 * Removes a DCA signal email subscription.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { SITE_URL } from '@/lib/newsletter/resend';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token');
  if (!token) {
    return NextResponse.redirect(`${SITE_URL}?unsubscribed=dca`);
  }

  try {
    await prisma.dcaSignalSubscriber.delete({
      where: { unsubToken: token },
    }).catch(() => { /* already deleted — ignore */ });

    return NextResponse.redirect(`${SITE_URL}?unsubscribed=dca`);
  } catch {
    return NextResponse.redirect(`${SITE_URL}?unsubscribed=dca`);
  }
}
