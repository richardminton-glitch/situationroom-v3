/**
 * Aggregated quote pool for the Quote Wall.
 *
 * Pulls every quote from every module + the extra-quotes pool.
 * Each entry tags its source module (when applicable) so the UI
 * can deep-link back to the surrounding context.
 */

import type { VsQuote } from './types';
import { MODULES } from './index';
import { EXTRA_QUOTES } from './data/extra-quotes';

export interface AggregatedQuote extends VsQuote {
  /** Slug of the module this quote belongs to, or `null` for extras. */
  moduleSlug:  string | null;
  moduleTitle: string | null;
}

export const ALL_QUOTES: AggregatedQuote[] = [
  ...MODULES.flatMap((m) =>
    m.quotes.map((q) => ({
      ...q,
      moduleSlug:  m.slug,
      moduleTitle: m.title,
    })),
  ),
  ...EXTRA_QUOTES.map((q) => ({
    ...q,
    moduleSlug:  null,
    moduleTitle: null,
  })),
];
