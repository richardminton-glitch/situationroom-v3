/**
 * GET /api/newsletter/unsubscribe?token=[signed]
 * One-click unsubscribe — clears newsletterEnabled and confirmation.
 * No login required.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyNewsletterToken } from '@/lib/newsletter/tokens';
import { SITE_URL } from '@/lib/newsletter/resend';

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token');
  if (!token) {
    return NextResponse.redirect(`${SITE_URL}/?newsletter=unsub-missing`);
  }

  const result = verifyNewsletterToken(token, 'unsubscribe');
  if (!result.valid) {
    return NextResponse.redirect(`${SITE_URL}/?newsletter=unsub-invalid`);
  }

  try {
    await prisma.user.update({
      where: { id: result.userId },
      data: {
        newsletterEnabled: false,
        newsletterConfirmedAt: null,
      },
    });
  } catch {
    return NextResponse.redirect(`${SITE_URL}/?newsletter=unsub-error`);
  }

  return NextResponse.redirect(`${SITE_URL}/?newsletter=unsubscribed`);
}
