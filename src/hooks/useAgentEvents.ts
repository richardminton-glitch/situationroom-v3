'use client';

/**
 * SSE client hook — connects to /api/room/events and maintains
 * a rolling buffer of AgentEvent objects.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import type { AgentEvent } from '@/lib/room/agentDomains';

const MAX_EVENTS = 500;
const RECONNECT_DELAY = 3000;

export interface AgentEventsState {
  events: AgentEvent[];
  connected: boolean;
  lastEventTime: number;
}

export function useAgentEvents() {
  const [state, setState] = useState<AgentEventsState>({
    events: [],
    connected: false,
    lastEventTime: 0,
  });

  const eventsRef = useRef<AgentEvent[]>([]);
  const sourceRef = useRef<EventSource | null>(null);
  const mountedRef = useRef(true);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Stable callback for new events
  const onNewEvent = useCallback((evt: AgentEvent) => {
    // Dedup by ID
    if (eventsRef.current.some((e) => e.id === evt.id)) return;

    eventsRef.current = [...eventsRef.current, evt].slice(-MAX_EVENTS);
    if (!mountedRef.current) return;

    setState({
      events: eventsRef.current,
      connected: true,
      lastEventTime: Date.now(),
    });
  }, []);

  const connect = useCallback(() => {
    if (sourceRef.current) {
      sourceRef.current.close();
    }

    const source = new EventSource('/api/room/events');
    sourceRef.current = source;

    source.onopen = () => {
      if (!mountedRef.current) return;
      setState((prev) => ({ ...prev, connected: true }));
    };

    source.onmessage = (e) => {
      if (!mountedRef.current) return;
      try {
        const evt: AgentEvent = JSON.parse(e.data);
        onNewEvent(evt);
      } catch {
        // Malformed event, skip
      }
    };

    source.onerror = () => {
      if (!mountedRef.current) return;
      setState((prev) => ({ ...prev, connected: false }));

      source.close();
      sourceRef.current = null;

      // Reconnect after delay
      reconnectTimerRef.current = setTimeout(() => {
        if (mountedRef.current) connect();
      }, RECONNECT_DELAY);
    };
  }, [onNewEvent]);

  useEffect(() => {
    mountedRef.current = true;
    connect();

    return () => {
      mountedRef.current = false;
      if (sourceRef.current) {
        sourceRef.current.close();
        sourceRef.current = null;
      }
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
    };
  }, [connect]);

  return state;
}
