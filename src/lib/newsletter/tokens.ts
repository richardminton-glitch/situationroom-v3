/**
 * Signed token generation and verification for newsletter confirmation and unsubscribe links.
 * Uses HMAC-SHA256 with a secret derived from the app's session secret.
 *
 * Token format: base64url(JSON payload) . base64url(HMAC signature)
 */

import { createHmac } from 'crypto';

const SECRET = process.env.SESSION_SECRET ?? 'dev-fallback-secret-change-in-prod';

type TokenPurpose = 'confirm' | 'unsubscribe';

interface TokenPayload {
  userId: string;
  purpose: TokenPurpose;
  exp: number; // unix timestamp seconds
}

function base64urlEncode(buf: Buffer): string {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function base64urlDecode(str: string): Buffer {
  const padded = str.replace(/-/g, '+').replace(/_/g, '/').padEnd(str.length + (4 - (str.length % 4)) % 4, '=');
  return Buffer.from(padded, 'base64');
}

function sign(payload: string): string {
  return base64urlEncode(
    createHmac('sha256', SECRET).update(payload).digest()
  );
}

export function createNewsletterToken(userId: string, purpose: TokenPurpose, ttlSeconds = 86400): string {
  const payload: TokenPayload = {
    userId,
    purpose,
    exp: Math.floor(Date.now() / 1000) + ttlSeconds,
  };
  const encodedPayload = base64urlEncode(Buffer.from(JSON.stringify(payload)));
  const signature = sign(encodedPayload);
  return `${encodedPayload}.${signature}`;
}

export function verifyNewsletterToken(token: string, expectedPurpose: TokenPurpose): { valid: true; userId: string } | { valid: false; reason: string } {
  const parts = token.split('.');
  if (parts.length !== 2) return { valid: false, reason: 'malformed' };

  const [encodedPayload, signature] = parts;
  const expectedSig = sign(encodedPayload);
  if (signature !== expectedSig) return { valid: false, reason: 'invalid signature' };

  let payload: TokenPayload;
  try {
    payload = JSON.parse(base64urlDecode(encodedPayload).toString('utf8'));
  } catch {
    return { valid: false, reason: 'parse error' };
  }

  if (payload.purpose !== expectedPurpose) return { valid: false, reason: 'wrong purpose' };
  if (Math.floor(Date.now() / 1000) > payload.exp) return { valid: false, reason: 'expired' };

  return { valid: true, userId: payload.userId };
}
