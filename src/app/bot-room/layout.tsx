'use client';

import { useEffect, useState } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { useTheme } from '@/components/layout/ThemeProvider';
import { useAuth } from '@/components/layout/AuthProvider';

export default function BotRoomLayout({ children }: { children: React.ReactNode }) {
  const { theme, setTheme } = useTheme();
  const { user } = useAuth();
  const [phase, setPhase] = useState<'entering' | 'visible'>('entering');

  // Force dark mode after mount — the opaque overlay (#060a0d, z-9999) covers
  // everything until the theme is applied, so useEffect is safe (no parchment flash).
  // Using useEffect (not useLayoutEffect) avoids a synchronous state update during
  // hydration that caused a server/client mismatch in the Sidebar theme toggle.
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'dark');
    document.documentElement.classList.add('dark');

    const userPref = user?.themePref || localStorage.getItem('sr-theme') || 'parchment';
    sessionStorage.setItem('sr-ops-room-prev-theme', userPref);
    if (theme !== 'dark') setTheme('dark');
    const t = setTimeout(() => setPhase('visible'), 300);
    return () => {
      clearTimeout(t);
      const prev = sessionStorage.getItem('sr-ops-room-prev-theme');
      sessionStorage.removeItem('sr-ops-room-prev-theme');
      if (prev && prev !== 'dark') setTheme(prev as 'dark' | 'parchment');
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="h-screen flex overflow-hidden" style={{ backgroundColor: '#060a0d', position: 'relative' }}>
      {/* Dark transition overlay */}
      <div style={{
        position: 'absolute', inset: 0, background: '#060a0d', zIndex: 9999,
        pointerEvents: phase === 'visible' ? 'none' : 'auto',
        opacity: phase === 'entering' ? 1 : 0,
        transition: 'opacity 300ms ease-out',
      }} />
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0" style={{ position: 'relative' }}>
        {children}
      </div>
    </div>
  );
}
