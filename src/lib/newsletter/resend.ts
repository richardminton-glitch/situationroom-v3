/**
 * Resend client singleton + newsletter email sending helpers.
 */

import { Resend } from 'resend';

let _resend: Resend | null = null;

export function getResend(): Resend {
  if (!_resend) {
    const key = process.env.RESEND_API_KEY;
    if (!key) throw new Error('RESEND_API_KEY not set');
    _resend = new Resend(key);
  }
  return _resend;
}

export const FROM_ADDRESS = 'situationroom@rdctd.co.uk';
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://situationroom.space';
