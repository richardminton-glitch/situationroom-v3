/**
 * AI trading engine — calls Grok with structured snapshot and parses response.
 *
 * Uses a dedicated fetch call (not the shared callGrokAnalysis) to control
 * temperature and timeout for trading-specific requirements.
 */

import { TRADING_SYSTEM_PROMPT } from './system-prompt';
import { formatSnapshotPrompt } from './data-collector';
import type { AIDecision, TradingSnapshot } from './types';

const GROK_URL   = 'https://api.x.ai/v1/chat/completions';
const GROK_MODEL = 'grok-4-1-fast-non-reasoning';
const TEMPERATURE = 0.3;       // low for consistent analysis
const MAX_TOKENS  = 1200;
const TIMEOUT_MS  = 45_000;

// ── Main entry point ──────────────────────────────────────────────────────────

export async function getAIDecision(snapshot: TradingSnapshot): Promise<{
  decision: AIDecision;
  raw: string;
} | null> {
  const apiKey = process.env.GROK_API_KEY;
  if (!apiKey) {
    console.error('[ai-engine] GROK_API_KEY not set');
    return null;
  }

  const userPrompt = formatSnapshotPrompt(snapshot);

  try {
    const res = await fetch(GROK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: GROK_MODEL,
        messages: [
          { role: 'system', content: TRADING_SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
        response_format: { type: 'json_object' },
        max_tokens: MAX_TOKENS,
        temperature: TEMPERATURE,
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      console.error(`[ai-engine] Grok HTTP ${res.status}: ${errBody.substring(0, 300)}`);
      return null;
    }

    const data = await res.json();
    const raw = data?.choices?.[0]?.message?.content?.trim() ?? '';

    if (!raw) {
      console.error('[ai-engine] Empty response from Grok');
      return null;
    }

    // Parse and validate the JSON response
    const decision = parseAIResponse(raw);
    if (!decision) return null;

    return { decision, raw };
  } catch (err) {
    console.error('[ai-engine] Request failed:', err);
    return null;
  }
}

// ── Response parser + validator ───────────────────────────────────────────────

function parseAIResponse(raw: string): AIDecision | null {
  try {
    // Strip code fences if present (belt-and-suspenders with jsonMode)
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
    const obj = JSON.parse(cleaned);

    // Validate required top-level fields
    if (!obj.regime || !obj.signals || !obj.decision || !obj.conviction || !obj.reasoning || !obj.chat_message) {
      console.error('[ai-engine] Missing required fields in AI response');
      return null;
    }

    // Validate regime
    const validRegimes = ['TRENDING_BULLISH', 'TRENDING_BEARISH', 'RANGING', 'VOLATILE'];
    if (!validRegimes.includes(obj.regime)) {
      console.error(`[ai-engine] Invalid regime: ${obj.regime}`);
      return null;
    }

    // Validate decision
    const validDecisions = ['OPEN_LONG', 'OPEN_SHORT', 'CLOSE', 'HOLD', 'FLAT', 'ADJUST'];
    if (!validDecisions.includes(obj.decision)) {
      console.error(`[ai-engine] Invalid decision: ${obj.decision}`);
      return null;
    }

    // Validate all 5 signal layers exist
    const layers = ['macro', 'structure', 'onchain', 'price_action', 'sentiment'] as const;
    for (const layer of layers) {
      if (!obj.signals[layer] || typeof obj.signals[layer].score !== 'number') {
        console.error(`[ai-engine] Missing or invalid signal layer: ${layer}`);
        return null;
      }
      // Clamp scores to [-10, 10]
      obj.signals[layer].score = Math.max(-10, Math.min(10, obj.signals[layer].score));
    }

    // Recompute confluence from signals (don't trust AI's self-reported count)
    const confluence = { bullish_count: 0, bearish_count: 0, neutral_count: 0 };
    for (const layer of layers) {
      const bias = obj.signals[layer].bias;
      if (bias === 'bullish') confluence.bullish_count++;
      else if (bias === 'bearish') confluence.bearish_count++;
      else confluence.neutral_count++;
    }

    // Validate conviction range
    const conviction = Math.max(1, Math.min(10, Math.round(obj.conviction)));

    // Validate trade object if present
    let trade = null;
    if (obj.trade && (obj.decision === 'OPEN_LONG' || obj.decision === 'OPEN_SHORT' || obj.decision === 'ADJUST')) {
      const t = obj.trade;
      if (obj.decision !== 'ADJUST') {
        // Full trade validation for OPEN
        if (!t.side || !t.margin_pct || !t.leverage || !t.take_profit || !t.stop_loss) {
          console.error('[ai-engine] Incomplete trade parameters for OPEN decision');
          return null;
        }
      }
      trade = {
        side: t.side === 'short' ? 'short' as const : 'long' as const,
        margin_pct: Math.max(0.01, Math.min(0.15, Number(t.margin_pct) || 0.05)),
        leverage: Math.max(1, Math.min(10, Number(t.leverage) || 2)),
        take_profit: Number(t.take_profit) || 0,
        stop_loss: Number(t.stop_loss) || 0,
        tp_rationale: String(t.tp_rationale ?? ''),
        sl_rationale: String(t.sl_rationale ?? ''),
      };
    }

    return {
      regime: obj.regime,
      signals: obj.signals,
      confluence,
      decision: obj.decision,
      conviction,
      reasoning: {
        primary: String(obj.reasoning.primary ?? ''),
        supporting: Array.isArray(obj.reasoning.supporting) ? obj.reasoning.supporting.map(String) : [],
        risks: Array.isArray(obj.reasoning.risks) ? obj.reasoning.risks.map(String) : [],
      },
      trade,
      chat_message: String(obj.chat_message),
    };
  } catch (err) {
    console.error('[ai-engine] Failed to parse AI response:', err, raw.substring(0, 300));
    return null;
  }
}
