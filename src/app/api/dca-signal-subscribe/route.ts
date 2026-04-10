/**
 * POST /api/dca-signal-subscribe
 *
 * Creates or updates a DCA signal email subscription.
 * Supports two signal types:
 *   - 'dca_in'     — standard DCA accumulate signal (general tier+)
 *   - 'dca_in_out' — VIP combined in/out signal (VIP tier only in UI, not enforced here)
 *
 * Sends a double opt-in confirmation email for each type.
 *
 * Body: { email: string, frequency: 'weekly' | 'monthly', baseAmount?: number, signalType?: string }
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma }          from '@/lib/db';
import { getResend, FROM_ADDRESS, SITE_URL } from '@/lib/newsletter/resend';
import { render }          from '@react-email/components';
import { DcaSignalConfirmEmail } from '@/emails/DcaSignalConfirmEmail';
import { DcaVipConfirmEmail }    from '@/emails/DcaVipConfirmEmail';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

const ADMIN_CC = 'richardminton@gmail.com';

function randomToken(): string {
  return crypto.randomBytes(24).toString('hex');
}

export async function POST(request: NextRequest) {
  let body: { email?: string; frequency?: string; baseAmount?: number; signalType?: string };
  try { body = await request.json(); } catch { body = {}; }

  const email = body.email?.trim().toLowerCase();
  if (!email || !email.includes('@')) {
    return NextResponse.json({ error: 'Valid email required' }, { status: 400 });
  }

  const frequency   = body.frequency === 'monthly' ? 'monthly' : 'weekly';
  const baseAmount  = typeof body.baseAmount === 'number' && body.baseAmount > 0
    ? Math.round(body.baseAmount)
    : 100;
  const signalType  = body.signalType === 'dca_in_out' ? 'dca_in_out' : 'dca_in';
  const isVip       = signalType === 'dca_in_out';

  try {
    const confirmToken = randomToken();
    const unsubToken   = randomToken();

    // Look up existing record for this (email, signalType) pair
    const existing = await prisma.dcaSignalSubscriber.findFirst({
      where: { email, signalType },
    });

    if (existing) {
      // Update preferences; refresh confirm token if not yet confirmed
      await prisma.dcaSignalSubscriber.update({
        where: { id: existing.id },
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
          signalType,
          frequency,
          baseAmount,
          confirmToken,
          unsubToken,
        },
      });
    }

    // Token to put in the confirm URL
    const activeToken = existing?.confirmed ? null : (existing?.confirmToken ?? confirmToken);
    if (!activeToken) {
      return NextResponse.json({ status: 'updated', message: 'Preferences updated' });
    }

    const confirmUrl = `${SITE_URL}/api/dca-signal-confirm?token=${activeToken}`;
    const unsubUrl   = `${SITE_URL}/api/dca-signal-unsubscribe?token=${existing?.unsubToken ?? unsubToken}`;

    // ── VIP email ─────────────────────────────────────────────────────────────
    if (isVip) {
      // Look up the standard dca_in record so we can include its unsub link
      const dcaInRecord = await prisma.dcaSignalSubscriber.findFirst({
        where: { email, signalType: 'dca_in', confirmed: true },
      });
      const dcaInUnsubUrl = dcaInRecord
        ? `${SITE_URL}/api/dca-signal-unsubscribe?token=${dcaInRecord.unsubToken}`
        : undefined;

      const html = await render(
        DcaVipConfirmEmail({
          email,
          frequency,
          baseAmount,
          confirmUrl,
          vipUnsubUrl: unsubUrl,
          dcaInUnsubUrl,
          siteUrl: SITE_URL,
        })
      );

      await getResend().emails.send({
        from:    FROM_ADDRESS,
        to:      email,
        cc:      ADMIN_CC,
        subject: 'Confirm your VIP DCA In/Out Signal subscription — Situation Room',
        html,
      });

      return NextResponse.json({ status: 'confirm_sent', message: 'Check your email to confirm' });
    }

    // ── Standard DCA-in email ─────────────────────────────────────────────────
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
