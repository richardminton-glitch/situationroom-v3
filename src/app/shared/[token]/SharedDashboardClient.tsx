'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { DashboardGrid } from '@/components/layout/DashboardGrid';
import { MobileDashboardGrid } from '@/components/layout/MobileDashboardGrid';
import { useIsMobile } from '@/hooks/useIsMobile';
import { useTheme } from '@/components/layout/ThemeProvider';
import type { LayoutPanelItem } from '@/lib/panels/layouts';
import type { Theme } from '@/types';

interface Props {
  panels: LayoutPanelItem[];
  layoutName: string;
  ownerDisplay: string;
  viewerIsAuthed: boolean;
  token: string;
  shareTheme: Theme;
}

/**
 * Client-side chrome for /shared/[token]. Strips all the normal app shell
 * (TopBar, sidebar, OpsRoom) — only a minimal attribution strip, the read-only
 * dashboard, and a persistent free-signup CTA for unauthenticated viewers.
 */
export function SharedDashboardClient({
  panels,
  layoutName,
  ownerDisplay,
  viewerIsAuthed,
  token,
  shareTheme,
}: Props) {
  const isMobile = useIsMobile();
  const { theme: viewerTheme, setTheme } = useTheme();

  // Force the owner's chosen theme while this dashboard is mounted. The
  // sessionStorage flag is the existing "theme is externally controlled"
  // signal ThemeProvider already respects — it bypasses the tier gate (so
  // free invitees can be served dark) and prevents the viewer's stored
  // preference from leaking back in through the hydration effect.
  useEffect(() => {
    const prev: Theme = viewerTheme === 'dark' ? 'dark' : 'parchment';
    sessionStorage.setItem('sr-ops-room-prev-theme', prev);
    setTheme(shareTheme);
    return () => {
      sessionStorage.removeItem('sr-ops-room-prev-theme');
      setTheme(prev);
    };
    // Run once on mount — viewerTheme is captured as the snapshot to restore.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shareTheme]);

  // Signup redirect funnels invitees back here so the server component can
  // bind their new userId to the share on next load.
  const signupHref = `/login?redirect=${encodeURIComponent(`/shared/${token}`)}`;

  return (
    <div
      className="h-screen flex flex-col overflow-hidden"
      style={{ backgroundColor: 'var(--bg-primary)' }}
    >
      {/* ── Attribution strip ───────────────────────────────────────────── */}
      <header
        className="shrink-0 flex items-center justify-between px-4 py-2 border-b"
        style={{
          borderColor: 'var(--border-subtle)',
          backgroundColor: 'var(--bg-secondary)',
        }}
      >
        <div className="flex items-baseline gap-3 min-w-0">
          <Link
            href="/"
            style={{
              fontFamily: 'Georgia, serif',
              fontSize: 16,
              color: 'var(--text-primary)',
              textDecoration: 'none',
              letterSpacing: '0.04em',
              flexShrink: 0,
            }}
          >
            The Situation Room
          </Link>
          <span
            className="truncate"
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              color: 'var(--text-muted)',
              letterSpacing: '0.08em',
            }}
          >
            · {layoutName} · curated by {ownerDisplay}
          </span>
        </div>

        {!viewerIsAuthed && (
          <Link
            href={signupHref}
            style={{
              padding: '6px 16px',
              background: 'var(--accent-primary)',
              color: 'var(--bg-primary)',
              textDecoration: 'none',
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              letterSpacing: '0.1em',
              fontWeight: 'bold',
              whiteSpace: 'nowrap',
            }}
          >
            SIGN UP FREE →
          </Link>
        )}
      </header>

      {/* ── Dashboard canvas (read-only) ─────────────────────────────────── */}
      <main className="flex-1 min-h-0 overflow-auto">
        {isMobile ? (
          <MobileDashboardGrid layout={panels} />
        ) : (
          <DashboardGrid layout={panels} editable={false} />
        )}
      </main>

      {/* ── Footer CTA (unauthenticated only) ────────────────────────────── */}
      {!viewerIsAuthed && (
        <footer
          className="shrink-0 px-4 py-2 border-t text-center"
          style={{
            borderColor: 'var(--border-subtle)',
            backgroundColor: 'var(--bg-secondary)',
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            color: 'var(--text-muted)',
            letterSpacing: '0.04em',
          }}
        >
          Sign up for a free account to keep this dashboard on your sidebar.{' '}
          <Link
            href={signupHref}
            style={{ color: 'var(--accent-primary)', textDecoration: 'underline' }}
          >
            Create account →
          </Link>
        </footer>
      )}
    </div>
  );
}
