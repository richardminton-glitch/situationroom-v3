/**
 * The Vienna School — content type definitions.
 *
 * Curriculum content lives in version control as typed TS modules
 * (one per module under ./modules/). User progress lives in Supabase.
 */

import type { Tier } from '@/types';

export interface VsModule {
  slug:           string;
  number:         number;
  title:          string;
  subtitle:       string;
  heroImage:      string;        // Path under /images/vienna-school/
  heroImageAlt:   string;
  coldOpen:       string;        // Single paragraph, prose
  coreArgument:   string[];      // 3-4 short paragraphs
  interactive:    InteractiveSpec;
  /** Optional second interactive — rendered after the pull-quotes block,
   *  before the reading ladder. Module 3's currency cemetery is the
   *  canonical use case (a "see also" companion to the marquee chart). */
  secondaryInteractive?: InteractiveSpec;
  quotes:         VsQuote[];
  readingLadder:  ReadingLadder;
  fieldTest:      FieldTestQuestion[];
  tierGate:       Tier;          // Minimum tier to read full module
}

export interface VsQuote {
  text:    string;
  author:  string;
  source:  string;
  year?:   number;
}

export interface ReadingLadder {
  beginner:     Book[];
  intermediate: Book[];
  deep:         Book[];
}

export interface Book {
  title:        string;
  author:       string;
  year:         number;
  description:  string;          // 1 line
  freePdfLink?: string;          // mises.org first
  amazonLink?:  string;          // affiliate fallback
  coverImage?:  string;
}

export interface FieldTestQuestion {
  id:            string;
  question:      string;
  options:       string[];       // multiple-choice for MVP (4 options)
  correctIndex:  number;
  explanation:   string;         // shown after submission
}

// ── Interactive specs — discriminated union ──

export type InteractiveSpec =
  | { kind: 'spot-the-school' }
  | { kind: 'timeline';                data: TimelineNode[] }
  | { kind: 'marginal-utility-glasses' }
  | { kind: 'gold-vs-m2-chart' }
  | { kind: 'currency-cemetery' }
  | { kind: 'hayekian-triangle' }
  | { kind: 'central-planner-game' }
  | { kind: 'predictions-audit' };

export interface TimelineNode {
  year:         number;
  lane:         'austrian' | 'statist';
  title:        string;          // short label on the node
  significance: string;          // one-line tooltip
  person?:      string;          // for Austrian thinker nodes
}
