/**
 * GET /api/auth/dev-login?tier=admin|free|general|members|vip&redirect=/path
 *
 * Local-testing convenience: sets the dev-master cookie and redirects to the
 * requested path (default `/`). Returns 404 unless the bypass is enabled
 * (NODE_ENV !== 'production' AND LOCAL_DEV_AUTH_ENABLED=1) — probing the
 * endpoint in production reveals nothing.
 *
 * Defaults: tier=admin, redirect=/.
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  DEV_MASTER_COOKIE,
  isDevMasterEnabled,
  parseDevMasterCookie,
  synthesizeDevMasterUser,
} from '@/lib/auth/dev-master';

export const dynamic = 'force-dynamic';

const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 1 week — long enough for a dev session, short enough to remind you

export async function GET(req: NextRequest) {
  if (!isDevMasterEnabled()) {
    return new NextResponse('Not found', { status: 404 });
  }

  const tierParam = req.nextUrl.searchParams.get('tier') ?? 'admin';
  const role = parseDevMasterCookie(tierParam);
  if (!role) {
    return NextResponse.json(
      { error: 'Invalid tier. Use one of: admin, free, general, members, vip.' },
      { status: 400 }
    );
  }

  // Only redirect to same-origin paths — no open-redirect surface.
  const redirectParam = req.nextUrl.searchParams.get('redirect') ?? '/';
  const safeRedirect = redirectParam.startsWith('/') && !redirectParam.startsWith('//')
    ? redirectParam
    : '/';

  const target = new URL(safeRedirect, req.nextUrl.origin);
  const res = NextResponse.redirect(target);

  res.cookies.set(DEV_MASTER_COOKIE, role, {
    httpOnly: true,
    secure:   false,                  // local dev only — never set in prod (gated above)
    sameSite: 'lax',
    maxAge:   COOKIE_MAX_AGE_SECONDS,
    path:     '/',
  });

  // Surface the synthesised identity in a header so curl users / logs can see it.
  const user = synthesizeDevMasterUser(role);
  res.headers.set('X-Dev-Master-Role', role);
  res.headers.set('X-Dev-Master-Email', user.email);
  res.headers.set('X-Dev-Master-Tier', user.tier);

  return res;
}
