/**
 * POST /api/auth/reset-pin
 *
 * Generates a new random 4-digit PIN for the authenticated user.
 * Emails the new PIN and returns success.
 */

import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db';
import { generatePin } from '@/lib/auth/pin';
import { getResend, FROM_ADDRESS } from '@/lib/newsletter/resend';

export async function POST() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const pin = generatePin();

  await prisma.user.update({
    where: { id: user.id },
    data: { pin },
  });

  // Email the new PIN
  try {
    const resend = getResend();
    await resend.emails.send({
      from: FROM_ADDRESS,
      to: user.email,
      subject: 'Situation Room — Your New Sign-In PIN',
      html: `
        <div style="font-family: 'Courier New', monospace; max-width: 400px; margin: 0 auto; padding: 32px 24px; background: #f5f0e8; color: #2c2416;">
          <div style="font-size: 10px; letter-spacing: 0.16em; color: #8b7355; margin-bottom: 4px;">SITUATION ROOM</div>
          <div style="font-size: 14px; letter-spacing: 0.08em; margin-bottom: 24px;">NEW SIGN-IN PIN</div>
          <div style="font-size: 36px; letter-spacing: 0.5em; font-weight: bold; text-align: center; padding: 16px; background: #fff; border: 1px solid #c8b89a; margin-bottom: 16px;">
            ${pin}
          </div>
          <div style="font-size: 11px; color: #8b7355; line-height: 1.6;">
            Your PIN has been reset. This is your new permanent sign-in PIN.<br>
            Keep it safe — it stays the same every time you log in.
          </div>
        </div>
      `,
    });
  } catch (err) {
    console.error('[Auth] Reset PIN email failed:', err);
  }

  return NextResponse.json({ success: true });
}
