import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyPin } from '@/lib/auth/pin';
import { createSession } from '@/lib/auth/session';
import { sendWelcomeEmail, isRealEmail } from '@/lib/newsletter/lifecycle';

export async function POST(request: NextRequest) {
  try {
    const { email, pin } = await request.json();

    if (!email || !pin) {
      return NextResponse.json({ error: 'Email and PIN are required' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      return NextResponse.json({ error: 'Invalid email or PIN' }, { status: 401 });
    }

    const valid = await verifyPin(user.id, pin);

    if (!valid) {
      return NextResponse.json({ error: 'Invalid email or PIN' }, { status: 401 });
    }

    await createSession(user.id);

    // First successful verification — send the welcome / newsletter confirm email.
    // Only fires once per user (gated by welcomeEmailSentAt) and only for real
    // email addresses (not the `nostr:{hex}` placeholder).
    if (!user.welcomeEmailSentAt && isRealEmail(user.email)) {
      const sent = await sendWelcomeEmail(user.id, user.email);
      if (sent) {
        await prisma.user.update({
          where: { id: user.id },
          data:  { welcomeEmailSentAt: new Date() },
        });
      }
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        themePref: user.themePref,
        tier: user.tier,
      },
    });
  } catch (error) {
    console.error('Verify PIN error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
