/**
 * SitRoom AI bot posting utilities.
 * Posts auto-generated messages into the Ops Room chat as the SitRoom AI identity.
 */

import { prisma } from '@/lib/db';
import { callGrokAnalysis } from '@/lib/grok/analysis';
import { normaliseThreatState } from '@/lib/room/threatEngine';

const BOT_NPUB = 'sitroom-ai';
const BOT_DISPLAY = 'SitRoom AI';
const BOT_ICON = 'bot';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://situationroom.space';

// ── Dedup guard ────────────────────────────────────────────────────────────────

/**
 * Returns true if this event type+key has already been fired in the last `windowMs`.
 * If not, records it and returns false (caller should proceed to post).
 */
export async function isDuplicate(eventType: string, eventKey: string, windowMs = 86400000): Promise<boolean> {
  const since = new Date(Date.now() - windowMs);
  try {
    const existing = await prisma.chatAlertLog.findUnique({
      where: { eventType_eventKey: { eventType, eventKey } },
    });
    if (existing && existing.firedAt > since) return true;

    await prisma.chatAlertLog.upsert({
      where: { eventType_eventKey: { eventType, eventKey } },
      create: { eventType, eventKey },
      update: { firedAt: new Date() },
    });
    return false;
  } catch {
    return false; // on error, allow the post
  }
}

// ── Bot post ───────────────────────────────────────────────────────────────────

export async function postBotMessage(content: string, eventType: string): Promise<void> {
  await prisma.chatMessage.create({
    data: {
      roomId: 'ops',
      authorNpub: BOT_NPUB,
      authorDisplay: BOT_DISPLAY,
      authorIcon: BOT_ICON,
      content,
      isBot: true,
      eventType,
    },
  });
  console.log(`[bot] Posted [${eventType}]: ${content.slice(0, 80)}`);
}

// ── AI content generation ──────────────────────────────────────────────────────

async function generateBotContent(systemPrompt: string, userPrompt: string): Promise<string> {
  const text = await callGrokAnalysis(userPrompt, {
    system: systemPrompt,
    maxTokens: 120,
    timeoutMs: 15_000,
  });
  return text ?? '';
}

// ── Event handlers ─────────────────────────────────────────────────────────────

export async function handleBtcPriceMove(priceBefore: number, priceNow: number): Promise<void> {
  const pctChange = ((priceNow - priceBefore) / priceBefore) * 100;
  if (Math.abs(pctChange) < 3) return;

  const dir = pctChange > 0 ? 'up' : 'down';
  const eventKey = `btc_${dir}_${Math.abs(pctChange).toFixed(0)}pct_${Math.floor(Date.now() / 3600000)}`;
  if (await isDuplicate('btc_price_move', eventKey, 3600000)) return; // 1hr dedup

  const content = await generateBotContent(
    'You are SitRoom AI, a sharp Bitcoin market intelligence bot. Write a single brief chat message (max 80 chars) about a BTC price movement. No hashtags. No emojis except occasionally. Be direct and analytical.',
    `BTC moved ${dir} ${Math.abs(pctChange).toFixed(1)}% in the last hour. Price now $${priceNow.toLocaleString()}. Write a brief chat comment.`
  );
  await postBotMessage(`${content}`, 'btc_price_move');
}

export async function handleConvictionBandChange(scoreBefore: number, scoreNow: number): Promise<void> {
  const thresholds = [70, 50, 30];
  for (const threshold of thresholds) {
    const crossed = (scoreBefore < threshold && scoreNow >= threshold) || (scoreBefore >= threshold && scoreNow < threshold);
    if (!crossed) continue;

    const dir = scoreNow >= threshold ? '>' : '<';
    const eventKey = `conviction_${threshold}_${dir}_${Math.floor(Date.now() / 86400000)}`;
    if (await isDuplicate('conviction_band', eventKey)) return;

    const label = scoreNow >= 70 ? 'Strong conviction' : scoreNow >= 50 ? 'Moderate conviction' : 'Low conviction';
    await postBotMessage(`${dir === '>' ? '\u25B2' : '\u25BC'} Conviction crossed ${threshold} \u2014 ${label} (${scoreNow}/100).`, 'conviction_band');
  }
}

export async function handleNewBriefing(headline: string, date: string, threatLevel: string): Promise<void> {
  const eventKey = `briefing_${date}`;
  if (await isDuplicate('new_briefing', eventKey)) return;

  const url = `${SITE_URL}/briefing/${date}`;
  const normalisedThreat = normaliseThreatState(threatLevel);
  await postBotMessage(`Today's briefing: ${headline} [THREAT: ${normalisedThreat}] \u2192 ${url}`, 'new_briefing');
}

export async function handleWhaleTx(amountBtc: number, direction: string): Promise<void> {
  if (amountBtc < 500) return; // only large whales
  const eventKey = `whale_${Math.floor(Date.now() / 3600000)}_${amountBtc.toFixed(0)}`;
  if (await isDuplicate('whale_tx', eventKey, 3600000)) return;

  await postBotMessage(`Whale movement detected: ${amountBtc.toLocaleString()} BTC moved ${direction}.`, 'whale_tx');
}

export async function handleFearGreedExtreme(value: number): Promise<void> {
  if (value > 10) return; // only extreme fear
  const eventKey = `fg_extreme_${Math.floor(Date.now() / 86400000)}`;
  if (await isDuplicate('fear_greed_extreme', eventKey)) return;

  await postBotMessage(`Fear & Greed at ${value} \u2014 Extreme Fear. Historically notable accumulation zone.`, 'fear_greed_extreme');
}
