import { NextResponse } from 'next/server';
import { createChallenge } from '@/lib/auth/nostr';

export async function POST() {
  try {
    const challenge = await createChallenge();
    return NextResponse.json({ challenge });
  } catch (error) {
    console.error('Nostr challenge error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
