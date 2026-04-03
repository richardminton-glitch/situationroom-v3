/**
 * GET /api/newsletter/confirm?token=[signed]
 * Completes double opt-in — sets newsletterConfirmedAt.
 * No login required; the signed token identifies the user.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyNewsletterToken } from '@/lib/newsletter/tokens';
import { SITE_URL } from '@/lib/newsletter/resend';

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token');
  if (!token) {
    return NextResponse.redirect(`${SITE_URL}/?newsletter=confirm-missing`);
  }

  const result = verifyNewsletterToken(token, 'confirm');
  if (!result.valid) {
    return NextResponse.redirect(`${SITE_URL}/?newsletter=confirm-invalid`);
  }

  try {
    await prisma.user.update({
      where: { id: result.userId },
      data: {
        newsletterEnabled: true,
        newsletterConfirmedAt: new Date(),
      },
    });
  } catch {
    return NextResponse.redirect(`${SITE_URL}/?newsletter=confirm-error`);
  }

  return NextResponse.redirect(`${SITE_URL}/?newsletter=confirmed`);
}
