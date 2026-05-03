/**
 * The Vienna School — module registry.
 *
 * Single source of truth for the curriculum. Adding a module = drop a
 * file under ./modules/ and append it to MODULES below in order.
 */

import type { Tier } from '@/types';
import type { VsModule } from './types';
import { originModule }           from './modules/origin';
import { subjectiveValueModule }  from './modules/subjective-value';
import { soundMoneyModule }       from './modules/sound-money';
import { timePreferenceModule }   from './modules/time-preference';
import { knowledgeProblemModule } from './modules/knowledge-problem';
import { whyNowModule }           from './modules/why-now';

/** Built modules — full curriculum complete as of Session 4. */
export const MODULES: VsModule[] = [
  originModule,
  subjectiveValueModule,
  soundMoneyModule,
  timePreferenceModule,
  knowledgeProblemModule,
  whyNowModule,
];

export const MODULE_BY_SLUG: Record<string, VsModule> = Object.fromEntries(
  MODULES.map((m) => [m.slug, m]),
);

/** The canonical 1→6 curriculum order. Stubs for modules not yet built. */
export interface ModuleStub {
  number:   number;
  slug:     string;
  title:    string;
  subtitle: string;
  hero:     string;
  tier:     Tier;
}

export const MODULE_STUB_ORDER: ModuleStub[] = [
  { number: 1, slug: 'origin',            title: 'The Origin',
    subtitle: 'Vienna, 1871. A line of thought begins.',
    hero: '/images/vienna-school/module-1-origin-hero.png',           tier: 'free' },
  { number: 2, slug: 'subjective-value',  title: 'Subjective Value',
    subtitle: 'Why a glass of water is worth more than a diamond.',
    hero: '/images/vienna-school/module-2-subjective-value-hero.png', tier: 'free' },
  { number: 3, slug: 'sound-money',       title: 'Sound Money',
    subtitle: 'Gold, the printing press, and the long con.',
    hero: '/images/vienna-school/module-3-sound-money-hero.png',      tier: 'free' },
  { number: 4, slug: 'time-preference',   title: 'Time Preference',
    subtitle: 'Capital, interest, and the structure of production.',
    hero: '/images/vienna-school/module-4-time-preference-hero.png',  tier: 'free' },
  { number: 5, slug: 'knowledge-problem', title: 'The Knowledge Problem',
    subtitle: 'Why no committee can run an economy.',
    hero: '/images/vienna-school/module-5-knowledge-problem-hero.png', tier: 'free' },
  { number: 6, slug: 'why-now',           title: 'Why Now',
    subtitle: 'A 150-year framework finds its asset.',
    hero: '/images/vienna-school/module-6-why-now-hero.png',           tier: 'free' },
];

/** Total module count for the index page progress display. */
export const TOTAL_MODULES = MODULE_STUB_ORDER.length;

export const BUILT_SLUGS = new Set(MODULES.map((m) => m.slug));

// ── Reading-ladder book ID helpers ──────────────────────────────────────
//
// Books in the reading ladder don't have explicit IDs in their data shape.
// We derive a stable composite ID from `{moduleSlug}:{slugifiedTitle}` so
// the progress tracker can persist read/unread state without anyone
// having to maintain a separate ID column. As long as the title doesn't
// change, the ID is stable across deploys.

function slugifyTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 60);
}

export function bookId(moduleSlug: string, bookTitle: string): string {
  return `${moduleSlug}:${slugifyTitle(bookTitle)}`;
}

/** Every book across every built module's ladder, with its derived ID. */
export const ALL_LADDER_BOOKS: Array<{
  id:          string;
  moduleSlug:  string;
  moduleTitle: string;
  tier:        'beginner' | 'intermediate' | 'deep';
  title:       string;
  author:      string;
  year:        number;
}> = MODULES.flatMap((m) =>
  (['beginner', 'intermediate', 'deep'] as const).flatMap((tier) =>
    m.readingLadder[tier].map((b) => ({
      id:          bookId(m.slug, b.title),
      moduleSlug:  m.slug,
      moduleTitle: m.title,
      tier,
      title:       b.title,
      author:      b.author,
      year:        b.year,
    })),
  ),
);

export const TOTAL_LADDER_BOOKS = ALL_LADDER_BOOKS.length;
