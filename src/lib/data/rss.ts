/**
 * RSS feed aggregator — fetches sources, parses XML, categorises headlines,
 * and assigns approximate lat/lon for globe event markers.
 * Filtering: V2-style altcoin exclusion, slop removal, strict categories.
 */

import { categoriseHeadline, deduplicateHeadlines } from './headline-filters';

const RSS_FEEDS = [
  { name: 'Reuters', url: 'https://feeds.reuters.com/reuters/topNews', category: 'economy' },
  { name: 'BBC World', url: 'https://feeds.bbci.co.uk/news/world/rss.xml', category: 'political' },
  { name: 'BBC Business', url: 'https://feeds.bbci.co.uk/news/business/rss.xml', category: 'economy' },
  { name: 'Al Jazeera', url: 'https://www.aljazeera.com/xml/rss/all.xml', category: 'conflict' },
  { name: 'NPR World', url: 'https://feeds.npr.org/1004/rss.xml', category: 'political' },
  { name: 'Guardian', url: 'https://www.theguardian.com/world/rss', category: 'political' },
  { name: 'BTC Magazine', url: 'https://bitcoinmagazine.com/.rss/full/', category: 'bitcoin' },
  { name: 'CoinDesk', url: 'https://www.coindesk.com/arc/outboundfeeds/rss/', category: 'bitcoin' },
  { name: 'Cointelegraph', url: 'https://cointelegraph.com/rss/tag/bitcoin', category: 'bitcoin' },
  { name: 'Decrypt', url: 'https://decrypt.co/feed', category: 'bitcoin' },
  { name: 'CNBC', url: 'https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=100727362', category: 'economy' },
  { name: 'MarketWatch', url: 'https://feeds.marketwatch.com/marketwatch/topstories/', category: 'economy' },
  { name: 'Reuters Biz', url: 'https://feeds.reuters.com/reuters/businessNews', category: 'economy' },
  { name: 'Guardian Biz', url: 'https://www.theguardian.com/uk/business/rss', category: 'economy' },
  { name: 'ZeroHedge', url: 'https://feeds.feedburner.com/zerohedge/feed', category: 'economy' },
  { name: 'Crisis Group', url: 'https://www.crisisgroup.org/rss-0', category: 'conflict' },
  { name: 'Sky News', url: 'https://feeds.skynews.com/feeds/rss/world.xml', category: 'conflict' },
];

export interface RSSEvent {
  title: string;
  category: string;
  source: string;
  link: string;
  time: number;
  lat: number;
  lon: number;
}

