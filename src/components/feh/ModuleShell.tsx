/**
 * ModuleShell — wrapper chrome for each Fiscal Event Horizon module.
 *
 * Renders the dossier-style header (`SECTION 03 — MALINVESTMENT MAPPER`),
 * a severity-mapped classification chip (CONFIDENTIAL / SECRET / TOP SECRET),
 * and an optional `LAST COMPUTED / NEXT REFRESH` cadence stamp — locked-in
 * editorial decision per the spec's honest-cadence treatment.
 */

import type { ReactNode } from 'react';

export type Severity = 'CONFIDENTIAL' | 'SECRET' | 'TOP SECRET';

interface ModuleShellProps {
  index: string;
  title: string;
  subtitle?: string;
  severity?: Severity;
  lastComputed?: string;
  nextRefresh?: string;
  /** When true, drops the max-width + horizontal padding wrapper so the
   *  shell can sit inside a parent grid cell (used by the Section 03 + 06
   *  side-by-side row). */
  compact?: boolean;
  children: ReactNode;
}

const SEVERITY_COLOR: Record<Severity, string> = {
  CONFIDENTIAL: 'var(--feh-stable)',
  SECRET: 'var(--feh-warning)',
  'TOP SECRET': 'var(--feh-critical)',
};

export function ModuleShell({
  index,
  title,
  subtitle,
  severity = 'SECRET',
  lastComputed,
  nextRefresh,
  compact = false,
  children,
}: ModuleShellProps) {
  const cadence =
    lastComputed || nextRefresh
      ? [lastComputed && `LAST: ${lastComputed}`, nextRefresh && `NEXT: ${nextRefresh}`]
          .filter(Boolean)
          .join(' · ')
      : null;

  return (
    <section
      className={
        compact
          ? 'relative w-full'
          : 'relative mx-auto w-full max-w-[1320px] px-4'
      }
    >
      <div
        className="flex items-center justify-between gap-4 py-3 border-b"
        style={{ borderColor: 'var(--border-primary)' }}
      >
        <div className="flex items-baseline gap-3 min-w-0">
          <span
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 10,
              letterSpacing: '0.2em',
              color: 'var(--text-muted)',
              whiteSpace: 'nowrap',
            }}
          >
            SECTION {index}
          </span>
          <h2
            className="truncate"
            style={{
              fontFamily: 'var(--feh-font-display)',
              fontSize: 22,
              letterSpacing: '0.12em',
              color: 'var(--text-primary)',
              fontWeight: 600,
              margin: 0,
            }}
          >
            {title}
          </h2>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {cadence && (
            <span
              className="hidden md:inline"
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 9,
                letterSpacing: '0.16em',
                color: 'var(--text-muted)',
              }}
            >
              {cadence}
            </span>
          )}
          <span
            className="px-2 py-0.5 border"
            style={{
              borderColor: SEVERITY_COLOR[severity],
              color: SEVERITY_COLOR[severity],
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: '0.2em',
              whiteSpace: 'nowrap',
            }}
          >
            {severity}
          </span>
        </div>
      </div>

      {subtitle && (
        <p
          className="pt-3 italic"
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 11,
            color: 'var(--text-secondary)',
            letterSpacing: '0.03em',
          }}
        >
          {subtitle}
        </p>
      )}

      <div className="py-6">{children}</div>
    </section>
  );
}
