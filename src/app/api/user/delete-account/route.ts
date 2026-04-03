/**
 * DELETE /api/user/delete-account
 *
 * Permanently deletes the authenticated user's account and all associated data.
 * Requires the user to confirm by sending { confirm: true }.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, destroySession } from '@/lib/auth/session';
import { prisma } from '@/lib/db';

export async function DELETE(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  if (!body.confirm) {
    return NextResponse.json({ error: 'Must confirm deletion' }, { status: 400 });
  }

  try {
    // Cascade delete handles sessions, pin codes, layouts, etc.
    await prisma.user.delete({ where: { id: user.id } });

    // Destroy session cookie
    await destroySession();

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[Account] Delete failed:', err);
    return NextResponse.json({ error: 'Failed to delete account' }, { status: 500 });
  }
}
