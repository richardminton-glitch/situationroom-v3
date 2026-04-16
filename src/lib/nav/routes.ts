/**
 * Route registry — single source of truth for navigable destinations.
 *
 * Used by:
 *   - CommandPalette (⌘K) for fuzzy search + nav
 *   - (Future) ToolsRail / RoomsRail / TopBar — refactor pending; for now
 *     they keep their inline arrays since their shape differs slightly.
 *
 * Each entry carries a section, label, href, optional tier gate, and
 * keywords for the palette's matcher to broaden hits ("DCA" → matches
 * "DCA Signal" via keyword).
 */

import type { Tier } from '@/types';

export type NavSection = 'Workspace' | 'Briefings' | 'Tools' | 'Rooms' | 'Account';

export interface NavRoute {
  /** URL to navigate to. */
  href:          string;
  /** Display label in palette + breadcrumbs. */
  label:         string;
  /** Section grouping for palette headings + breadcrumbs. */
  section:       NavSection;
  /** Tier required to access (omit for free / public). */
  requiredTier?: Exclude<Tier, 'free'>;
  /** Extra terms the palette matcher should treat as synonyms of label. */
  keywords?:     string[];
  /** One-line description, shown as muted secondary text in the palette. */
  description?:  string;
  /** True for routes only meaningful to admin users (filtered out for others). */
  adminOnly?:    boolean;
}

export const NAV_ROUTES: NavRoute[] = [
  // ── Workspace ─────────────────────────────────────────────────────────────
  {
    href: '/',
    label: 'Workspace',
    section: 'Workspace',
    keywords: ['dashboard', 'home', 'canvas'],
    description: 'Personalised dashboard canvas',
  },

  // ── Briefings ─────────────────────────────────────────────────────────────
  {
    href: '/briefings',
    label: 'Briefings Archive',
    section: 'Briefings',
    keywords: ['archive', 'daily', 'newsletter', 'digest'],
    description: 'All daily briefings',
  },

  // ── Tools ─────────────────────────────────────────────────────────────────
  {
    href: '/tools/dca-signal',
    label: 'DCA Signal',
    section: 'Tools',
    requiredTier: 'general',
    keywords: ['dca', 'dollar cost average', 'signal', 'buy'],
    description: 'Bitcoin accumulation signal engine',
  },
  {
    href: '/tools/cycle-gauge',
    label: 'Cycle Gauge',
    section: 'Tools',
    keywords: ['cycle', 'gauge', 'position', 'phase'],
    description: 'Cycle position gauge',
  },
  {
    href: '/tools/mining',
    label: 'Mining Intel',
    section: 'Tools',
    requiredTier: 'general',
    keywords: ['mining', 'hashrate', 'miners', 'difficulty', 'energy'],
    description: 'Energy & mining intelligence',
  },
  {
    href: '/tools/map',
    label: 'Situation Map',
    section: 'Tools',
    keywords: ['map', 'globe', 'geography', 'situation', 'choropleth'],
    description: 'Global geopolitical intelligence map',
  },
  {
    href: '/tools/utxo-cosmography',
    label: 'UTXO Cosmography',
    section: 'Tools',
    keywords: ['utxo', 'cosmography', 'atlas', 'cosmos', 'rings', 'art'],
    description: 'Bitcoin UTXO atlas — protocol art',
  },

  // ── Rooms ─────────────────────────────────────────────────────────────────
  {
    href: '/rooms/members',
    label: 'Members Room',
    section: 'Rooms',
    requiredTier: 'members',
    keywords: ['members', 'room', 'situation', 'threat', 'live'],
    description: 'Live operations room',
  },
  {
    href: '/rooms/trading-desk',
    label: 'Trading Desk',
    section: 'Rooms',
    requiredTier: 'members',
    keywords: ['trading', 'desk', 'bot', 'algo', 'pool'],
    description: 'Autonomous trading terminal',
  },

  // ── Account ───────────────────────────────────────────────────────────────
  {
    href: '/support',
    label: 'Support',
    section: 'Account',
    keywords: ['support', 'donate', 'fund', 'subscribe', 'upgrade', 'pricing'],
    description: 'Subscriptions, donations, pricing',
  },
  {
    href: '/account',
    label: 'Account',
    section: 'Account',
    keywords: ['account', 'profile', 'settings', 'billing'],
    description: 'Profile and preferences',
  },
  {
    href: '/admin',
    label: 'Admin',
    section: 'Account',
    keywords: ['admin', 'dashboard', 'metrics', 'users'],
    description: 'Admin console',
    adminOnly: true,
  },
];

export const NAV_SECTION_ORDER: NavSection[] = ['Workspace', 'Briefings', 'Tools', 'Rooms', 'Account'];
