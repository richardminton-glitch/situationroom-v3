/**
 * Live BTC/GBP rate utility.
 *
 * Fetches the current BTC price in GBP from CoinGecko and derives
 * sats-per-GBP. Used by:
 *   - Invoice creation (GBP tier price → sats)
 *   - Funding bar (sats revenue → GBP display)
 *   - UI components (show live sats equivalent of GBP prices)
 *
 * 5-minute server-side cache via Next.js revalidate.
 * 5-second timeout with fallback to a reasonable estimate.
 */

const FALLBACK_SATS_PER_GBP = 1_900;

/** Fetch live sats-per-GBP rate. Server-side only. */
export async function getLiveSatsPerGbp(): Promise<number> {
  try {
    const res = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=gbp',
      { signal: AbortSignal.timeout(5_000), next: { revalidate: 300 } },
    );
    if (!res.ok) return FALLBACK_SATS_PER_GBP;
    const data = (await res.json()) as { bitcoin?: { gbp?: number } };
    const btcGbp = data.bitcoin?.gbp;
    if (!btcGbp || btcGbp <= 0) return FALLBACK_SATS_PER_GBP;
    return Math.round(100_000_000 / btcGbp);
  } catch {
    return FALLBACK_SATS_PER_GBP;
  }
}

/** Convert GBP to sats at the given rate. */
export function gbpToSats(gbp: number, satsPerGbp: number): number {
  return Math.round(gbp * satsPerGbp);
}

/** Convert sats to GBP at the given rate. */
export function satsToGbp(sats: number, satsPerGbp: number): number {
  return sats / satsPerGbp;
}
