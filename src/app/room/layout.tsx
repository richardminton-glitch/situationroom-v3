'use client';

import { useEffect, useState } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { useTheme } from '@/components/layout/ThemeProvider';
import { useAuth } from '@/components/layout/AuthProvider';

export default function RoomLayout({ children }: { children: React.ReactNode }) {
  const { theme, setTheme } = useTheme();
  const { user } = useAuth();
  const [transitionPhase, setTransitionPhase] = useState<'entering' | 'visible'>('entering');

  // Force dark mode on mount, revert to user preference on unmount
  useEffect(() => {
    // Save user's actual preference so we can restore it
    const userPref = user?.themePref || localStorage.getItem('sr-theme') || 'parchment';
    sessionStorage.setItem('sr-ops-room-prev-theme', userPref);
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
      <div className="flex-1 flex flex-col min-w-0" style={{ position: 'relative' }}>
        {children}
      </div>
    </div>
  );
}
