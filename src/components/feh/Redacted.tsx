'use client';

/**
 * Redacted — conditional content gate.
 *
 * For users without `members` tier, replaces children with a black redaction
 * bar of approximately the same width. For members, renders the children
 * unchanged. Loading state renders the bar (avoids leaking content during
 * auth hydration).
 *
 * Usage:
 *   <Redacted>{actualValue}</Redacted>
 *   <Redacted width="6ch"><span>{actualValue}</span></Redacted>  // explicit width
 *   <Redacted mode="block" height={120}>...</Redacted>           // big region
 *
 * The redaction is the paywall — see RedactionOverlay for the upgrade CTA.
 */

import type { CSSProperties, ReactNode } from 'react';
import { useTier } from '@/hooks/useTier';

interface RedactedProps {
  children: ReactNode;
  /** Width of the redaction bar. Auto-derived from string children if omitted. */
  width?: number | string;
  /** Height of the bar — defaults to 1em. */
  height?: number | string;
  /** Block redactions get visible padding + bordered chrome. */
  mode?: 'inline' | 'block';
}

export function Redacted({ children, width, height, mode = 'inline' }: RedactedProps) {
  const { canAccess, loading } = useTier();
  const isMember = canAccess('members');

  // Members + admins see content immediately.
  if (!loading && isMember) return <>{children}</>;

  // Compute a sensible width for the bar from the children if a string.
  const derivedWidth =
    width !== undefined
      ? width
      : typeof children === 'string'
      ? `${Math.max(2, children.length)}ch`
      : '6ch';

  const baseStyle: CSSProperties = {
    display: mode === 'block' ? 'block' : 'inline-block',
    width: derivedWidth,
    height: height ?? (mode === 'block' ? 80 : '1.05em'),
    backgroundColor: 'var(--feh-redact)',
    verticalAlign: mode === 'inline' ? 'baseline' : undefined,
    borderRadius: 1,
    position: 'relative',
    overflow: 'hidden',
  };

  return (
    <span aria-label="Redacted — members only" style={baseStyle} title="ACCESS RESTRICTED // CLASSIFICATION REQUIRED">
      {/* Subtle diagonal hatch to read as "redacted" rather than "loading". */}
      <span
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage:
            'repeating-linear-gradient(45deg, transparent 0 4px, color-mix(in srgb, var(--feh-critical) 22%, transparent) 4px 5px)',
          opacity: 0.6,
        }}
      />
    </span>
  );
}
