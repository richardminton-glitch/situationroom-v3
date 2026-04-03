/**
 * POST /api/auth/nostr/link
 *
 * Links a Nostr identity (NIP-07 signed event) to the currently authenticated
 * email account. The user's nostrAuthType becomes 'upgraded' and their chat
 * icon switches to ⚡.
 *
 * Body: { event: NostrEvent }
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db';
import { consumeChallenge, verifyNostrEvent, nativeDisplayName } from '@/lib/auth/nostr';
import type { Event as NostrEvent } from 'nostr-tools';

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

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

    // 2. Consume challenge
    const challenge = event.content;
    const valid = await consumeChallenge(challenge);
    if (!valid) {
      return NextResponse.json({ error: 'Invalid or expired challenge' }, { status: 401 });
    }

    // 3. Check the npub isn't already linked to another account
    const existing = await prisma.user.findUnique({ where: { nostrNpub: pubkey } });
    if (existing && existing.id !== user.id) {
      return NextResponse.json({ error: 'This Nostr key is already linked to another account' }, { status: 409 });
    }

    // 4. Link to current user
    await prisma.user.update({
      where: { id: user.id },
      data: {
        nostrNpub:       pubkey,
        nostrAuthType:   'upgraded',
        chatDisplayName: user.chatDisplayName || nativeDisplayName(pubkey),
        chatIcon:        'lightning',
      },
    });

    return NextResponse.json({ success: true, npub: pubkey });
  } catch (error) {
    console.error('Nostr link error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
