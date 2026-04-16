/**
 * GET /api/auth/dev-logout?redirect=/path
 *
 * Clears the dev-master cookie and redirects (default `/`). 404 unless the
 * bypass is enabled.
 */

import { NextRequest, NextResponse } from 'next/server';
import { DEV_MASTER_COOKIE, isDevMasterEnabled } from '@/lib/auth/dev-master';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  if (!isDevMasterEnabled()) {
    return new NextResponse('Not found', { status: 404 });
  }

  const redirectParam = req.nextUrl.searchParams.get('redirect') ?? '/';
  const safeRedirect = redirectParam.startsWith('/') && !redirectParam.startsWith('//')
    ? redirectParam
    : '/';

  const target = new URL(safeRedirect, req.nextUrl.origin);
  const res = NextResponse.redirect(target);
  res.cookies.delete(DEV_MASTER_COOKIE);
  return res;
}
