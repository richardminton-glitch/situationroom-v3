/**
 * GET /api/dca-signal-confirm?token=xxx
 *
 * Confirms a DCA signal email subscription via double opt-in link.
 * Redirects to /room/dca-signal with a ?subscribed=1 query param on success.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { SITE_URL } from '@/lib/newsletter/resend';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token');
  if (!token) {
    return NextResponse.redirect(`${SITE_URL}/room/dca-signal?error=invalid_token`);
  }

  try {
    const subscriber = await prisma.dcaSignalSubscriber.findUnique({
      where: { confirmToken: token },
    });

    if (!subscriber) {
      return NextResponse.redirect(`${SITE_URL}/room/dca-signal?error=invalid_token`);
    }

    await prisma.dcaSignalSubscriber.update({
      where: { id: subscriber.id },
      data: {
        confirmed:    true,
        confirmedAt:  new Date(),
        confirmToken: null,
      },
    });

    return NextResponse.redirect(`${SITE_URL}/room/dca-signal?subscribed=1`);

  } catch (err) {
    console.error('[dca-signal-confirm] Error:', err);
    return NextResponse.redirect(`${SITE_URL}/room/dca-signal?error=server_error`);
  }
}
