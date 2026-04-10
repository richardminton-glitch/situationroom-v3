/**
 * POST /api/dca-signal-subscribe
 *
 * Creates or updates a DCA signal email subscription.
 * Sends a double opt-in confirmation email.
 *
 * Body: { email: string, frequency: 'weekly' | 'monthly', baseAmount?: number }
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma }          from '@/lib/db';
import { getResend, FROM_ADDRESS, SITE_URL } from '@/lib/newsletter/resend';
import { render }          from '@react-email/components';
import { DcaSignalConfirmEmail } from '@/emails/DcaSignalConfirmEmail';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

const ADMIN_CC = 'richardminton@gmail.com';

function randomToken(): string {
  return crypto.randomBytes(24).toString('hex');
}

export async function POST(request: NextRequest) {
  let body: { email?: string; frequency?: string; baseAmount?: number };
  try { body = await request.json(); } catch { body = {}; }

  const email = body.email?.trim().toLowerCase();
  if (!email || !email.includes('@')) {
    return NextResponse.json({ error: 'Valid email required' }, { status: 400 });
  }

  const frequency  = body.frequency === 'monthly' ? 'monthly' : 'weekly';
  const baseAmount = typeof body.baseAmount === 'number' && body.baseAmount > 0
    ? Math.round(body.baseAmount)
    : 100;

  try {
    // Upsert subscriber record
    const confirmToken = randomToken();
    const unsubToken   = randomToken();

    const existing = await prisma.dcaSignalSubscriber.findUnique({ where: { email } });

    if (existing) {
      // Update preferences, generate new confirm token if not yet confirmed
      await prisma.dcaSignalSubscriber.update({
        where: { email },
        data: {
          frequency,
          baseAmount,
          confirmToken: existing.confirmed ? null : confirmToken,
        },
      });

      if (existing.confirmed) {
        return NextResponse.json({ status: 'updated', message: 'Preferences updated' });
      }
    } else {
      await prisma.dcaSignalSubscriber.create({
        data: {
          email,
          frequency,
          baseAmount,
          confirmToken,
          unsubToken,
        },
      });
    }

    // Send confirmation email
    const token      = existing?.confirmed ? null : (existing?.confirmToken ?? confirmToken);
    if (!token) {
      return NextResponse.json({ status: 'updated', message: 'Preferences updated' });
    }

    const confirmUrl   = `${SITE_URL}/api/dca-signal-confirm?token=${token}`;
    const unsubUrl     = `${SITE_URL}/api/dca-signal-unsubscribe?token=${unsubToken}`;

    const html = await render(
      DcaSignalConfirmEmail({
        email,
        frequency,
        baseAmount,
        confirmUrl,
        unsubUrl,
        siteUrl: SITE_URL,
      })
    );

    await getResend().emails.send({
      from:    FROM_ADDRESS,
      to:      email,
      cc:      ADMIN_CC,
      subject: 'Confirm your DCA Signal subscription — Situation Room',
      html,
    });

    return NextResponse.json({ status: 'confirm_sent', message: 'Check your email to confirm' });

  } catch (err) {
    console.error('[dca-signal-subscribe] Error:', err);
    return NextResponse.json({ error: 'Subscription failed' }, { status: 500 });
  }
}
