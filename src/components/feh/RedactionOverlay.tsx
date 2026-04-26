'use client';

/**
 * RedactionOverlay — paywall banner shown to non-members on FEH drilldown pages.
 *
 * Renders nothing for members + admins. For everyone else, sticks a fixed-
 * bottom classification stamp banner with an AUTHENTICATE CTA that routes
 * to the upgrade flow. Editorial framing: this isn't a paywall, it's a
 * classification gate — the page is full of redacted content above and
 * the banner explains why.
 */

import Link from 'next/link';
import { useTier } from '@/hooks/useTier';

interface RedactionOverlayProps {
  /** Optional drilldown identifier — included in upgrade-flow query string for telemetry. */
  origin?: string;
}

export function RedactionOverlay({ origin }: RedactionOverlayProps) {
  const { canAccess, loading, isLoggedIn } = useTier();
  if (loading) return null;
  if (canAccess('members')) return null;

  const upgradeHref = `/account${origin ? `?from=feh-${origin}` : '?from=feh'}`;
  const ctaLabel = isLoggedIn ? 'AUTHENTICATE ↗' : 'SIGN IN TO AUTHENTICATE ↗';

  return (
    <div
      className="fixed bottom-0 inset-x-0 z-50 border-t-2"
      style={{
        backgroundColor: 'var(--bg-secondary)',
        borderColor: 'var(--feh-critical)',
        boxShadow: '0 -8px 24px rgba(0,0,0,0.18)',
      }}
    >
      <div className="mx-auto max-w-[1320px] px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-baseline gap-3 flex-wrap min-w-0">
          <span
            className="px-2 py-0.5 border-2"
            style={{
              borderColor: 'var(--feh-critical)',
              color: 'var(--feh-critical)',
              fontFamily: 'var(--feh-font-mono)',
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.22em',
              flexShrink: 0,
            }}
          >
            ACCESS RESTRICTED
          </span>
          <span
            style={{
              fontFamily: 'var(--feh-font-mono)',
              fontSize: 11,
              letterSpacing: '0.06em',
              color: 'var(--text-secondary)',
              lineHeight: 1.5,
            }}
          >
            This dossier contains classified intelligence material. Members tier
            required for full declassification.
          </span>
        </div>
        <Link
          href={upgradeHref}
          className="px-4 py-2 transition-opacity hover:opacity-90"
          style={{
            backgroundColor: 'var(--feh-critical)',
            color: 'var(--feh-classified-fg)',
            fontFamily: 'var(--feh-font-mono)',
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.22em',
            textDecoration: 'none',
            flexShrink: 0,
          }}
        >
          {ctaLabel}
        </Link>
      </div>
    </div>
  );
}
