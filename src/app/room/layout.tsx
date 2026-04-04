'use client';

import { useEffect, useState } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { useTheme } from '@/components/layout/ThemeProvider';

export default function RoomLayout({ children }: { children: React.ReactNode }) {
  const { theme, setTheme } = useTheme();
  const [transitionPhase, setTransitionPhase] = useState<'entering' | 'visible'>('entering');

  // Force dark mode on mount, revert on unmount
  useEffect(() => {
    const storedTheme = localStorage.getItem('sr-theme') || 'parchment';
    sessionStorage.setItem('sr-ops-room-prev-theme', storedTheme);
    if (theme !== 'dark') setTheme('dark');
    const timer = setTimeout(() => setTransitionPhase('visible'), 300);
    return () => {
      clearTimeout(timer);
      const prev = sessionStorage.getItem('sr-ops-room-prev-theme');
      sessionStorage.removeItem('sr-ops-room-prev-theme');
      if (prev && prev !== 'dark') setTheme(prev as 'dark' | 'parchment');
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className="h-screen flex overflow-hidden"
      style={{ backgroundColor: '#090d12', position: 'relative' }}
    >
      {/* Dark transition overlay — covers everything while theme switches */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: '#090d12',
          zIndex: 9999,
          pointerEvents: transitionPhase === 'visible' ? 'none' : 'auto',
          opacity: transitionPhase === 'entering' ? 1 : 0,
          transition: 'opacity 300ms ease-out',
        }}
      />

      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        {children}
      </div>
    </div>
  );
}
