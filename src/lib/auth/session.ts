import { prisma } from '@/lib/db';
import crypto from 'crypto';
import { cookies } from 'next/headers';
import {
  DEV_MASTER_COOKIE,
  isDevMasterEnabled,
  parseDevMasterCookie,
  synthesizeDevMasterUser,
  warnIfDevMasterEnabled,
} from './dev-master';

const SESSION_COOKIE = 'sr_session';
const SESSION_EXPIRY_DAYS = 30;

// Loud warning the first time anything in this module is touched if the
// dev-master flag is on. Inert in production builds where the flag is unset.
warnIfDevMasterEnabled();

function generateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export async function createSession(userId: string): Promise<string> {
  const token = generateToken();
  const expiresAt = new Date(Date.now() + SESSION_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

  await prisma.session.create({
    data: { userId, token, expiresAt },
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    expires: expiresAt,
    path: '/',
  });

  return token;
}

export async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { token },
    include: { user: true },
  });

  if (!session || session.expiresAt < new Date()) {
    if (session) {
      await prisma.session.delete({ where: { id: session.id } });
    }
    return null;
  }

  // Update last seen
  await prisma.user.update({
    where: { id: session.userId },
    data: { lastSeenAt: new Date() },
  });

  return session;
}

export async function destroySession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return;

  await prisma.session.deleteMany({ where: { token } });
  cookieStore.delete(SESSION_COOKIE);
}

export async function getCurrentUser() {
  // Dev-master bypass: only active when both NODE_ENV !== 'production'
  // AND LOCAL_DEV_AUTH_ENABLED=1. Lets local testing skip the email/PIN flow
  // and impersonate any tier (admin / vip / members / general / free).
  if (isDevMasterEnabled()) {
    const cookieStore = await cookies();
    const role = parseDevMasterCookie(cookieStore.get(DEV_MASTER_COOKIE)?.value);
    if (role) return synthesizeDevMasterUser(role);
  }

  const session = await getSession();
  return session?.user ?? null;
}
