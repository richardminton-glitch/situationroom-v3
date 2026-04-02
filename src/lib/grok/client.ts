/**
 * Grok (xAI) API client for multi-agent briefing generation.
 * Uses the Responses API with web search tool.
 */

const GROK_API_URL = 'https://api.x.ai/v1/responses';
const PRIMARY_MODEL = 'grok-4.20-multi-agent-0309';
const FALLBACK_MODEL = 'grok-3';
const MAX_OUTPUT_TOKENS = 1200;
const RETRY_DELAY = 5000;

interface GrokResponse {
  content: string;
  sources: { url: string; title: string }[];
  model: string;
  failed: boolean;
}

export async function callGrokAgent(prompt: string, retries = 1): Promise<GrokResponse> {
  const apiKey = process.env.GROK_API_KEY;
  if (!apiKey) {
    console.error('[Grok] No API key configured');
    return { content: '', sources: [], model: 'none', failed: true };
  }

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(GROK_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: attempt === 0 ? PRIMARY_MODEL : FALLBACK_MODEL,
          input: [{ role: 'user', content: prompt }],
          tools: [{ type: 'web_search' }],
          max_output_tokens: MAX_OUTPUT_TOKENS,
        }),
        signal: AbortSignal.timeout(90_000),
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.error(`[Grok] HTTP ${res.status}: ${errorText}`);
        if (attempt < retries) {
          await new Promise((r) => setTimeout(r, RETRY_DELAY));
          continue;
        }
        return { content: '', sources: [], model: 'error', failed: true };
      }

      const data = await res.json();

      let content = '';
      const sources: { url: string; title: string }[] = [];

      for (const item of data.output || []) {
        if (item.type === 'message' && item.content) {
          for (const block of item.content) {
            if (block.type === 'output_text') {
              content += block.text;
              if (block.annotations) {
                for (const ann of block.annotations) {
                  if (ann.type === 'url_citation' && ann.url) {
                    sources.push({ url: ann.url, title: ann.title || '' });
                  }
                }
              }
            }
          }
        }
      }

      return {
        content: content.trim(),
        sources,
        model: attempt === 0 ? PRIMARY_MODEL : FALLBACK_MODEL,
        failed: false,
      };
    } catch (error) {
      console.error(`[Grok] Attempt ${attempt + 1} failed:`, error);
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, RETRY_DELAY));
      }
    }
  }

  return { content: '', sources: [], model: 'failed', failed: true };
}
