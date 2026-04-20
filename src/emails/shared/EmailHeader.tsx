/**
 * Shared branded header for Situation Room emails.
 * Renders the 48px icon next to the SITUATION ROOM wordmark + tagline + optional
 * right-aligned meta line. Email-safe (table layout, inline styles).
 */

import { Img, Link } from '@react-email/components';
import type { CSSProperties, ReactNode } from 'react';

const SITE_URL_FALLBACK = 'https://situationroom.space';

const C = {
  card:    '#ede8dc',
  border:  '#c8b89a',
  muted:   '#8b7355',
};

const font = {
  mono: '"Courier New", Courier, monospace',
};

interface Props {
  /** Absolute base URL (used to construct the icon src). */
  siteUrl?:  string;
  /** Optional right-aligned subtitle — e.g. "DAILY BRIEFING" or "WEEKLY DIGEST". */
  subtitle?: string;
  /** Optional extra content rendered below the header (e.g. date/conviction line). */
  children?: ReactNode;
  /** Container style overrides. */
  style?:    CSSProperties;
}

export function EmailHeader({ siteUrl, subtitle, children, style }: Props) {
  const base = siteUrl ?? SITE_URL_FALLBACK;
  return (
    <table
      role="presentation"
      width="100%"
      cellPadding={0}
      cellSpacing={0}
      border={0}
      style={{
        backgroundColor: C.card,
        border: `1px solid ${C.border}`,
        padding: '20px 24px 16px',
        borderCollapse: 'collapse',
        ...style,
      }}
    >
      <tbody>
        <tr>
          <td style={{ verticalAlign: 'middle', paddingRight: '14px', width: '48px' }}>
            <Link href={base}>
              <Img
                src={`${base}/icons/icon-192.png`}
                width={48}
                height={48}
                alt="Situation Room"
                style={{ display: 'block', border: `1px solid ${C.border}`, borderRadius: '6px' }}
              />
            </Link>
          </td>
          <td style={{ verticalAlign: 'middle' }}>
            <div style={{ fontFamily: font.mono, fontSize: '10px', letterSpacing: '0.18em', color: C.muted, margin: '0 0 4px' }}>
              SITUATION ROOM{subtitle ? ` · ${subtitle}` : ''}
            </div>
            <div style={{ fontFamily: font.mono, fontSize: '10px', letterSpacing: '0.14em', color: C.muted, margin: 0 }}>
              BITCOIN &amp; GLOBAL MACRO INTELLIGENCE
            </div>
          </td>
        </tr>
        {children && (
          <tr>
            <td colSpan={2} style={{ paddingTop: '14px' }}>{children}</td>
          </tr>
        )}
      </tbody>
    </table>
  );
}
