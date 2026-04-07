/**
 * Nostr DM publisher (NIP-04 encrypted direct messages, kind 4).
 *
 * Used for system messages from the Situation Room bot to a user's npub —
 * e.g. subscription expiry warnings.
 *
 * Required env vars:
 *   SITROOM_BOT_NSEC  — bot's secret key (64-char hex), no NIP-19 prefix
 *   NOSTR_RELAY_URL   — wss:// URL to publish to (single relay for now)
 *
 * If either env var is missing, sendNostrDm() logs and resolves false without
 * throwing — same pattern as the relay whitelist helper. This lets the rest
 * of the lifecycle pipeline run cleanly before the relay is provisioned.
 *
 * NIP-04 is technically deprecated in favour of NIP-17 gift-wrap, but most
 * clients still display NIP-04 DMs and the encryption primitive is shipped
 * out of the box by nostr-tools — fine for low-volume system notifications.
 */

import { Relay, finalizeEvent, nip04 } from 'nostr-tools';

const RELAY_URL = process.env.NOSTR_RELAY_URL;
const BOT_NSEC_HEX = process.env.SITROOM_BOT_NSEC;

function isConfigured(): boolean {
  return Boolean(RELAY_URL && BOT_NSEC_HEX && /^[0-9a-f]{64}$/i.test(BOT_NSEC_HEX));
}

function botSecretKey(): Uint8Array {
  // Already validated by isConfigured()
  return Uint8Array.from(Buffer.from(BOT_NSEC_HEX!, 'hex'));
}

/**
 * Send an encrypted DM from the bot account to a recipient npub.
 * Returns true if the relay accepted the event, false on any failure
 * (including missing config — caller should not treat as fatal).
 */
export async function sendNostrDm(recipientNpubHex: string, plaintext: string): Promise<boolean> {
  if (!isConfigured()) {
    console.log(`[nostr-dm] skipped — SITROOM_BOT_NSEC or NOSTR_RELAY_URL not set (recipient ${recipientNpubHex.slice(0, 8)}…)`);
    return false;
  }
  if (!/^[0-9a-f]{64}$/i.test(recipientNpubHex)) {
    console.warn(`[nostr-dm] invalid recipient npub: ${recipientNpubHex}`);
    return false;
  }

  const sk = botSecretKey();
  let ciphertext: string;
  try {
    ciphertext = nip04.encrypt(sk, recipientNpubHex, plaintext);
  } catch (err) {
    console.error('[nostr-dm] nip04 encrypt failed:', err);
    return false;
  }

  const event = finalizeEvent(
    {
      kind: 4,
      created_at: Math.floor(Date.now() / 1000),
      tags: [['p', recipientNpubHex]],
      content: ciphertext,
    },
    sk,
  );

  let relay: Relay | null = null;
  try {
    relay = await Relay.connect(RELAY_URL!);
    await relay.publish(event);
    console.log(`[nostr-dm] delivered to ${recipientNpubHex.slice(0, 8)}… via ${RELAY_URL}`);
    return true;
  } catch (err) {
    console.error('[nostr-dm] publish failed:', err);
    return false;
  } finally {
    if (relay) {
      try { relay.close(); } catch { /* ignore */ }
    }
  }
}
