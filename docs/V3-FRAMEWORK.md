# Situation Room V3 — Product Framework

**Document purpose:** Claude Code workspace reference. This is the single source of truth for V3 scope, architecture, and implementation order.

**Last updated:** 2026-03-29

---

## What V2 Taught Us

V2 shipped. Retention is working — people come back. The product identity is clear: walk in, see the state of Bitcoin and the world, leave informed. What's missing is ownership. Users return to *your* dashboard. V3 makes it *theirs*.

**Carry forward:** The core loop works. The briefing is the draw. The conviction score has legs. Grok as AI provider is settled. The VPS/Hostinger stack with API-Ninjas paid tier is in place.

**Kill:** Whatever the current frontend is, it's done. Clean-sheet rebuild. No migration, no incremental upgrade. Take the lessons, leave the code.

---

## V3 Identity

**One sentence:** A personalised Bitcoin and macro intelligence platform that adapts to each user.

**The shift from V2:** V2 was a broadcast — same dashboard for everyone. V3 is a workspace — same data, your arrangement, your focus, your watchlist.

**Core audience:** Macro-aware Bitcoiners who want a daily information ritual they control.

**What V3 is not:** A trading terminal. An altcoin tracker. A social network. A portfolio manager.

---

## Design Identity (non-negotiable)

The parchment aesthetic and the spinning globe are the product's visual signature. They stay as the default. This is what makes first-time visitors think "live Financial Times" rather than "another crypto dashboard."

**Parchment styling** — the warm, textured, editorial feel is the default skin. Every new panel, every new feature must be designed within this language first. If it looks like a Bloomberg terminal or a DeFi dashboard, it's wrong.

**Spinning globe with filtered pulsing markers** — this is the hero element. It communicates "live", "global", and "intelligence" in a single visual. It stays prominent in the default layout. Pulsing markers should continue to reflect real activity (transactions, geopolitical events, network nodes — whatever they currently represent).

**Design rules:**
- Parchment palette: warm tones, dark text, muted accents, subtle texture. Not neon. Not flat.
- Dark palette: deep backgrounds, teal primary, coral accent. Pulled directly from the members room — not a generic dark mode inversion.
- Typography: editorial. Serif or strong sans-serif. Not generic dashboard fonts. Consistent across both modes.
- Data panels inherit the active theme — parchment gets cards with subtle texture and warm borders; dark mode gets panels with teal borders and coral highlights.
- The globe is not a decoration — it's the first thing a visitor sees and the last thing they remember. Treat it as the masthead. Each mode gets its own globe variant (see below).
- New panels must pass the "screenshot test" against both themes. If a panel looks like it came from a different product in either mode, redesign it.

**Personalisation does not override identity.** Users can rearrange panels, choose which data they see, and set preferences — but the visual language remains consistent. Customisation is about *content*, not *skin* (at least by default).

**Two visual modes — both are branded, not generic:**

| | Parchment (default) | Dark Mode |
|---|---|---|
| Palette | Warm tones, parchment textures, dark text, muted accents | Dark background, teal and coral accent palette (from the members room) |
| Feel | "Live Financial Times" — editorial, authoritative, warm | "Live operations centre" — technical, immersive, network-native |
| Globe | Spinning globe with filtered pulsing markers (geopolitical/macro activity) | Members room globe — live visualisation of the Bitcoin network (nodes, transactions, propagation) |
| Audience moment | Morning briefing, scanning the state of the world | Deep session, watching the network, tracking in real time |

Both modes use the same panel system, same layout, same data — only the visual treatment and globe change. The toggle is a user preference (persisted in their profile). Anonymous/guest users get parchment by default.

**Globe rules across modes:**
- Parchment globe = geopolitical/macro lens. Pulsing markers reflect world events, conflicts, economic signals.
- Dark mode globe = Bitcoin network lens. Live node connections, transaction flows, block propagation. The same globe from the members room, exact implementation carried over.
- Both globes must feel alive. Static globes are decoration. These are instruments.

---

## Architecture

