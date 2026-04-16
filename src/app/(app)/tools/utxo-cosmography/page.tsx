'use client';

/**
 * /tools/utxo-cosmography
 *
 * Embeds the standalone UTXO Cosmography PWA (Drawing the Cosmos — UTXO
 * Atlas) as a full-bleed iframe. The PWA itself lives in
 * public/utxo-cosmography/ as a self-contained HTML5 + canvas app.
 *
 * Theme bridge: same-origin iframe means we can directly set
 * `data-theme` on its <html> from the parent. The iframe's CSS reads
 * those vars on every paint and its canvas drawing reads them on every
 * frame, so theme switches propagate live without an iframe reload.
 *
 * iframe over rewrite: the visualisation is ~1900 lines of vanilla JS +
 * canvas drawing logic; embedding preserves it verbatim, lets the PWA
 * service worker keep working, and means future updates only need a
 * file drop into public/.
 */

import { useEffect, useRef } from 'react';
import { useTheme } from '@/components/layout/ThemeProvider';

export default function UtxoCosmographyPage() {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const { theme } = useTheme();

  // Push the parent theme into the iframe's <html data-theme>. Runs on
  // mount AND whenever the parent theme changes, so toggling parchment
  // ↔ dark from the user menu / palette flows straight through.
  useEffect(() => {
    function applyTheme() {
      const doc = iframeRef.current?.contentDocument;
      if (!doc) return;
      doc.documentElement.setAttribute('data-theme', theme);
    }
    // Apply on every render in case the iframe just mounted.
    applyTheme();
    // Also apply once the iframe has finished loading (initial paint
    // can race the parent effect).
    const iframe = iframeRef.current;
    iframe?.addEventListener('load', applyTheme);
    return () => iframe?.removeEventListener('load', applyTheme);
  }, [theme]);

  return (
    <iframe
      ref={iframeRef}
      src="/utxo-cosmography/index.html"
      title="UTXO Cosmography"
      className="block w-full h-full"
      style={{ border: 'none', backgroundColor: 'var(--bg-primary)' }}
      allow="fullscreen"
    />
  );
}
