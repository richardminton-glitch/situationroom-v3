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
const MAX_RETRIES = 2;          // 1 initial + 2 retries = 3 total attempts
const RETRY_BACKOFF_MS = 1500;  // exponential: 1.5s, 3s

export interface GrokAnalysisOptions {
  system?: string;
  maxTokens?: number;
  timeoutMs?: number;
  jsonMode?: boolean;
}

function isTransientError(status: number): boolean {
  // 408 Request Timeout, 429 Too Many Requests, 500/502/503/504 server errors
  return status === 408 || status === 429 || (status >= 500 && status <= 504);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

  let lastError = '';
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
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

      if (res.ok) {
        const data = await res.json();
        const choice = data?.choices?.[0];
        const content = choice?.message?.content?.trim() ?? null;

        if (choice?.finish_reason === 'length') {
          console.warn(
            `[GrokAnalysis] Response truncated (finish_reason=length, max_tokens=${maxTokens}). ` +
            `Content preview: ${content?.substring(0, 80) ?? '(empty)'}...`
          );
        }

        return content;
      }

      const errBody = await res.text().catch(() => '');
      lastError = `HTTP ${res.status}: ${errBody.substring(0, 200)}`;

      // Non-transient errors (4xx except retryable) — fail immediately
      if (!isTransientError(res.status)) {
        console.error(`[GrokAnalysis] ${lastError}`);
        return null;
      }
      console.warn(`[GrokAnalysis] transient ${lastError} (attempt ${attempt + 1}/${MAX_RETRIES + 1})`);
    } catch (err) {
      // Network error / timeout — always retry
      lastError = err instanceof Error ? err.message : String(err);
      console.warn(`[GrokAnalysis] request error: ${lastError} (attempt ${attempt + 1}/${MAX_RETRIES + 1})`);
    }

    if (attempt < MAX_RETRIES) {
      await sleep(RETRY_BACKOFF_MS * (attempt + 1));
    }
  }

  console.error(`[GrokAnalysis] all retries exhausted: ${lastError}`);
  return null;
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
