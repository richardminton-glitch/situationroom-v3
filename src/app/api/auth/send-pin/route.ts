import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getOrCreatePin } from '@/lib/auth/pin';
import { generateAssignedKeypair, assignedDisplayName } from '@/lib/auth/keypair';
import { getResend, FROM_ADDRESS } from '@/lib/newsletter/resend';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Find or create user
    let user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      const keypair = generateAssignedKeypair();
      user = await prisma.user.create({
        data: {
          email:              normalizedEmail,
          assignedNpub:       keypair.npub,
          assignedPrivkeyEnc: keypair.encryptedPrivkey,
          nostrAuthType:      'assigned',
          chatDisplayName:    assignedDisplayName(),
          chatIcon:           'email',
        },
      });
    }

    // Get the user's static PIN (creates one if first login)
    const pin = await getOrCreatePin(user.id);

    // Dev: log to console for testing
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[DEV] PIN for ${normalizedEmail}: ${pin}`);
    }

    // Send PIN via Resend
    try {
      const resend = getResend();
      await resend.emails.send({
        from: FROM_ADDRESS,
        to: normalizedEmail,
        subject: 'Situation Room — Your Sign-In PIN',
        html: `
          <div style="font-family: 'Courier New', monospace; max-width: 400px; margin: 0 auto; padding: 32px 24px; background: #f5f0e8; color: #2c2416;">
            <div style="font-size: 10px; letter-spacing: 0.16em; color: #8b7355; margin-bottom: 4px;">SITUATION ROOM</div>
            <div style="font-size: 14px; letter-spacing: 0.08em; margin-bottom: 24px;">SIGN-IN PIN</div>
            <div style="font-size: 36px; letter-spacing: 0.5em; font-weight: bold; text-align: center; padding: 16px; background: #fff; border: 1px solid #c8b89a; margin-bottom: 16px;">
              ${pin}
            </div>
            <div style="font-size: 11px; color: #8b7355; line-height: 1.6;">
              This is your permanent sign-in PIN.<br>
              Keep it safe — it stays the same every time you log in.
            </div>
          </div>
        `,
      });
      console.log(`[Auth] PIN email sent to ${normalizedEmail}`);
    } catch (emailErr) {
      // Log but don't fail the request — user can retry
      console.error('[Auth] PIN email send failed:', emailErr);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Send PIN error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
