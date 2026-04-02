import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { createPinForUser } from '@/lib/auth/pin';

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
      user = await prisma.user.create({
        data: { email: normalizedEmail },
      });
    }

    const pin = await createPinForUser(user.id);

    // TODO: Send email via Resend/Postmark/SES
    // For development, log the PIN
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[DEV] PIN for ${normalizedEmail}: ${pin}`);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Send PIN error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
