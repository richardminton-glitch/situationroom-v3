'use client';

/**
 * PageHeader — slim breadcrumb + page-action bar shown by section layouts
 * (tools, rooms). Replaces the centred "SITUATION ROOM" title on internal
 * pages, freeing the global TopBar from carrying page-level orientation.
 *
 * Usage:
 *   <PageHeader breadcrumb={['Tools', 'DCA Signal']} actions={...} />
 */

import { CaretRight } from '@phosphor-icons/react';
import type { ReactNode } from 'react';

interface PageHeaderProps {
  breadcrumb: string[];
  actions?: ReactNode;
}

export function PageHeader({ breadcrumb, actions }: PageHeaderProps) {
  return (
    <div
      className="shrink-0 flex items-center justify-between border-b px-4"
      style={{
        minHeight: '36px',
        borderColor: 'var(--border-subtle)',
        backgroundColor: 'var(--bg-secondary)',
        fontFamily: 'var(--font-mono)',
      }}
    >
      <nav
        className="flex items-center gap-1.5"
        aria-label="Breadcrumb"
        style={{ fontSize: '11px', letterSpacing: '0.08em', textTransform: 'uppercase' }}
      >
        {breadcrumb.map((crumb, i) => {
          const isLast = i === breadcrumb.length - 1;
          return (
            <span key={`${crumb}-${i}`} className="flex items-center gap-1.5">
              {i > 0 && (
                <CaretRight
                  size={9}
                  weight="bold"
                  style={{ color: 'var(--text-muted)', opacity: 0.6 }}
                />
              )}
              <span
                style={{
                  color: isLast ? 'var(--text-primary)' : 'var(--text-muted)',
                  fontWeight: isLast ? 600 : 400,
                }}
              >
                {crumb}
              </span>
            </span>
          );
        })}
      </nav>

      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