### Stack Recommendation

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Frontend | **Next.js 14+ (App Router)** | SSR for SEO on briefing permalinks, React for the interactive dashboard, API routes for backend logic. Single codebase. |
| Database | **PostgreSQL** (self-hosted on VPS) | User accounts, preferences, watchlists, briefing archive. Relational data that needs querying. Full control on existing infrastructure. |
| Auth | **NextAuth.js** or custom | Email + PIN, Nostr login (NIP-07). No OAuth dependency on third-party platforms. |
| Hosting | **Hostinger VPS** (existing) | Already in place. Run Next.js via PM2 or Docker. Nginx reverse proxy. |
| AI | **Grok 4.2** (xAI API) | Settled. Five-agent briefing architecture carries forward from V2. |
| Data APIs | **API-Ninjas** (paid, existing) + free tier sources | Bitcoin: CoinGecko/Blockchain.info. On-chain: Mempool.space. Macro: FRED, ECB. Fear & Greed: Alternative.me. |
| Cron/Scheduling | **Node-cron** or system crontab | Daily briefing generation at 00:00 CET. Scheduled data snapshots. |
| Real-time | **WebSocket** or SSE for live price/data | Optional for V3.0 — polling is fine initially. |

### Project Structure

```
situationroom-v3/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (auth)/             # Login, register, email+PIN, Nostr
│   │   ├── (dashboard)/        # Main authenticated dashboard
│   │   ├── briefing/[date]/    # Public briefing permalinks (SSR)
│   │   ├── api/                # API routes
│   │   │   ├── briefing/       # Briefing generation & retrieval
│   │   │   ├── user/           # Preferences, layouts, watchlists
│   │   │   ├── data/           # Data proxy/cache layer
│   │   │   └── cron/           # Scheduled job triggers
│   │   └── layout.tsx
│   ├── components/
│   │   ├── panels/             # Individual data panels (modular)
│   │   ├── briefing/           # Briefing display, archive, diff
│   │   ├── conviction/         # Conviction score breakdown
│   │   ├── watchlist/          # Watchlist management
│   │   └── layout/             # Dashboard grid, panel picker
│   ├── lib/
│   │   ├── grok/               # Grok agent prompts & orchestration
│   │   ├── data/               # Data fetchers (price, on-chain, macro)
│   │   ├── db/                 # Database queries & models
│   │   └── auth/               # Auth utilities
│   └── types/                  # TypeScript types
├── prisma/                     # Database schema
├── public/
├── scripts/
│   └── generate-briefing.ts    # Standalone briefing generation script
└── docs/
    └── V3-FRAMEWORK.md         # This file
```

---

## Feature Layers

### Layer 1: User System

**Priority:** Highest. Everything else depends on this.

The user system is not a feature — it's the foundation that makes every other feature personal.

**1.1 Authentication**
- Email + PIN as primary — zero password friction, no OAuth dependency
- Nostr login (NIP-07 / extension-based) — native to this audience, sovereign identity
- Session persistence — stay logged in across visits
- Anonymous/guest mode — full read-only dashboard, briefing access, no saved state

**1.2 User Profile & Preferences**
- Display name (used in social features later)
- Timezone setting (affects briefing delivery timing, "what changed" calculations)
- Theme preference (parchment default / dark mode with teal-coral palette)
- Default dashboard layout (stored server-side, synced across devices)
- Notification preferences (email digest frequency, alert channels)
- Data display preferences (currency denomination: USD/EUR/GBP/sats, number formatting)

**1.3 Persistent State**
- Dashboard layout (which panels, what order, what size)
- Watchlist items
- Briefing bookmarks (save specific briefings for reference)
- Last-visit timestamp (powers the "what changed" diff view)

**Database tables:**
```
users
  id, email, display_name, timezone, currency_pref,
  theme_pref,  -- 'parchment' | 'dark'
  tier, is_public,
  created_at, last_seen_at

user_layouts
  id, user_id, layout_json, is_default, name, created_at

user_watchlists
  id, user_id, name, items_json, is_public, created_at

user_bookmarks
  id, user_id, briefing_date, note, is_public, created_at

user_preferences
  user_id, key, value
```

---

### Layer 2: Dashboard Core

