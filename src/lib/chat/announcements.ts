/**
 * Ops Room announcements — brief, one-line system messages.
 *
 * Every automated post that should appear in the members-facing ops room
 * goes through this module. Keeping the formatting in one place means the
 * ops chat stays visually consistent (same cadence, same verbosity) across
 * briefings, trade events, subscription activations, and donations.
 *
 * **Routing:** all functions below post via `postBotMessage()` from
 * `@/lib/chat/bot.ts`, which writes to `roomId: 'ops'`. The trading bot
 * still also writes detailed telemetry to the `bot` room via
 * `@/lib/trading/bot-messages.ts` — that verbose channel is unchanged.
 *
 * **Dedup:** each helper generates an eventKey tied to the day + the
 * specific event, and passes it through `isDuplicate()` so restart
 * loops can't flood the chat.
 *
 * **Brevity rules:** every message is a single line, no URLs, no
 * multi-line blocks. Threat levels go in `[THREAT: X]` square brackets
 * at the end of briefing posts only.
 */

import { postBotMessage, isDuplicate } from '@/lib/chat/bot';
import { normaliseThreatState } from '@/lib/room/threatEngine';
import { TIER_LABELS } from '@/lib/auth/tier';
import type { Tier } from '@/types';

// ── Formatters ────────────────────────────────────────────────────────────────

function formatUsd(n: number): string {
  return `$${n.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}

function formatSats(n: number): string {
  return `${n.toLocaleString('en-US')} sats`;
}

function signed(n: number): string {
  return n >= 0 ? `+${n}` : `${n}`;
}

// ── Daily briefing ────────────────────────────────────────────────────────────

/**
 * `Today's briefing: <headline> [THREAT: <LEVEL>]`
 *
 * Dedup: once per date. Safe to call repeatedly from the briefing cron.
 */
export async function announceBriefing(
  headline: string,
  date: string,
  threatLevel: string,
): Promise<void> {
  const eventKey = `briefing_${date}`;
  if (await isDuplicate('new_briefing', eventKey)) return;

  const level = normaliseThreatState(threatLevel);
  await postBotMessage(
    `Today's briefing: ${headline} [THREAT: ${level}]`,
    'new_briefing',
  );
}

// ── Trading bot ───────────────────────────────────────────────────────────────

/**
 * `[BOT] LONG opened 3× @ $68,605 · conv 9/10`
 *
 * No dedup — every open is distinct.
 */
export async function announceTradeOpen(
  side: 'long' | 'short',
  leverage: number,
  entryPrice: number,
  conviction: number,
): Promise<void> {
  await postBotMessage(
    `[BOT] ${side.toUpperCase()} opened ${leverage}\u00d7 @ ${formatUsd(entryPrice)} \u00b7 conv ${conviction}/10`,
    'trade_open',
  );
}

/**
 * `[BOT] LONG closed @ $69,120 · +842 sats (ai_decision)`
 *
 * Reason is the closing reason: 'ai_decision', 'tp_hit', 'sl_hit',
 * 'liquidation', 'manual'. The one-liner tells the reader everything
 * they need without scrolling.
 */
export async function announceTradeClose(
  side: 'long' | 'short',
  exitPrice: number,
  pnlSats: number,
  reason: string,
): Promise<void> {
  await postBotMessage(
    `[BOT] ${side.toUpperCase()} closed @ ${formatUsd(exitPrice)} \u00b7 ${signed(pnlSats)} sats (${reason})`,
    'trade_close',
  );
}

/**
 * Called when position-sync detects the LNM-side has already closed a
 * trade outside our control (TP hit, SL hit, liquidation). Uses a more
 * alarming prefix for SL-hit / liquidation events.
 */
export async function announceExternalClose(
  side: 'long' | 'short',
  reason: 'tp_hit' | 'sl_hit' | 'liquidation' | 'unknown',
  pnlSats: number,
  exitPrice: number,
): Promise<void> {
  const labels: Record<string, string> = {
    tp_hit:      'TP hit',
    sl_hit:      'SL hit',
    liquidation: 'LIQUIDATED',
    unknown:     'closed externally',
  };
  await postBotMessage(
    `[BOT] ${side.toUpperCase()} ${labels[reason]} @ ${formatUsd(exitPrice)} \u00b7 ${signed(pnlSats)} sats`,
    'trade_close',
  );
}

// ── Subscription + donation ──────────────────────────────────────────────────

/**
 * `anon-1234 has subscribed to the Members tier`
 * `anon-5678 has subscribed to the VIP tier (lifetime)`
 *
 * displayName falls back to `anon-XXXX` (last 4 of userId) when the
 * user hasn't set a chat name. Dedup is keyed to the payment id so
 * the message only fires once per activation, even if the cron runs
 * twice.
 */
export async function announceSubscription(
  displayName: string,
  tier: Tier,
  duration: 'monthly' | 'trial' | 'lifetime',
  paymentId: string,
): Promise<void> {
  if (tier === 'free') return;
  const eventKey = `sub_${paymentId}`;
  if (await isDuplicate('subscription_activated', eventKey)) return;

  const tierLabel = TIER_LABELS[tier];
  const suffix =
    duration === 'lifetime' ? ' (lifetime)'
    : duration === 'trial'  ? ' (7-day trial)'
    : '';
  await postBotMessage(
    `${displayName} has subscribed to the ${tierLabel} tier${suffix}`,
    'subscription_activated',
  );
}

/**
 * `thank you anon-1234 for the 10,000 sats donation`
 *
 * displayName is optional — LNURL donations arrive without a memo
 * and we can't attach a user to them, so we fall back to
 * "an anonymous supporter".
 */
export async function announceDonation(
  amountSats: number,
  paymentId: string,
  displayName?: string | null,
): Promise<void> {
  const eventKey = `donation_${paymentId}`;
  if (await isDuplicate('donation_received', eventKey)) return;

  const from = displayName && displayName.trim().length > 0
    ? displayName
    : 'an anonymous supporter';
  await postBotMessage(
    `thank you ${from} for the ${formatSats(amountSats)} donation`,
    'donation_received',
  );
}
