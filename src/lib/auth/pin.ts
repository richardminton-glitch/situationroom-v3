import { prisma } from '@/lib/db';
import crypto from 'crypto';

const PIN_LENGTH = 6;
const PIN_EXPIRY_MINUTES = 10;

export function generatePin(): string {
  const bytes = crypto.randomBytes(4);
  const num = bytes.readUInt32BE(0) % Math.pow(10, PIN_LENGTH);
  return num.toString().padStart(PIN_LENGTH, '0');
}

export async function createPinForUser(userId: string): Promise<string> {
  const pin = generatePin();
  const expiresAt = new Date(Date.now() + PIN_EXPIRY_MINUTES * 60 * 1000);

  // Invalidate any existing unused pins
  await prisma.pinCode.updateMany({
    where: { userId, used: false },
    data: { used: true },
  });

  await prisma.pinCode.create({
    data: {
      userId,
      pin,
      expiresAt,
    },
  });

  return pin;
}

export async function verifyPin(userId: string, pin: string): Promise<boolean> {
  const record = await prisma.pinCode.findFirst({
    where: {
      userId,
      pin,
      used: false,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: 'desc' },
  });

  if (!record) return false;

  await prisma.pinCode.update({
    where: { id: record.id },
    data: { used: true },
  });

  return true;
}
