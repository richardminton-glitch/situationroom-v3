'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

const STORAGE_KEY = 'sr-chat-last-seen';
const POLL_INTERVAL = 15_000; // 15s background check

/**
 * Tracks unread chat messages using localStorage for last-seen timestamp.
 * Polls /api/chat/messages?limit=1 in the background to check for new messages.
 */
export function useUnreadChat(opsRoomOpen: boolean) {
  const [unreadCount, setUnreadCount] = useState(0);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Mark all messages as read (call when OpsRoom opens or receives messages)
  const markRead = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, Date.now().toString());
    setUnreadCount(0);
  }, []);

  // When OpsRoom opens, mark as read
  useEffect(() => {
    if (opsRoomOpen) markRead();
  }, [opsRoomOpen, markRead]);

  // Background poll for new messages when OpsRoom is closed
  useEffect(() => {
    if (opsRoomOpen) {
      // Stop polling while chat is open — OpsRoom does its own polling
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = null;
      return;
    }

    const checkUnread = async () => {
      try {
        const lastSeen = parseInt(localStorage.getItem(STORAGE_KEY) || '0', 10);
        const res = await fetch('/api/chat/messages?limit=50');
        if (!res.ok) return;
        const messages: Array<{ createdAt: string }> = await res.json();
        const newCount = messages.filter(
          (m) => new Date(m.createdAt).getTime() > lastSeen
        ).length;
        setUnreadCount(newCount);
      } catch { /* non-critical */ }
    };

    // Check immediately, then poll
    checkUnread();
    pollRef.current = setInterval(checkUnread, POLL_INTERVAL);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [opsRoomOpen]);

  return { unreadCount, markRead };
}
