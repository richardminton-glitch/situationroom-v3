/**
 * POST /api/auth/nostr/verify
 *
 * Body: { event: NostrEvent }
 *   event.content must be the challenge string issued by /challenge
 *   event.kind must be 1
 *
 * On success: creates session, returns user profile.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { createSession } from '@/lib/auth/session';
import { consumeChallenge, verifyNostrEvent, nativeDisplayName } from '@/lib/auth/nostr';
import type { Event as NostrEvent } from 'nostr-tools';

export async function POST(request: NextRequest) {
  try {
    const { event } = (await request.json()) as { event: NostrEvent };

    if (!event || typeof event !== 'object') {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    // 1. Verify Schnorr signature
    const pubkey = verifyNostrEvent(event);
    if (!pubkey) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    // 2. Consume challenge (validates it was issued by us and not yet used)
    const challenge = event.content;
    const valid = await consumeChallenge(challenge);
    if (!valid) {
      return NextResponse.json({ error: 'Invalid or expired challenge' }, { status: 401 });
    }

    // 3. Find or create user by nostrNpub
    let user = await prisma.user.findUnique({ where: { nostrNpub: pubkey } });

    if (!user) {
      // New native Nostr user — no email, no PIN
      user = await prisma.user.create({
        data: {
          email:           `nostr:${pubkey}`,  // placeholder; not used for comms
          nostrNpub:       pubkey,
          nostrAuthType:   'native',
          chatDisplayName: nativeDisplayName(pubkey),
          chatIcon:        'lightning',
        },
      });
    }

    await createSession(user.id);

    return NextResponse.json({ success: true, user: { id: user.id, tier: user.tier } });
  } catch (error) {
    console.error('Nostr verify error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
