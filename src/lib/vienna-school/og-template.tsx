/**
 * Shared OG-image generator for Vienna School pages.
 *
 * Builds a 1200×630 social-card image: parchment background, gold-rule
 * border, eyebrow + module number + title + subtitle, situationroom.space
 * watermark. Each module's `opengraph-image.tsx` file is a 4-line wrapper
 * that calls this with its own copy.
 *
 * Notes on next/og JSX subset:
 *   - No external CSS — all styles inline via the React-style `style` prop.
 *   - Flex-only layout. No grid.
 *   - Limited font options — we ship a Georgia-similar serif via the
 *     system stack and accept that the rendered image will use the
 *     edge runtime's default fallback if Georgia isn't available.
 */

import { ImageResponse } from 'next/og';

export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = 'image/png';

interface VsOgOptions {
  eyebrow:        string;          // e.g. "MODULE 03 OF 06"
  title:          string;          // e.g. "Sound Money"
  subtitle:       string;          // e.g. "Gold, the printing press, and the long con."
  /** Optional small line under the subtitle (e.g. "FIELD MANUAL · MODULE"). */
  footer?:        string;
}

const PARCHMENT_BG = '#F8F1E3';
const PARCHMENT_BG2 = '#EAE0CE';
const INK = '#1a1a1a';
const INK_SECONDARY = '#5a4e3c';
const INK_MUTED = '#8a7e6c';
const GOLD = '#8b6914';

export function vsOgImage(opts: VsOgOptions): ImageResponse {
  const { eyebrow, title, subtitle, footer } = opts;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          backgroundImage: `linear-gradient(135deg, ${PARCHMENT_BG} 0%, ${PARCHMENT_BG2} 100%)`,
          padding: 56,
          fontFamily: 'serif',
          position: 'relative',
        }}
      >
        {/* Gold rule border */}
        <div
          style={{
            position: 'absolute',
            inset: 24,
            border: `2px solid ${GOLD}`,
            borderRadius: 0,
            opacity: 0.4,
            display: 'flex',
          }}
        />

        {/* Top eyebrow */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 'auto',
          }}
        >
          <div
            style={{
              fontSize: 22,
              letterSpacing: 8,
              color: INK_MUTED,
              fontWeight: 600,
              textTransform: 'uppercase',
              fontFamily: 'monospace',
            }}
          >
            THE SITUATION ROOM · SCHOOLROOM
          </div>
          <div
            style={{
              fontSize: 22,
              letterSpacing: 8,
              color: GOLD,
              fontWeight: 600,
              textTransform: 'uppercase',
              fontFamily: 'monospace',
            }}
          >
            {eyebrow}
          </div>
        </div>

        {/* Title block */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
            marginBottom: 'auto',
            marginTop: 80,
          }}
        >
          <div
            style={{
              fontSize: 96,
              lineHeight: 1.05,
              color: INK,
              fontWeight: 700,
              letterSpacing: -1.5,
              fontFamily: 'serif',
            }}
          >
            {title}
          </div>
          <div
            style={{
              fontSize: 38,
              lineHeight: 1.3,
              color: INK_SECONDARY,
              fontStyle: 'italic',
              maxWidth: 1000,
              fontFamily: 'serif',
            }}
          >
            {subtitle}
          </div>
        </div>

        {/* Bottom watermark */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
          }}
        >
          <div
            style={{
              fontSize: 22,
              letterSpacing: 4,
              color: INK_SECONDARY,
              fontWeight: 600,
              textTransform: 'uppercase',
              fontFamily: 'monospace',
            }}
          >
            {footer ?? 'THE VIENNA SCHOOL'}
          </div>
          <div
            style={{
              fontSize: 22,
              letterSpacing: 4,
              color: GOLD,
              fontWeight: 600,
              fontFamily: 'monospace',
            }}
          >
            situationroom.space
          </div>
        </div>
      </div>
    ),
    {
      ...OG_SIZE,
    },
  );
}
