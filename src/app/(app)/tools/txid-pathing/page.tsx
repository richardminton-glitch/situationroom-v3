'use client';

/**
 * /tools/txid-pathing
 *
 * Embeds the standalone TXID Pathing PWA — a D3-based Bitcoin
 * transaction chain visualiser — as a full-bleed iframe. The PWA
 * itself lives in public/txid-pathing/ as a self-contained HTML +
 * CSS + vanilla-JS app.
 *
 * Theme bridge: same-origin iframe means we can directly set
 * `data-theme` on its <html> from the parent. The iframe's CSS reads
 * those vars live — SVG nodes inherit `color` so arrow markers and
 * copy-flash text switch through without a re-render.
 *
 * iframe over rewrite: the visualisation's recursive tree builder +
 * force-directed D3 layout is ~800 lines of bespoke logic; embedding
 * preserves it verbatim, lets the PWA service worker keep working,
 * and means future updates only need a file drop into public/.
 */

import { useEffect, useRef } from 'react';
import { useTheme } from '@/components/layout/ThemeProvider';

export default function TxidPathingPage() {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const { theme } = useTheme();

  useEffect(() => {
    function applyTheme() {
      const doc = iframeRef.current?.contentDocument;
      if (!doc) return;
      doc.documentElement.setAttribute('data-theme', theme);
    }
    applyTheme();
    const iframe = iframeRef.current;
    iframe?.addEventListener('load', applyTheme);
    return () => iframe?.removeEventListener('load', applyTheme);
  }, [theme]);

  return (
    <iframe
      ref={iframeRef}
      src="/txid-pathing/index.html"
      title="TXID Pathing"
      className="block w-full h-full"
      style={{ border: 'none', backgroundColor: 'var(--bg-primary)' }}
      allow="fullscreen"
    />
  );
}
