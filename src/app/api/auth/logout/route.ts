import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { destroySession } from '@/lib/auth/session';
import { DEV_MASTER_COOKIE, isDevMasterEnabled } from '@/lib/auth/dev-master';

export async function POST() {
  try {
    await destroySession();

    // Also clear the dev-master cookie if the bypass is enabled, so the
    // regular Sign Out button logs out both real and dev sessions.
    if (isDevMasterEnabled()) {
      const cookieStore = await cookies();
      cookieStore.delete(DEV_MASTER_COOKIE);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
