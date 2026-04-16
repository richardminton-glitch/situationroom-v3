'use client';

/**
 * RailLink — single nav row inside a SectionRailFrame.
 *
 * Handles active state, tier-locked styling, collapsed-mode icon-only
 * rendering with tooltip via title attribute. Used by ToolsRail and
 * RoomsRail. WorkspaceRail rolls its own because its rows are state-toggle
 * buttons (preset switching) rather than navigation links.
 */

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { useRailCollapsed } from './SectionRailFrame';
import { useTier } from '@/hooks/useTier';
import { TIER_LABELS } from '@/lib/auth/tier';
import type { Tier } from '@/types';

interface RailLinkProps {
  href: string;
  label: string;
  icon: ReactNode;
  requiredTier?: Exclude<Tier, 'free'>;
}

export function RailLink({ href, label, icon, requiredTier }: RailLinkProps) {
  const pathname = usePathname();
  const collapsed = useRailCollapsed();
  const { canAccess } = useTier();

  const active = pathname === href;
  const locked = requiredTier ? !canAccess(requiredTier) : false;

  const titleAttr = collapsed
    ? `${label}${locked && requiredTier ? ` (${TIER_LABELS[requiredTier]} required)` : ''}`
    : undefined;

  return (
    <Link
      href={href}
      className="flex items-center gap-2.5 px-2.5 py-1.5 rounded text-sm transition-colors"
      style={{
        backgroundColor: active ? 'var(--bg-card)' : 'transparent',
        color: locked ? 'var(--text-muted)' : active ? 'var(--text-primary)' : 'var(--text-secondary)',
        border: active ? '1px solid var(--border-primary)' : '1px solid transparent',
        opacity: locked ? 0.6 : 1,
      }}
      title={titleAttr}
    >
      <span className="shrink-0 flex items-center justify-center" style={{ width: 18, height: 18 }}>
        {icon}
      </span>
      {!collapsed && (
        <>
          <span className="flex-1 truncate">{label}</span>
          {locked && requiredTier && (
            <span
              style={{
                fontSize: '9px',
                color: 'var(--accent-primary)',
                letterSpacing: '0.06em',
                fontFamily: 'var(--font-mono)',
              }}
            >
              {TIER_LABELS[requiredTier].toUpperCase()} ↑
            </span>
          )}
        </>
      )}
    </Link>
  );
}