**Priority:** High. This is the daily interface.

The dashboard stops being a fixed page and becomes a configurable workspace. Every data source is a panel. Users choose which panels they see and where they sit.

**2.1 Panel System**
- Each data source is an independent, self-contained panel component
- Panels can be added, removed, resized, and reordered
- Panel state (expanded/collapsed, specific settings) persists per user
- Default layout for new/anonymous users (curated "best of" arrangement)
- Layout presets: "Full Overview", "Macro Focus", "On-Chain Deep Dive", "Minimal"

**2.2 Available Panels (at launch)**

*Bitcoin Core:*
- Price (multi-timeframe: 1H, 24H, 7D, 30D, YTD)
- Fear & Greed Index (current + 7-day trend)
- Conviction Score (interactive breakdown — see Layer 4)
- Mempool status (fees, unconfirmed tx count, block time)
- Exchange net flows (inflow/outflow balance)
- Hash rate & difficulty

*Macro:*
- DXY (Dollar index)
- US 10Y yield
- Gold spot price
- S&P 500 / major indices
- Key economic calendar (next FOMC, CPI, NFP dates with countdowns)

*Geopolitical:*
- Threat level indicator (from briefing agent)
- Active conflict/crisis monitor (headline-level, from Grok geopolitical agent)

*On-Chain:*
- MVRV ratio
- SOPR
- Exchange reserves
- Whale transaction feed (large movements, simplified)

**2.3 Panel API Pattern**
Every panel follows the same contract:
```typescript
interface PanelDefinition {
  id: string;
  name: string;
  category: 'bitcoin' | 'macro' | 'geopolitical' | 'onchain';
  component: React.ComponentType<PanelProps>;
  defaultSize: 'sm' | 'md' | 'lg';
  refreshInterval: number; // seconds
  dataSources: string[];   // which API endpoints it needs
}
```

**2.4 Responsive Behaviour**
- Desktop: Full grid, drag-and-drop reorder. Globe prominent in default layout (parchment or dark variant depending on theme).
- Tablet: Simplified grid, tap to expand. Globe scaled but still visible.
- Mobile: Single-column stack, user-ordered, collapsible panels. Globe as compact header element or accessible via swipe — do not hide it entirely, it's the brand.
- PWA: Installable, offline-capable for last-cached data (see Layer 10)

---

### Layer 3: Briefing Engine

**Priority:** High. The briefing is what people quote and share. It's the moat.

The five-agent Grok architecture from V2 carries forward with improvements.

**3.1 Generation Pipeline**

```
00:00 CET daily
    │
    ├── Snapshot dashboard data (price, scores, indicators)
    │
    ├── Parallel: Agent 1 (Market) ──┐
    ├── Parallel: Agent 2 (Network) ─┤
    ├── Parallel: Agent 3 (Geopolitical) ─┤
    ├── Parallel: Agent 4 (Macro) ───┘
    │                                │
    │         ┌──────────────────────┘
    │         ▼
    ├── Agent 5 (Synthesis/Outlook) receives all four outputs
    │
    ├── Post-processing: citation verification, banned-phrase check
    │
    ├── Store: briefing text + data snapshot + metadata
    │
    └── Publish: update dashboard, generate permalink, queue email digest
```

**3.2 Briefing Storage**
```
briefings
  id, date, generated_at,
  market_section, network_section, geopolitical_section, macro_section, outlook_section,
  data_snapshot_json,     -- all indicator values at generation time
  sources_json,           -- cited URLs from agents
  threat_level,           -- extracted from geopolitical agent
  conviction_score,       -- score at time of briefing
  headline                -- one-line summary for social/SEO
```

**3.3 Briefing Archive**
- Public permalink for every briefing: `/briefing/2026-03-29`
- SSR-rendered for SEO — each briefing is indexable content
- Rich social preview (Open Graph): headline, date, threat level, conviction score
- Archive browser: calendar view, filterable by threat level or conviction score range
- "What Changed Since Yesterday" diff view on dashboard load for returning users