// Keyword-based geolocation — maps headline keywords to approximate coordinates
const GEO_KEYWORDS: { pattern: RegExp; lat: number; lon: number }[] = [
  { pattern: /\b(ukraine|kyiv|kiev)\b/i, lat: 50.45, lon: 30.52 },
  { pattern: /\b(russia|moscow|kremlin)\b/i, lat: 55.75, lon: 37.62 },
  { pattern: /\b(china|beijing|shanghai)\b/i, lat: 39.9, lon: 116.4 },
  { pattern: /\b(taiwan|taipei)\b/i, lat: 25.03, lon: 121.57 },
  { pattern: /\b(iran|tehran)\b/i, lat: 35.69, lon: 51.39 },
  { pattern: /\b(israel|tel aviv|jerusalem|gaza)\b/i, lat: 31.77, lon: 35.23 },
  { pattern: /\b(palestine|hamas|west bank)\b/i, lat: 31.95, lon: 35.2 },
  { pattern: /\b(lebanon|beirut|hezbollah)\b/i, lat: 33.89, lon: 35.50 },
  { pattern: /\b(syria|damascus)\b/i, lat: 33.51, lon: 36.29 },
  { pattern: /\b(iraq|baghdad)\b/i, lat: 33.31, lon: 44.37 },
  { pattern: /\b(yemen|houthi|sanaa)\b/i, lat: 15.37, lon: 44.21 },
  { pattern: /\b(saudi|riyadh)\b/i, lat: 24.71, lon: 46.68 },
  { pattern: /\b(north korea|pyongyang)\b/i, lat: 39.04, lon: 125.76 },
  { pattern: /\b(south korea|seoul)\b/i, lat: 37.57, lon: 126.98 },
  { pattern: /\b(japan|tokyo)\b/i, lat: 35.68, lon: 139.69 },
  { pattern: /\b(india|delhi|mumbai)\b/i, lat: 28.61, lon: 77.21 },
  { pattern: /\b(pakistan|islamabad)\b/i, lat: 33.69, lon: 73.04 },
  { pattern: /\b(turkey|ankara|istanbul|erdogan)\b/i, lat: 39.93, lon: 32.85 },
  { pattern: /\b(germany|berlin)\b/i, lat: 52.52, lon: 13.41 },
  { pattern: /\b(france|paris|macron)\b/i, lat: 48.86, lon: 2.35 },
  { pattern: /\b(uk|london|britain|british)\b/i, lat: 51.51, lon: -0.13 },
  { pattern: /\b(us|washington|congress|white house|pentagon|fed)\b/i, lat: 38.9, lon: -77.04 },
  { pattern: /\b(wall street|new york|nyse|nasdaq)\b/i, lat: 40.71, lon: -74.01 },
  { pattern: /\b(silicon valley|california|san francisco)\b/i, lat: 37.77, lon: -122.42 },
  { pattern: /\b(canada|ottawa|toronto)\b/i, lat: 45.42, lon: -75.7 },
  { pattern: /\b(brazil|brasilia|sao paulo)\b/i, lat: -15.79, lon: -47.88 },
  { pattern: /\b(argentina|buenos aires)\b/i, lat: -34.6, lon: -58.38 },
  { pattern: /\b(mexico|mexico city)\b/i, lat: 19.43, lon: -99.13 },
  { pattern: /\b(nigeria|lagos|abuja)\b/i, lat: 9.06, lon: 7.49 },
  { pattern: /\b(south africa|johannesburg|cape town)\b/i, lat: -26.2, lon: 28.05 },
  { pattern: /\b(egypt|cairo)\b/i, lat: 30.04, lon: 31.24 },
  { pattern: /\b(sudan|khartoum)\b/i, lat: 15.59, lon: 32.53 },
  { pattern: /\b(ethiopia|addis ababa)\b/i, lat: 9.02, lon: 38.75 },
  { pattern: /\b(australia|sydney|canberra)\b/i, lat: -33.87, lon: 151.21 },
  { pattern: /\b(bitcoin|btc|crypto|satoshi|el salvador)\b/i, lat: 13.69, lon: -89.19 },
  { pattern: /\b(opec|oil)\b/i, lat: 25.2, lon: 55.27 },
  { pattern: /\b(nato|brussels|eu|european)\b/i, lat: 50.85, lon: 4.35 },
  { pattern: /\b(swiss|switzerland|zurich|davos)\b/i, lat: 47.38, lon: 8.54 },
  { pattern: /\b(singapore)\b/i, lat: 1.35, lon: 103.82 },
  { pattern: /\b(hong kong)\b/i, lat: 22.32, lon: 114.17 },
];

function geolocate(title: string): { lat: number; lon: number } | null {
  for (const geo of GEO_KEYWORDS) {
    if (geo.pattern.test(title)) {
      // Add small random offset to avoid stacking
      const jitter = () => (Math.random() - 0.5) * 3;
      return { lat: geo.lat + jitter(), lon: geo.lon + jitter() };
    }
  }
  return null;
}

// categoriseHeadline imported from headline-filters.ts — handles V2 filtering

function decodeEntities(s: string): string {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_m, code) => String.fromCharCode(parseInt(code, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (_m, code) => String.fromCharCode(parseInt(code, 16)))
    .replace(/<[^>]+>/g, '') // strip any remaining HTML tags
    .trim();
}

