/**
 * Trading bot message utilities.
 *
 * Posts AI trading announcements to the Bot Room chat (roomId = 'bot').
 * Separate from the ops room bot messages in @/lib/chat/bot.ts.
 *
 * All trade decisions, position syncs, and market hour alerts go here.
 * The ops room integration can be added later.
 */

import { prisma } from '@/lib/db';

const BOT_NPUB    = 'sitroom-ai';
const BOT_DISPLAY = 'SitRoom AI';
const BOT_ICON    = 'bot';
const ROOM_ID     = 'bot';   // bot room — NOT the ops room

// ── Post a message to the Bot Room chat ───────────────────────────────────────

async function postBotRoomMessage(
  content: string,
  eventType: string,
): Promise<void> {
  await prisma.chatMessage.create({
    data: {
      roomId:        ROOM_ID,
      authorNpub:    BOT_NPUB,
      authorDisplay: BOT_DISPLAY,
      authorIcon:    BOT_ICON,
      content,
      isBot:         true,
      eventType,
    },
  });
  console.log(`[bot-room] [${eventType}] ${content.slice(0, 100)}`);
}

// ── Convenience helpers for common trading events ─────────────────────────────

export async function announceTradeOpen(
  side: 'long' | 'short',
  leverage: number,
  entryPrice: number,
  conviction: number,
  reasoning: string,
): Promise<void> {
  const sideLabel = side.toUpperCase();
  const msg = `\u2016 OPENED ${sideLabel} ${leverage}\u00d7 @ $${entryPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })} | Conv. ${conviction}/10 \u2014 ${reasoning}`;
  await postBotRoomMessage(msg, 'trade_open');
}

export async function announceTradeClose(
  side: 'long' | 'short',
  entryPrice: number,
  exitPrice: number,
  pnlSats: number,
  reason: string,
): Promise<void> {
  const sideLabel = side.toUpperCase();
  const pnlSign = pnlSats >= 0 ? '+' : '';
  const msg = `\u2016 CLOSED ${sideLabel} @ $${exitPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })} (entry $${entryPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}) | P&L: ${pnlSign}${pnlSats} sats \u2014 ${reason}`;
  await postBotRoomMessage(msg, 'trade_close');
}

export async function announceHold(
  side: 'long' | 'short',
  leverage: number,
  entryPrice: number,
  unrealisedPnl: number,
  conviction: number,
  note: string,
): Promise<void> {
  const sideLabel = side.toUpperCase();
  const pnlSign = unrealisedPnl >= 0 ? '+' : '';
  const msg = `\u2016 HOLDING ${sideLabel} ${leverage}\u00d7 @ $${entryPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })} | P&L: ${pnlSign}${unrealisedPnl} sats | Conv. ${conviction}/10 \u2014 ${note}`;
  await postBotRoomMessage(msg, 'trade_hold');
}

export async function announceScanning(note: string): Promise<void> {
  await postBotRoomMessage(`\u2016 SCANNING \u2014 ${note}`, 'trade_scan');
}

export async function announceExternalClose(
  side: 'long' | 'short',
  reason: 'tp_hit' | 'sl_hit' | 'liquidation' | 'unknown',
  pnlSats: number,
  exitPrice: number,
): Promise<void> {
  const labels: Record<string, string> = {
    tp_hit: 'Take-profit hit',
    sl_hit: 'Stop-loss hit',
    liquidation: 'LIQUIDATED',
    unknown: 'Position closed externally',
  };
  const pnlSign = pnlSats >= 0 ? '+' : '';
  const msg = `\u2016 ${labels[reason]} \u2014 ${side.toUpperCase()} closed @ $${exitPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })} | P&L: ${pnlSign}${pnlSats} sats`;
  await postBotRoomMessage(msg, 'position_sync');
}

export async function announceGuardrailBlock(
  decision: string,
  reason: string,
): Promise<void> {
  await postBotRoomMessage(
    `\u2016 BLOCKED \u2014 ${decision} rejected by guardrails: ${reason}`,
    'guardrail_block',
  );
}

export async function announceAlert(content: string): Promise<void> {
  await postBotRoomMessage(`\u2016 ALERT \u2014 ${content}`, 'market_alert');
}