**3.4 Briefing Quality Controls**
- Banned-phrase filter runs post-generation (the list from our earlier work)
- Citation verification: any claim with a specific number in agents 3/4 must have a source
- If a claim fails verification, flag as "[unverified]" rather than publish without attribution
- Store raw Grok outputs alongside published versions for audit trail

**3.5 Prompt Architecture**
The five-agent prompt system designed in V2 is the starting point. Key constraints:
- No sentence that could have been written without today's data
- No sentence that restates a data point without interpreting it
- Strong takes, clearly owned — hedge only when uncertainty is itself the point
- Each agent has a distinct analytical voice; Agent 5 synthesises without repeating

---

### Layer 4: Conviction Score

**Priority:** Medium-high. This is the signature feature — the thing nobody else has.

The conviction score stops being a number and becomes an argument.

**4.1 Score Composition**
Five input signals, each scored -2 to +2, weighted and composited:

| Signal | Source | Weight |
|--------|--------|--------|
| Price momentum | 50/200 DMA crossover, RSI, trend | 25% |
| On-chain health | MVRV, SOPR, exchange flows | 25% |
| Macro environment | DXY, yields, liquidity conditions | 20% |
| Network fundamentals | Hash rate trend, difficulty, fees | 15% |
| Sentiment | Fear & Greed, funding rates | 15% |

**4.2 Interactive Breakdown**
- Visual breakdown showing each signal's current reading and direction
- Each signal is clickable — expands to show the underlying data and reasoning
- Users can see which signals are pulling the score up vs down
- Historical score chart with the ability to see composition over time
- "Disagree?" — users can override individual signals to see how it changes the composite (personal, not public)

**4.3 Score Storage**
```
conviction_scores
  id, date, composite_score,
  price_momentum_score, price_momentum_data_json,
  onchain_health_score, onchain_health_data_json,
  macro_environment_score, macro_environment_data_json,
  network_fundamentals_score, network_fundamentals_data_json,
  sentiment_score, sentiment_data_json
```

---

### Layer 5: Watchlists & Alerts

**Priority:** Medium. Adds daily utility beyond the briefing.

**5.1 Watchlists**
- Users create named watchlists (e.g. "My Macro Triggers", "On-Chain Signals")
- Watchlist items are any metric available in the panel system
- Compact watchlist view: a single panel showing all watched metrics with current values and change
- Multiple watchlists per user
- Shareable watchlists (generates a public link — feeds into social features)

**5.2 Alerts (not at launch — Phase 2 feature)**
- Threshold alerts: "Notify me when Fear & Greed drops below 20"
- Change alerts: "Notify me when DXY moves more than 1% in a day"
- Delivery: email initially, push notification via PWA later
- Alert history: log of all triggered alerts with timestamps

**5.3 Watchlist Storage**
```
watchlist_items
  id, watchlist_id, metric_id, display_name,
  alert_enabled, alert_type, alert_threshold, alert_direction,
  sort_order

alert_history
  id, user_id, watchlist_item_id, triggered_at,
  metric_value, threshold_value, notification_sent
```

---

### Layer 6: Data Layer

**Priority:** High (but mostly plumbing — less design, more engineering).

**6.1 Data Architecture**

All external API calls go through a server-side cache layer. No direct client-to-API calls. This gives you rate limit control, fallback handling, and the ability to swap providers without touching the frontend.

```
Client → Next.js API route → Cache check → External API (if stale)
                                  ↓
                            PostgreSQL cache table
```

**6.2 Cache Strategy**

| Data type | Refresh interval | Cache duration |
|-----------|-----------------|----------------|
| Price | 60 seconds | 2 minutes |
| Fear & Greed | 1 hour | 2 hours |
| On-chain (mempool, flows) | 5 minutes | 10 minutes |
| Macro (DXY, yields, indices) | 15 minutes | 30 minutes |
| Hash rate / difficulty | 1 hour | 2 hours |
| Conviction score | Recalculated hourly | Until next calculation |
| Briefing | Daily at 00:00 CET | Until next briefing |

**6.3 Data Sources (confirmed/planned)**

