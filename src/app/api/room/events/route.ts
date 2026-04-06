/**
 * SSE endpoint — streams AgentEvent objects to connected clients.
 *
 * On connect: backfill recent events (last 2 hours).
 * Then: poll RSS every 60s, diff against sent IDs, stream new events.
 * Heartbeat every 15s to keep connection alive.
 */

import { fetchRSSAll } from '@/lib/data/rss';
import { classifiedToAgentEvent } from '@/lib/room/eventMapper';
import type { AgentEvent } from '@/lib/room/agentDomains';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** Track sent event IDs server-side to avoid duplicates */
const globalSentIds = new Set<string>();
let lastPollCache: AgentEvent[] = [];
let lastPollTime = 0;

/** Convert classified articles to agent events, dedup, cache */
async function pollForEvents(): Promise<AgentEvent[]> {
  const now = Date.now();
  // Reuse cached result within 30 seconds to avoid hammering RSS
  if (lastPollCache.length > 0 && now - lastPollTime < 30_000) {
    return lastPollCache;
  }

  try {
    const { headlines } = await fetchRSSAll();
    const twoHoursAgo = now - 2 * 60 * 60 * 1000;

    const events: AgentEvent[] = headlines
      .filter((h) => h.time * 1000 > twoHoursAgo)
      .map((h) => classifiedToAgentEvent({
        title: h.title,
        source: h.source,
        link: h.link,
        time: h.time,
        primaryCategory: h.primaryCategory,
        secondaryCategories: h.secondaryCategories || [],
        relevanceToBitcoin: h.relevanceToBitcoin,
        classificationConfidence: h.classificationConfidence,
        description: h.description || '',
      }));

    lastPollCache = events;
    lastPollTime = now;

    // Prune old IDs from the global set (keep last 2000)
    if (globalSentIds.size > 2000) {
      const arr = Array.from(globalSentIds);
      arr.slice(0, arr.length - 1000).forEach((id) => globalSentIds.delete(id));
    }

    return events;
  } catch {
    return lastPollCache;
  }
}

export async function GET(request: Request) {
  const encoder = new TextEncoder();

  // Per-connection sent IDs
  const connectionSentIds = new Set<string>();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: string) => {
        try {
          controller.enqueue(encoder.encode(`data: ${data}\n\n`));
        } catch {
          // Connection closed
        }
      };

      const sendHeartbeat = () => {
        try {
          controller.enqueue(encoder.encode(`: heartbeat\n\n`));
        } catch {
          // Connection closed
        }
      };

      // Initial backfill
      try {
        const events = await pollForEvents();
        for (const evt of events) {
          connectionSentIds.add(evt.id);
          globalSentIds.add(evt.id);
          send(JSON.stringify(evt));
        }
      } catch {
        // Non-critical
      }

      // Poll for new events every 60s
      const pollInterval = setInterval(async () => {
        try {
          const events = await pollForEvents();
          for (const evt of events) {
            if (!connectionSentIds.has(evt.id)) {
              connectionSentIds.add(evt.id);
              globalSentIds.add(evt.id);
              send(JSON.stringify(evt));
            }
          }
        } catch {
          // Non-critical
        }
      }, 60_000);

      // Heartbeat every 15s
      const heartbeatInterval = setInterval(sendHeartbeat, 15_000);

      // Cleanup on disconnect
      request.signal.addEventListener('abort', () => {
        clearInterval(pollInterval);
        clearInterval(heartbeatInterval);
        try { controller.close(); } catch { /* already closed */ }
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
