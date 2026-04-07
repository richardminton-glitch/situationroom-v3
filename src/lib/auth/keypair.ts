/**
 * Server-side secp256k1 keypair management for email/PIN users.
 *
 * Every email user gets a server-custodied Nostr keypair on first login.
 * The private key is AES-256-GCM encrypted with KEYPAIR_ENCRYPTION_KEY.
 * This gives email users a persistent Nostr identity for the chat room
 * without requiring a browser extension.
 */

import crypto from 'crypto';
import { generateSecretKey, getPublicKey } from 'nostr-tools';

const ALGO = 'aes-256-gcm';
const IV_LEN = 12;

function getEncryptionKey(): Buffer {
  const raw = process.env.KEYPAIR_ENCRYPTION_KEY;
  if (!raw) throw new Error('KEYPAIR_ENCRYPTION_KEY env var not set');
  // Accept a 64-char hex key (32 bytes) or any string (SHA-256'd to 32 bytes)
  if (/^[0-9a-f]{64}$/i.test(raw)) return Buffer.from(raw, 'hex');
  return crypto.createHash('sha256').update(raw).digest();
}

export function encryptPrivkey(privkeyHex: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LEN);
  const cipher = crypto.createCipheriv(ALGO, key, iv) as crypto.CipherGCM;
  const encrypted = Buffer.concat([cipher.update(privkeyHex, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  // Format: iv(12):tag(16):ciphertext — all hex, colon-separated
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
}

export function decryptPrivkey(encoded: string): string {
  const [ivHex, tagHex, ctHex] = encoded.split(':');
  const key = getEncryptionKey();
  const iv = Buffer.from(ivHex, 'hex');
  const tag = Buffer.from(tagHex, 'hex');
  const ct = Buffer.from(ctHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGO, key, iv) as crypto.DecipherGCM;
  decipher.setAuthTag(tag);
  return decipher.update(ct) + decipher.final('utf8');
}

export interface AssignedKeypair {
  npub: string;           // hex pubkey (Nostr uses hex, not bech32)
  encryptedPrivkey: string;
}

export function generateAssignedKeypair(): AssignedKeypair {
  const privkey = generateSecretKey();          // Uint8Array
  const npub = getPublicKey(privkey);           // hex string
  const privkeyHex = Buffer.from(privkey).toString('hex');
  return { npub, encryptedPrivkey: encryptPrivkey(privkeyHex) };
}

/** Derive chatDisplayName for an email/PIN user: anon-XXXX (4 random digits). */
export function assignedDisplayName(): string {
  const digits = Math.floor(1000 + Math.random() * 9000);
  return `anon-${digits}`;
}