| Metric | Primary Source | Fallback |
|--------|---------------|----------|
| BTC price | CoinGecko API | API-Ninjas |
| Fear & Greed | Alternative.me | — |
| Mempool | Mempool.space API | — |
| Exchange flows | CryptoQuant free tier / Blockchain.info | — |
| MVRV, SOPR | Glassnode free tier | CoinMetrics community |
| DXY, yields | FRED API | API-Ninjas |
| S&P 500 / indices | API-Ninjas (paid) | — |
| Gold | API-Ninjas (paid) | — |
| Hash rate | Blockchain.info | Mempool.space |
| Economic calendar | FRED + manual curation | — |

**6.4 Data Snapshot Service**
Every hour, snapshot all current values into a `data_snapshots` table. This powers:
- Historical charts on every panel
- Conviction score calculation
- Briefing context (what the numbers were when the briefing was written)
- "What Changed" diff view

```
data_snapshots
  id, timestamp, data_json
```

---

### Layer 7: Distribution

**Priority:** Lower for launch, but architect for it from day one.

**7.1 SEO**
- Every briefing is a unique, SSR-rendered page with its own URL
- Structured data (JSON-LD) on briefing pages: article schema, date, author
- Meta tags: dynamic OG images showing headline + threat level + conviction score
- Sitemap auto-generated from briefing archive
- Target long-tail: "Bitcoin macro analysis [date]", "Bitcoin daily briefing [date]"

**7.2 Social Sharing**
- One-click share to X from any briefing
- Share card includes: headline, threat level badge, conviction score, date
- Shareable watchlists generate public preview pages
- Dashboard screenshot mode: clean, branded capture for manual sharing

**7.3 Email Digest**
- Daily email with briefing summary + key metric changes
- Configurable: daily, weekly summary, or off
- Simple — plain text or minimal HTML. Not a newsletter design project.
- Unsubscribe in one click

**7.4 Embeddable Widgets**
- Conviction score badge (live, embeddable iframe or script tag)
- Threat level indicator
- Designed for other Bitcoin sites/newsletters to embed

---

### Layer 8: Monetisation Foundation

**Priority:** Lowest for launch, but the architecture must not block it.

Do not build monetisation features yet. Build the user base. But make these decisions now so you don't have to retrofit:

**8.1 Tier Structure (future)**

| Feature | Free | Premium |
|---------|------|---------|
| Dashboard (default layout) | Yes | Yes |
| Custom layouts | 1 saved | Unlimited |
| Briefing (today) | Yes | Yes |
| Briefing archive | Last 7 days | Full history |
| Watchlists | 1, max 5 items | Unlimited |
| Alerts | — | Yes |
| Email digest | Weekly summary | Daily + weekly |
| Conviction score override | — | Yes |

**8.2 Implementation Notes**
- Add a `tier` field to the users table now (default: 'free')
- Gate features with a simple `canAccess(user, feature)` utility
- Don't build a payment system yet — when the time comes, BTCPay Server is the on-brand choice
- Stripe as fallback for users who prefer fiat

---

### Layer 9: Social Features (Future)

Not in V3 launch scope, but shapes some data model decisions now.

**9.1 Planned**
- Public user profiles (optional) — display name, public watchlists, bookmarked briefings
- Shared watchlists — "Here's what I'm tracking" as a shareable link
- Briefing reactions — simple signal (agree/disagree with conviction score, not a comment system)

**9.2 Data Model Implications**
- Watchlists need an `is_public` boolean from the start
- User profiles need an `is_public` boolean
- Briefing bookmarks need an `is_public` boolean
- Add these columns now, even if the social UI comes later

---

### Layer 10: PWA / Mobile (Future)

**10.1 Progressive Web App**
- Service worker for offline access to last-cached dashboard state
- Install prompt on mobile browsers
- Push notifications (requires service worker + notification permission)
- Home screen icon with proper manifest

**10.2 Mobile-First Design**
- Single-column panel stack on mobile
- Swipe between panels
- Pull-to-refresh
- Briefing is the default mobile view (not the full dashboard)

---

## Implementation Phases

### Phase 0: Foundation (Week 1-2)
- Next.js project setup on Hostinger VPS
- PostgreSQL database setup + Prisma schema
- Auth system (email + PIN, Nostr login)
- CI/CD pipeline (Git push → build → deploy)
- Basic user model with preferences table

