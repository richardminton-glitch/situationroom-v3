/**
 * Grok analysis client — used by all AI analysis routes.
 *
 * Uses the OpenAI-compatible Chat Completions API with grok-4.1-fast.
 * Separate from the briefing pipeline (which uses Responses API + web search).
 *
 * Cost: $0.20/M input, $0.50/M output — cheap enough for subscriber-facing calls.
 */

const GROK_ANALYSIS_URL = 'https://api.x.ai/v1/chat/completions';
const GROK_ANALYSIS_MODEL = 'grok-4-1-fast-non-reasoning';
const DEFAULT_TIMEOUT_MS = 30_000;

export interface GrokAnalysisOptions {
  system?: string;
  maxTokens?: number;
  timeoutMs?: number;
  jsonMode?: boolean;
}

/**
 * Call Grok for AI analysis.
 * Returns the raw text response, or null on failure.
 */
export async function callGrokAnalysis(
  prompt: string,
  options: GrokAnalysisOptions = {}
): Promise<string | null> {
  const apiKey = process.env.GROK_API_KEY;
  if (!apiKey) {
    console.error('[GrokAnalysis] GROK_API_KEY not set');
    return null;
  }

  const {
    system,
    maxTokens = 512,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    jsonMode = false,
  } = options;

  const messages: Array<{ role: string; content: string }> = [];
  if (system) {
    messages.push({ role: 'system', content: system });
  }
  messages.push({ role: 'user', content: prompt });

  const body: Record<string, unknown> = {
    model: GROK_ANALYSIS_MODEL,
    messages,
    max_tokens: maxTokens,
  };
  if (jsonMode) {
    body.response_format = { type: 'json_object' };
  }

  try {
    const res = await fetch(GROK_ANALYSIS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      console.error(`[GrokAnalysis] HTTP ${res.status}: ${errBody.substring(0, 300)}`);
      return null;
    }

    const data = await res.json();
    return data?.choices?.[0]?.message?.content?.trim() ?? null;
  } catch (err) {
    console.error('[GrokAnalysis] Request failed:', err);
    return null;
  }
}

/**
 * Convenience: call Grok and parse the response as JSON.
 * Handles markdown code fences and returns parsed object, or null on failure.
 */
export async function callGrokAnalysisJSON<T = unknown>(
  prompt: string,
  options: GrokAnalysisOptions = {}
): Promise<T | null> {
  const text = await callGrokAnalysis(prompt, { ...options, jsonMode: true });
  if (!text) return null;

  try {
    // Strip markdown code fences if present (belt-and-suspenders with jsonMode)
    const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
    return JSON.parse(cleaned) as T;
  } catch {
    console.error('[GrokAnalysis] Failed to parse JSON response:', text.substring(0, 200));
    return null;
  }
}
