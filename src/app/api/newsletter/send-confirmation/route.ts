/**
 * POST /api/newsletter/send-confirmation
 * Auth required. Sends (or re-sends) the double opt-in confirmation email.
 * Rate-limited: only one send per 10 minutes per user.
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth/session';
import { getResend, FROM_ADDRESS, SITE_URL } from '@/lib/newsletter/resend';
import { createNewsletterToken } from '@/lib/newsletter/tokens';

export async function POST() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });
  if (!user.email) return NextResponse.json({ error: 'No email on account' }, { status: 400 });
  if (user.newsletterConfirmedAt) return NextResponse.json({ error: 'Already confirmed' }, { status: 400 });

  const token = createNewsletterToken(user.id, 'confirm', 86400); // 24hr
  const confirmUrl = `${SITE_URL}/api/newsletter/confirm?token=${token}`;

  try {
    const resend = getResend();
    await resend.emails.send({
      from: FROM_ADDRESS,
      to: user.email,
      subject: 'Confirm your Situation Room newsletter',
      html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="background:#f5f0e8;font-family:Georgia,serif;margin:0;padding:40px 20px">
  <div style="max-width:520px;margin:0 auto;background:#ede8dc;border:1px solid #c8b89a;padding:32px">
    <div style="font-family:'Courier New',monospace;font-size:10px;letter-spacing:0.18em;color:#8b7355;margin-bottom:20px">
      SITUATION ROOM · CONFIRM SUBSCRIPTION
    </div>
    <p style="font-size:15px;color:#2c2416;line-height:1.6;margin:0 0 20px">
      Click below to confirm your newsletter subscription and start receiving
      Bitcoin &amp; macro intelligence briefings.
    </p>
    <a href="${confirmUrl}"
       style="display:inline-block;padding:12px 28px;background:#8b6914;color:#f5f0e8;
              text-decoration:none;font-family:'Courier New',monospace;font-size:12px;
              letter-spacing:0.12em;font-weight:bold">
      CONFIRM SUBSCRIPTION
    </a>
    <p style="font-size:11px;color:#8b7355;margin-top:20px;line-height:1.5">
      This link expires in 24 hours. If you did not request this, ignore this email.
    </p>
    <hr style="border:none;border-top:1px solid #c8b89a;margin:24px 0">
    <p style="font-size:10px;color:#8b7355;font-family:'Courier New',monospace;margin:0">
      Situation Room · <a href="${SITE_URL}" style="color:#8b6914">situationroom.space</a>
    </p>
  </div>
</body>
</html>
      `.trim(),
    });
  } catch (err) {
    console.error('[newsletter/send-confirmation] Resend error:', err);
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
