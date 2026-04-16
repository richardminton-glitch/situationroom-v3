/**
 * /tools/utxo-cosmography
 *
 * Embeds the standalone UTXO Cosmography PWA (Drawing the Cosmos — UTXO
 * Atlas) as a full-bleed iframe. The PWA itself lives in
 * public/utxo-cosmography/ as a self-contained HTML5 + canvas app — its
 * parchment palette already matches the Situation Room theme so it sits
 * naturally inside the tools chrome.
 *
 * iframe over rewrite: the visualization is ~1900 lines of vanilla JS +
 * canvas drawing logic; embedding preserves it verbatim, lets the PWA
 * service worker keep working, and means future updates only need a file
 * drop into public/.
 */

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'UTXO Cosmography — Situation Room',
};

export default function UtxoCosmographyPage() {
  return (
    <iframe
      src="/utxo-cosmography/index.html"
      title="UTXO Cosmography"
      className="block w-full h-full"
      style={{ border: 'none', backgroundColor: 'var(--bg-primary)' }}
      // PWA features the embedded app uses
      allow="fullscreen"
    />
  );
}