**Ship:** Login works. Empty dashboard loads. Users exist in the database.

### Phase 1: Dashboard + Data (Week 3-5)
- Panel component system with the standard contract
- Data cache layer (API routes + PostgreSQL cache)
- Build 8-10 core panels (price, F&G, mempool, DXY, yields, gold, hash rate, indices)
- Default layout for anonymous/new users
- Layout persistence for authenticated users
- Panel add/remove/reorder UI

**Ship:** Functional dashboard with live data. Users can customise what they see.

### Phase 2: Briefing Engine (Week 5-7)
- Port five-agent Grok architecture to server-side
- Cron job for daily generation at 00:00 CET
- Briefing storage + archive
- Public permalink pages with SSR
- "What Changed" diff view on dashboard
- Post-generation quality checks (banned phrases, citation verification)
- OG image generation for social sharing

**Ship:** Daily briefings generate automatically. Archive is browsable. Permalinks are shareable.

### Phase 3: Conviction Score (Week 7-8)
- Score calculation engine (five signals, weighted composite)
- Interactive breakdown panel
- Historical score storage + chart
- Personal override feature ("what if I disagree with this signal?")

**Ship:** Conviction score is live, argumentative, and interactive.

### Phase 4: Watchlists (Week 8-9)
- Watchlist CRUD (create, add items, remove, reorder)
- Watchlist panel on dashboard
- Shareable watchlist links (public preview page)
- `is_public` toggle

**Ship:** Users can track custom metric sets. Watchlists are shareable.

### Phase 5: Distribution (Week 9-11)
- SEO: sitemap, structured data, meta tags on all briefing pages
- Social: share buttons, OG card design, screenshot mode
- Email digest: daily/weekly send via Resend or Postmark
- Embeddable widgets: conviction score badge, threat level indicator

**Ship:** The product has organic discovery channels. Content compounds.

### Phase 6: Polish + Monetisation Prep (Week 11-12)
- Tier gating utility (`canAccess`) wired to all gated features
- Free tier limits enforced (1 layout, 7-day archive, 1 watchlist)
- Premium tier unlocks everything (no payment yet — manual upgrade for early users)
- Mobile responsive pass on all panels
- PWA manifest + service worker for basic offline

**Ship:** Product is tier-aware. Mobile experience is solid. PWA is installable.

---

## Principles

1. **One product, one audience.** Macro-aware Bitcoiners who want to understand the world through a Bitcoin lens.
2. **Retention over acquisition.** A dashboard 100 people visit daily is more valuable than one 10,000 people visit once.
3. **The AI layer is the moat.** Data is commoditised. Interpretation through a Bitcoin lens is not.
4. **Deploy incrementally.** Ship after each phase. Get feedback. Adjust.
5. **Screenshots are marketing.** Every design decision should consider: does this look good shared on X?
6. **Focus is a feature.** Every addition must earn its place.
7. **Personalisation is the product.** V3's differentiator is that the dashboard becomes the user's workspace, not a broadcast.
8. **Parchment is the brand.** The editorial, warm, textured aesthetic is non-negotiable. Every new component must look like it belongs on the same page as the globe. If it looks like a crypto dashboard, it's wrong.

---

## Open Questions (resolve during Phase 0)

- **Prisma vs raw SQL?** Prisma adds convenience and type safety. Raw SQL is leaner. For a solo builder, Prisma probably wins on velocity.
- **Supabase vs self-hosted PostgreSQL?** Given you already have the VPS, self-hosted PostgreSQL with NextAuth.js is likely the cleaner path. Full control, no external dependency.
- **OG image generation:** Not on Vercel, so use `satori` (the underlying library behind `@vercel/og`) for self-hosted OG image generation.
- **Email provider:** Resend has the best DX for a solo builder. Postmark is battle-tested. SES is cheapest at scale. Pick one in Phase 0.
- **Grok API cost at scale:** Five agent calls per day is negligible. If you add user-promptable queries later, model the cost per query and set rate limits accordingly.
