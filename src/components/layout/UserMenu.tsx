'use client';

/**
 * UserMenu — top-right popover. When logged out, shows a Sign In link.
 * When logged in, shows user identity + an account/settings popover with:
 *   - Account link
 *   - Admin link (admin emails only)
 *   - Feedback (opens FeedbackModal)
 *   - Theme toggle (gated by general+)
 *   - Font size controls
 *   - Log out
 *
 * Migrated from the bottom of the old Sidebar.
 */

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  CaretDown,
  Envelope,
  GearSix,
  Lightning,
  Moon,
  ShieldStar,
  SignIn,
  SignOut,
  Sun,
  TextAa,
  UserCircle,
} from '@phosphor-icons/react';
import { useAuth } from './AuthProvider';
import { useTheme } from './ThemeProvider';
import { useTier } from '@/hooks/useTier';
import { isAdmin as checkAdmin, TIER_LABELS } from '@/lib/auth/tier';
import { FeedbackModal } from '@/components/feedback/FeedbackModal';

const FONT_MIN = 11;
const FONT_MAX = 20;
const FONT_DEFAULT = 14;

export function UserMenu() {
  const { user, logout, updateUser } = useAuth();
  const { theme, setTheme } = useTheme();
  const { canAccess, userTier } = useTier();

  const [open, setOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [fontSize, setFontSize] = useState<number>(FONT_DEFAULT);
  const [mounted, setMounted] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Hydrate font size from localStorage
  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem('sr-font-size');
    if (stored) setFontSize(parseInt(stored, 10));
  }, []);

  // Apply + persist font size
  useEffect(() => {
    if (!mounted) return;
    document.documentElement.style.fontSize = `${fontSize}px`;
    localStorage.setItem('sr-font-size', String(fontSize));
  }, [fontSize, mounted]);

  // Close popover on outside click / Escape
  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (
        popoverRef.current && !popoverRef.current.contains(e.target as Node) &&
        triggerRef.current && !triggerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  // ── Logged out: just a Sign In link ──
  if (!user) {
    return (
      <Link
        href="/login"
        className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs transition-opacity hover:opacity-80"
        style={{
          color: 'var(--accent-primary)',
          fontFamily: 'var(--font-mono)',
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
        }}
      >
        <SignIn size={14} weight="regular" />
        <span>Sign in</span>
      </Link>
    );
  }

  // ── Logged in: avatar trigger + popover ──
  const initial = (user.displayName || user.email)[0].toUpperCase();
  const darkLocked = !canAccess('general');
  const displayTheme = mounted ? theme : 'parchment';

  return (
    <>
      <button
        ref={triggerRef}
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 px-2 py-1 rounded transition-colors"
        style={{
          color: 'var(--text-primary)',
          backgroundColor: open ? 'var(--bg-card)' : 'transparent',
          border: `1px solid ${open ? 'var(--border-primary)' : 'transparent'}`,
        }}
      >
        <span
          className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium shrink-0"
          style={{ backgroundColor: 'var(--accent-primary)', color: 'var(--bg-primary)' }}
        >
          {initial}
        </span>
        <span className="hidden md:flex flex-col items-start" style={{ fontFamily: 'var(--font-mono)' }}>
          <span className="text-xs truncate" style={{ maxWidth: '120px' }}>
            {user.displayName || user.email.split('@')[0]}
          </span>
          {userTier !== 'free' && (
            <span style={{ fontSize: '9px', color: 'var(--accent-primary)', letterSpacing: '0.06em' }}>
              {TIER_LABELS[userTier].toUpperCase()}
            </span>
          )}
        </span>
        <CaretDown size={10} weight="bold" style={{ color: 'var(--text-muted)' }} />
      </button>

      {open && (
        <div
          ref={popoverRef}
          className="absolute right-0 top-full mt-1 w-60 rounded shadow-lg z-[200]"
          style={{
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-primary)',
            fontFamily: 'var(--font-mono)',
          }}
        >
          {/* Identity row */}
          <div className="px-3 py-2.5 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
            <div className="text-xs truncate" style={{ color: 'var(--text-primary)' }}>
              {user.displayName || user.email.split('@')[0]}
            </div>
            <div className="text-xs truncate" style={{ color: 'var(--text-muted)', fontSize: '10px' }}>
              {user.email}
            </div>
          </div>

          {/* Nav items */}
          <div className="py-1">
            <MenuLink href="/account" icon={<UserCircle size={14} />} label="Account" onClick={() => setOpen(false)} />
            {checkAdmin(user.email) && (
              <MenuLink
                href="/admin"
                icon={<ShieldStar size={14} />}
                label="Admin"
                onClick={() => setOpen(false)}
                accent="#7c5cbf"
              />
            )}
            <MenuButton
              icon={<Envelope size={14} />}
              label="Feedback"
              onClick={() => {
                setOpen(false);
                setFeedbackOpen(true);
              }}
            />
          </div>

          {/* Theme + font settings */}
          <div className="py-1 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
            <button
              onClick={() => {
                if (darkLocked) return;
                const newTheme = theme === 'parchment' ? 'dark' : 'parchment';
                setTheme(newTheme);
                if (user) {
                  updateUser({ themePref: newTheme });
                  fetch('/api/user/preferences', {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ themePref: newTheme }),
                  }).catch(() => {});
                }
              }}
              className="flex items-center gap-2.5 w-full px-3 py-1.5 text-xs transition-colors hover:opacity-80"
              style={{ color: 'var(--text-secondary)', textAlign: 'left', opacity: darkLocked ? 0.6 : 1 }}
              disabled={darkLocked}
              title={darkLocked ? `${TIER_LABELS.general} required for dark mode` : undefined}
            >
              <span className="shrink-0" style={{ width: 14 }}>
                {displayTheme === 'parchment' ? <Moon size={14} /> : <Sun size={14} />}
              </span>
              <span className="flex-1">{displayTheme === 'parchment' ? 'Dark mode' : 'Parchment mode'}</span>
              {darkLocked && (
                <span style={{ fontSize: '9px', color: 'var(--accent-primary)', letterSpacing: '0.06em' }}>
                  GENERAL ↑
                </span>
              )}
            </button>

            {/* Font size — inline */}
            <div className="flex items-center gap-2.5 px-3 py-1.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
              <span className="shrink-0" style={{ width: 14 }}>
                <TextAa size={14} />
              </span>
              <span className="flex-1">Font size</span>
              <button
                onClick={() => setFontSize((f) => Math.max(FONT_MIN, f - 1))}
                className="w-5 h-5 flex items-center justify-center rounded text-xs font-bold hover:opacity-70"
                style={{ color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}
                aria-label="Decrease font size"
              >−</button>
              <span className="text-xs tabular-nums" style={{ minWidth: '24px', textAlign: 'center' }}>
                {fontSize}
              </span>
              <button
                onClick={() => setFontSize((f) => Math.min(FONT_MAX, f + 1))}
                className="w-5 h-5 flex items-center justify-center rounded text-xs font-bold hover:opacity-70"
                style={{ color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}
                aria-label="Increase font size"
              >+</button>
            </div>
          </div>

          {/* Sign out */}
          <div className="py-1 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
            <MenuButton
              icon={<SignOut size={14} />}
              label="Log out"
              onClick={async () => {
                setOpen(false);
                await logout();
              }}
            />
          </div>

          {/* Subscription upsell footer for free users */}
          {userTier === 'free' && (
            <div
              className="px-3 py-2 border-t flex items-center justify-between"
              style={{ borderColor: 'var(--border-subtle)' }}
            >
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Free tier</span>
              <Link
                href="/support"
                onClick={() => setOpen(false)}
                className="flex items-center gap-1 text-xs"
                style={{ color: 'var(--accent-primary)', textDecoration: 'none' }}
              >
                <Lightning size={11} weight="fill" />
                <span style={{ letterSpacing: '0.06em' }}>UPGRADE</span>
              </Link>
            </div>
          )}
        </div>
      )}

      {feedbackOpen && <FeedbackModal onClose={() => setFeedbackOpen(false)} />}
    </>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────

interface MenuItemProps {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  accent?: string;
}

function MenuLink({ href, icon, label, onClick, accent }: MenuItemProps & { href: string }) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex items-center gap-2.5 px-3 py-1.5 text-xs transition-colors hover:opacity-80"
      style={{ color: accent ?? 'var(--text-secondary)', textDecoration: 'none' }}
    >
      <span className="shrink-0" style={{ width: 14 }}>{icon}</span>
      <span className="flex-1">{label}</span>
    </Link>
  );
}

function MenuButton({ icon, label, onClick }: MenuItemProps) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2.5 w-full px-3 py-1.5 text-xs transition-colors hover:opacity-80"
      style={{ color: 'var(--text-secondary)', textAlign: 'left' }}
    >
      <span className="shrink-0" style={{ width: 14 }}>{icon}</span>
      <span className="flex-1">{label}</span>
    </button>
  );
}
