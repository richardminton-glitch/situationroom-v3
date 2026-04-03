import { prisma } from '@/lib/db';
import crypto from 'crypto';

/**
 * Generate a random 4-digit PIN.
 */
export function generatePin(): string {
  const num = crypto.randomBytes(2).readUInt16BE(0) % 10000;
  return num.toString().padStart(4, '0');
}

/**
 * Get or create a static PIN for a user.
 * PIN is generated once and stored on the User record permanently.
 */
export async function getOrCreatePin(userId: string): Promise<string> {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { pin: true } });

  if (user.pin) return user.pin;

  // First login — generate and persist
  const pin = generatePin();
  await prisma.user.update({ where: { id: userId }, data: { pin } });
  return pin;
}

/**
 * Verify a PIN against the user's stored static PIN.
 */
export async function verifyPin(userId: string, pin: string): Promise<boolean> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { pin: true } });
  if (!user?.pin) return false;
  return user.pin === pin;
}