function parseXML(xml: string): { title: string; link: string; pubDate: string }[] {
  const items: { title: string; link: string; pubDate: string }[] = [];
  const itemRegex = /<item[^>]*>([\s\S]*?)<\/item>/gi;
  let match;
  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1];
    const titleMatch = block.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const linkMatch = block.match(/<link[^>]*>([\s\S]*?)<\/link>/i);
    const dateMatch = block.match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i);
    if (titleMatch) {
      const title = decodeEntities(titleMatch[1]);
      const link = linkMatch ? decodeEntities(linkMatch[1]) : '';
      const pubDate = dateMatch ? dateMatch[1].trim() : '';
      if (title) items.push({ title, link, pubDate });
    }
  }
  return items;
}

export interface RSSHeadline {
  title: string;
  category: string;
  source: string;
  link: string;
  time: number;
}

// ── Module-level cache shared by ALL callers (route handler + briefing pipeline) ──
let _cache: { events: RSSEvent[]; headlines: RSSHeadline[] } | null = null;
let _cacheTime = 0;
const CACHE_DURATION = 300_000; // 5 minutes — same as dashboard header poll interval

/**
 * Unified fetch — single pass fetches all RSS feeds, returns both
 * geolocated events (for globe) and all headlines (for feed + wire).
 * Cache is shared: the dashboard header and the briefing pipeline always
 * compute threat level from the same dataset.
 */
export async function fetchRSSAll(): Promise<{ events: RSSEvent[]; headlines: RSSHeadline[] }> {
  if (_cache && Date.now() - _cacheTime < CACHE_DURATION) {
    return _cache;
  }
  const allEvents: RSSEvent[] = [];
  const allHeadlines: RSSHeadline[] = [];

  const results = await Promise.allSettled(
    RSS_FEEDS.map(async (feed) => {
      try {
        const res = await fetch(feed.url, { signal: AbortSignal.timeout(10_000) });
        if (!res.ok) return { events: [] as RSSEvent[], headlines: [] as RSSHeadline[] };
        const xml = await res.text();
        const items = parseXML(xml);

        const events: RSSEvent[] = [];
        const headlines: RSSHeadline[] = [];

        for (const item of items.slice(0, 12)) {
          const category = categoriseHeadline(item.title, feed.category);
          if (!category) continue;
          const time = item.pubDate ? Math.floor(new Date(item.pubDate).getTime() / 1000) : Math.floor(Date.now() / 1000);

          // All valid items go to headlines
          headlines.push({ title: item.title, category, source: feed.name, link: item.link, time });

          // Geolocated items also go to events
          const geo = geolocate(item.title);
          if (geo) {
            events.push({ title: item.title, category, source: feed.name, link: item.link, time, lat: geo.lat, lon: geo.lon });
          }
        }

        return { events, headlines };
      } catch {
        return { events: [] as RSSEvent[], headlines: [] as RSSHeadline[] };
      }
    })
  );

  for (const result of results) {
    if (result.status === 'fulfilled') {
      allEvents.push(...result.value.events);
      allHeadlines.push(...result.value.headlines);
    }
  }

  allEvents.sort((a, b) => b.time - a.time);
  allHeadlines.sort((a, b) => b.time - a.time);

  const result = {
    events: deduplicateHeadlines(allEvents).slice(0, 100),
    headlines: deduplicateHeadlines(allHeadlines).slice(0, 150),
  };

  _cache = result;
  _cacheTime = Date.now();

  return result;
}

// Keep legacy exports for backward compat
export async function fetchRSSEvents(): Promise<RSSEvent[]> {
  return (await fetchRSSAll()).events;
}

export async function fetchRSSHeadlines(): Promise<RSSHeadline[]> {
  return (await fetchRSSAll()).headlines;
}
