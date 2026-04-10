'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Sidebar } from '@/components/layout/Sidebar';
import { useTheme } from '@/components/layout/ThemeProvider';
import { useAuth } from '@/components/layout/AuthProvider';

// Pages inside /room that respect the user's theme instead of forcing dark
const PARCHMENT_COMPATIBLE = ['/room/cycle-gauge', '/room/dca-signal'];

export default function RoomLayout({ children }: { children: React.ReactNode }) {
  const { theme, setTheme } = useTheme();
  const { user }            = useAuth();
  const pathname            = usePathname();
  const [transitionPhase, setTransitionPhase] = useState<'entering' | 'visible'>('entering');

  const forcesDark = !PARCHMENT_COMPATIBLE.some(p => pathname.startsWith(p));

  useEffect(() => {
    const userPref = user?.themePref || localStorage.getItem('sr-theme') || 'parchment';
    sessionStorage.setItem('sr-ops-room-prev-theme', userPref);

    if (forcesDark) {
      // Original behaviour: ops-room pages are always dark
      document.documentElement.setAttribute('data-theme', 'dark');
      document.documentElement.classList.add('dark');
      if (theme !== 'dark') setTheme('dark');
    } else {
      // Parchment-compatible pages: restore the user's preference
      document.documentElement.setAttribute('data-theme', userPref);
      document.documentElement.classList.toggle('dark', userPref === 'dark');
      if (theme !== userPref) setTheme(userPref as 'dark' | 'parchment');
    }

    const timer = setTimeout(() => setTransitionPhase('visible'), 300);
    return () => {
      clearTimeout(timer);
      const prev = sessionStorage.getItem('sr-ops-room-prev-theme');
      sessionStorage.removeItem('sr-ops-room-prev-theme');
      // Delay restoration so another dark-force room (room↔bot-room) can
      // re-claim the session key before we revert the theme.
      if (prev && prev !== 'dark') {
        setTimeout(() => {
          if (!sessionStorage.getItem('sr-ops-room-prev-theme')) {
            setTheme(prev as 'dark' | 'parchment');
          }
        }, 50);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className="h-screen flex overflow-hidden"
      style={{ backgroundColor: forcesDark ? '#090d12' : 'var(--bg-primary)', position: 'relative' }}
    >
      {/* Dark transition overlay — only needed when switching to dark */}
      <div
        style={{
          position:      'absolute',
          inset:         0,
          background:    '#090d12',
          zIndex:        9999,
          pointerEvents: transitionPhase === 'visible' ? 'none' : 'auto',
          opacity:       (!forcesDark || transitionPhase === 'visible') ? 0 : 1,
          transition:    'opacity 300ms ease-out',
        }}
      />

      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0" style={{ position: 'relative' }}>
        {children}
      </div>
    </div>
  );
}
