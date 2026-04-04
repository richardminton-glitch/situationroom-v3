'use client';

/**
 * Agent log — generates ambient + event-driven telemetry entries.
 * Ambient entries are threat-level-aware: at QUIET they report
 * routine scans; at CRITICAL they report emergency protocols.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import type { AgentEvent } from '@/lib/room/agentDomains';
import { DOMAIN_AGENTS } from '@/lib/room/agentDomains';
import type { ThreatState } from '@/lib/room/threatEngine';
import {
  randomAmbientEntry,
  eventLogEntries,
  type LogEntry,
} from '@/lib/room/logTemplates';

const MAX_ENTRIES = 200;
const AMBIENT_MIN_MS = 6000;
const AMBIENT_MAX_MS = 14000;

export function useAgentLog(events: AgentEvent[], threatState: ThreatState = 'QUIET') {
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const entriesRef = useRef<LogEntry[]>([]);
  const processedEventsRef = useRef(new Set<string>());
  const mountedRef = useRef(true);
  const threatStateRef = useRef<ThreatState>(threatState);

  // Keep threat state ref current
  useEffect(() => {
    threatStateRef.current = threatState;
  }, [threatState]);

  const pushEntry = useCallback((entry: LogEntry) => {
    entriesRef.current = [...entriesRef.current, entry].slice(-MAX_ENTRIES);
    if (mountedRef.current) {
      setEntries([...entriesRef.current]);
    }
  }, []);

  // Ambient log generation — uses current threat level
  useEffect(() => {
    mountedRef.current = true;
    const timers: ReturnType<typeof setTimeout>[] = [];

    const scheduleAmbient = (domain: string) => {
      const delay = AMBIENT_MIN_MS + Math.random() * (AMBIENT_MAX_MS - AMBIENT_MIN_MS);
      const timer = setTimeout(() => {
        if (!mountedRef.current) return;
        pushEntry(randomAmbientEntry(domain, threatStateRef.current));
        scheduleAmbient(domain);
      }, delay);
      timers.push(timer);
    };

    // Start ambient for all domains + coordinator
    for (const domain of [...DOMAIN_AGENTS, 'COORDINATOR' as const]) {
      const initialDelay = Math.random() * 3000;
      const timer = setTimeout(() => {
        if (!mountedRef.current) return;
        pushEntry(randomAmbientEntry(domain, threatStateRef.current));
        scheduleAmbient(domain);
      }, initialDelay);
      timers.push(timer);
    }

    return () => {
      mountedRef.current = false;
      timers.forEach(clearTimeout);
    };
  }, [pushEntry]);

  // Event-driven log entries
  useEffect(() => {
    for (const evt of events) {
      if (processedEventsRef.current.has(evt.id)) continue;
      processedEventsRef.current.add(evt.id);

      const logEntries = eventLogEntries({
        headline: evt.headline,
        source: evt.source,
        tier: evt.tier,
        domains: evt.domains,
        scoreImpact: evt.scoreImpact,
      });

      // Stagger entries with timeouts for dramatic effect
      logEntries.forEach((entry, i) => {
        setTimeout(() => {
          if (mountedRef.current) {
            pushEntry(entry);
          }
        }, i * 600);
      });
    }

    // Prune processed set
    if (processedEventsRef.current.size > 1000) {
      const arr = Array.from(processedEventsRef.current);
      processedEventsRef.current = new Set(arr.slice(-500));
    }
  }, [events, pushEntry]);

  return { entries };
}
