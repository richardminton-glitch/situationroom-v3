/**
 * RSS feed aggregator — fetches sources, parses XML, categorises headlines,
 * and assigns approximate lat/lon for globe event markers.
 * Filtering: V2-style altcoin exclusion, slop removal, strict categories.
 * Geo: V2-style city-spreading — cycles through major cities per country so
 * multiple headlines about the same region don't stack at one point.
 */

import { categoriseHeadline, deduplicateHeadlines } from './headline-filters';
import { classifyArticles, type ClassifiedArticle, type RawArticle } from '@/lib/rss/classifier';

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

// ── Geo types ─────────────────────────────────────────────────────────────────

type GeoCity = { lat: number; lon: number };

interface GeoKeyword {
  key: string;
  pattern: RegExp;
  lat: number;  // base lat (centre of country/region)
  lon: number;  // base lon
  cities: GeoCity[];  // major cities to cycle through when multiple headlines match
}

interface GeoResult {
  lat: number;
  lon: number;
  _baseLat: number;
  _baseLon: number;
  _geoKey: string;
  _cities: GeoCity[];
}

// ── Keyword-based geolocation ─────────────────────────────────────────────────
// Priority: Country/region patterns first, then topic fallbacks (bitcoin, crypto, opec).
// geolocate() returns the FIRST match, so ordering matters.
// Cities listed in descending population order — first headline gets the capital,
// subsequent headlines spread to other cities in the same country.

const GEO_KEYWORDS: GeoKeyword[] = [
  {
    key: 'ukraine', pattern: /\b(ukraine|kyiv|kiev)\b/i, lat: 50.45, lon: 30.52,
    cities: [{ lat: 50.45, lon: 30.52 }, { lat: 49.84, lon: 24.03 }, { lat: 46.97, lon: 31.99 }, { lat: 47.85, lon: 35.12 }],
  },
  {
    key: 'russia', pattern: /\b(russia|moscow|kremlin|putin)\b/i, lat: 55.75, lon: 37.62,
    cities: [{ lat: 55.75, lon: 37.62 }, { lat: 59.93, lon: 30.32 }, { lat: 56.85, lon: 60.61 }, { lat: 55.00, lon: 82.92 }],
  },
  {
    key: 'china', pattern: /\b(china|beijing|shanghai|xi jinping)\b/i, lat: 39.9, lon: 116.4,
    cities: [{ lat: 39.90, lon: 116.40 }, { lat: 31.23, lon: 121.47 }, { lat: 23.13, lon: 113.27 }, { lat: 30.59, lon: 114.31 }],
  },
  {
    key: 'taiwan', pattern: /\b(taiwan|taipei)\b/i, lat: 25.03, lon: 121.57,
    cities: [{ lat: 25.03, lon: 121.57 }, { lat: 24.15, lon: 120.67 }, { lat: 22.99, lon: 120.21 }],
  },
  {
    key: 'iran', pattern: /\b(iran|tehran)\b/i, lat: 35.69, lon: 51.39,
    cities: [{ lat: 35.69, lon: 51.39 }, { lat: 32.65, lon: 51.68 }, { lat: 29.59, lon: 52.58 }, { lat: 38.08, lon: 46.29 }],
  },
  {
    key: 'israel', pattern: /\b(israel|tel aviv|jerusalem)\b/i, lat: 31.77, lon: 35.23,
    cities: [{ lat: 31.77, lon: 35.23 }, { lat: 32.08, lon: 34.78 }, { lat: 32.82, lon: 34.99 }, { lat: 31.25, lon: 34.79 }],
  },
  {
    key: 'gaza', pattern: /\b(gaza|hamas|west bank|palestine|palestinian)\b/i, lat: 31.52, lon: 34.46,
    cities: [{ lat: 31.52, lon: 34.46 }, { lat: 31.95, lon: 35.20 }, { lat: 31.90, lon: 35.20 }, { lat: 32.22, lon: 35.26 }],
  },
  {
    key: 'lebanon', pattern: /\b(lebanon|beirut|hezbollah)\b/i, lat: 33.89, lon: 35.50,
    cities: [{ lat: 33.89, lon: 35.50 }, { lat: 33.56, lon: 35.38 }, { lat: 34.44, lon: 35.84 }],
  },
  {
    key: 'syria', pattern: /\b(syria|damascus)\b/i, lat: 33.51, lon: 36.29,
    cities: [{ lat: 33.51, lon: 36.29 }, { lat: 36.20, lon: 37.16 }, { lat: 32.63, lon: 36.10 }],
  },
  {
    key: 'iraq', pattern: /\b(iraq|baghdad)\b/i, lat: 33.31, lon: 44.37,
    cities: [{ lat: 33.31, lon: 44.37 }, { lat: 36.34, lon: 43.13 }, { lat: 30.51, lon: 47.78 }],
  },
  {
    key: 'yemen', pattern: /\b(yemen|houthi|sanaa)\b/i, lat: 15.37, lon: 44.21,
    cities: [{ lat: 15.37, lon: 44.21 }, { lat: 12.78, lon: 45.03 }, { lat: 14.80, lon: 42.95 }],
  },
  {
    key: 'saudi', pattern: /\b(saudi|riyadh)\b/i, lat: 24.71, lon: 46.68,
    cities: [{ lat: 24.71, lon: 46.68 }, { lat: 21.49, lon: 39.19 }, { lat: 26.33, lon: 50.21 }],
  },
  {
    key: 'north_korea', pattern: /\b(north korea|pyongyang)\b/i, lat: 39.04, lon: 125.76,
    cities: [{ lat: 39.04, lon: 125.76 }, { lat: 39.92, lon: 127.54 }, { lat: 38.73, lon: 125.32 }],
  },
  {
    key: 'south_korea', pattern: /\b(south korea|seoul)\b/i, lat: 37.57, lon: 126.98,
    cities: [{ lat: 37.57, lon: 126.98 }, { lat: 35.18, lon: 129.07 }, { lat: 35.87, lon: 128.60 }],
  },
  {
    key: 'japan', pattern: /\b(japan|tokyo)\b/i, lat: 35.68, lon: 139.69,
    cities: [{ lat: 35.68, lon: 139.69 }, { lat: 34.69, lon: 135.50 }, { lat: 35.18, lon: 136.91 }, { lat: 43.07, lon: 141.35 }],
  },
  {
    key: 'india', pattern: /\b(india|delhi|mumbai|modi)\b/i, lat: 28.61, lon: 77.21,
    cities: [{ lat: 28.61, lon: 77.21 }, { lat: 19.08, lon: 72.88 }, { lat: 13.08, lon: 80.27 }, { lat: 22.57, lon: 88.36 }],
  },
  {
    key: 'pakistan', pattern: /\b(pakistan|islamabad|karachi)\b/i, lat: 33.69, lon: 73.04,
    cities: [{ lat: 33.69, lon: 73.04 }, { lat: 24.86, lon: 67.01 }, { lat: 31.56, lon: 74.35 }],
  },
  {
    key: 'turkey', pattern: /\b(turkey|ankara|istanbul|erdogan)\b/i, lat: 39.93, lon: 32.85,
    cities: [{ lat: 41.01, lon: 28.96 }, { lat: 39.93, lon: 32.85 }, { lat: 38.42, lon: 27.14 }, { lat: 37.00, lon: 35.32 }],
  },
  {
    key: 'germany', pattern: /\b(germany|berlin)\b/i, lat: 52.52, lon: 13.41,
    cities: [{ lat: 52.52, lon: 13.41 }, { lat: 53.57, lon: 10.02 }, { lat: 48.14, lon: 11.58 }, { lat: 50.94, lon: 6.96 }],
  },
  {
    key: 'france', pattern: /\b(france|paris|macron)\b/i, lat: 48.86, lon: 2.35,
    cities: [{ lat: 48.86, lon: 2.35 }, { lat: 45.75, lon: 4.85 }, { lat: 43.30, lon: 5.37 }, { lat: 43.61, lon: 3.88 }],
  },
  {
    key: 'uk', pattern: /\b(uk|london|britain|british)\b/i, lat: 51.51, lon: -0.13,
    cities: [{ lat: 51.51, lon: -0.13 }, { lat: 52.48, lon: -1.90 }, { lat: 53.48, lon: -2.24 }, { lat: 55.86, lon: -4.25 }],
  },
  {
    key: 'us_dc', pattern: /\b(washington|congress|white house|pentagon|capitol hill)\b/i, lat: 38.9, lon: -77.04,
    cities: [{ lat: 38.90, lon: -77.04 }, { lat: 38.88, lon: -77.02 }, { lat: 38.87, lon: -77.06 }],
  },
  {
    key: 'us_ny', pattern: /\b(wall street|new york|nyse|nasdaq)\b/i, lat: 40.71, lon: -74.01,
    cities: [{ lat: 40.71, lon: -74.01 }, { lat: 40.76, lon: -73.98 }, { lat: 40.68, lon: -74.04 }],
  },
  {
    key: 'us_west', pattern: /\b(silicon valley|california|san francisco|los angeles|hollywood)\b/i, lat: 37.77, lon: -122.42,
    cities: [{ lat: 37.77, lon: -122.42 }, { lat: 34.05, lon: -118.24 }, { lat: 47.61, lon: -122.33 }],
  },
  {
    key: 'us_fed', pattern: /\b(\bfed\b|federal reserve)\b/i, lat: 38.9, lon: -77.04,
    cities: [{ lat: 38.90, lon: -77.04 }, { lat: 40.71, lon: -74.01 }, { lat: 41.88, lon: -87.63 }],
  },
  {
    // General US catch-all — matches after specific US patterns above.
    // Cities spread coast-to-coast so markers don't cluster.
    key: 'us', pattern: /\b(united states|trump|biden|u\.?s\.?\b|america(?:n)?)\b/i, lat: 38.9, lon: -77.04,
    cities: [
      { lat: 38.90, lon: -77.04 },   // Washington DC
      { lat: 40.71, lon: -74.01 },   // New York
      { lat: 41.88, lon: -87.63 },   // Chicago
      { lat: 29.76, lon: -95.37 },   // Houston
      { lat: 33.75, lon: -84.39 },   // Atlanta
      { lat: 34.05, lon: -118.24 },  // Los Angeles
      { lat: 47.61, lon: -122.33 },  // Seattle
      { lat: 25.76, lon: -80.19 },   // Miami
      { lat: 39.74, lon: -104.99 },  // Denver
    ],
  },
  {
    key: 'canada', pattern: /\b(canada|ottawa|toronto)\b/i, lat: 45.42, lon: -75.70,
    cities: [{ lat: 45.42, lon: -75.70 }, { lat: 43.65, lon: -79.38 }, { lat: 45.51, lon: -73.55 }, { lat: 51.05, lon: -114.07 }],
  },
  {
    key: 'brazil', pattern: /\b(brazil|brasilia|sao paulo)\b/i, lat: -15.79, lon: -47.88,
    cities: [{ lat: -23.55, lon: -46.63 }, { lat: -15.79, lon: -47.88 }, { lat: -22.91, lon: -43.17 }, { lat: -12.97, lon: -38.50 }],
  },
  {
    key: 'argentina', pattern: /\b(argentina|buenos aires|milei)\b/i, lat: -34.60, lon: -58.38,
    cities: [{ lat: -34.60, lon: -58.38 }, { lat: -31.42, lon: -64.18 }, { lat: -32.89, lon: -68.85 }],
  },
  {
    key: 'mexico', pattern: /\b(mexico|mexico city)\b/i, lat: 19.43, lon: -99.13,
    cities: [{ lat: 19.43, lon: -99.13 }, { lat: 20.97, lon: -89.62 }, { lat: 25.67, lon: -100.31 }],
  },
  {
    key: 'nigeria', pattern: /\b(nigeria|lagos|abuja)\b/i, lat: 9.06, lon: 7.49,
    cities: [{ lat: 6.45, lon: 3.38 }, { lat: 9.06, lon: 7.49 }, { lat: 12.00, lon: 8.52 }],
  },
  {
    key: 'south_africa', pattern: /\b(south africa|johannesburg|cape town)\b/i, lat: -26.20, lon: 28.05,
    cities: [{ lat: -26.20, lon: 28.05 }, { lat: -33.92, lon: 18.42 }, { lat: -25.74, lon: 28.19 }],
  },
  {
    key: 'egypt', pattern: /\b(egypt|cairo)\b/i, lat: 30.04, lon: 31.24,
    cities: [{ lat: 30.04, lon: 31.24 }, { lat: 31.20, lon: 29.92 }, { lat: 25.69, lon: 32.64 }],
  },
  {
    key: 'sudan', pattern: /\b(sudan|khartoum)\b/i, lat: 15.59, lon: 32.53,
    cities: [{ lat: 15.59, lon: 32.53 }, { lat: 19.61, lon: 37.22 }],
  },
  {
    key: 'ethiopia', pattern: /\b(ethiopia|addis ababa)\b/i, lat: 9.02, lon: 38.75,
    cities: [{ lat: 9.02, lon: 38.75 }, { lat: 11.59, lon: 37.39 }],
  },
  {
    key: 'australia', pattern: /\b(australia|sydney|canberra|melbourne)\b/i, lat: -33.87, lon: 151.21,
    cities: [{ lat: -33.87, lon: 151.21 }, { lat: -37.81, lon: 144.96 }, { lat: -35.28, lon: 149.13 }, { lat: -27.47, lon: 153.03 }],
  },
  {
    key: 'el_salvador', pattern: /\b(el salvador|bukele|nayib)\b/i, lat: 13.69, lon: -89.19,
    cities: [{ lat: 13.69, lon: -89.19 }],
  },
  {
    key: 'nato_eu', pattern: /\b(nato|brussels|eu|european union|european)\b/i, lat: 50.85, lon: 4.35,
    cities: [{ lat: 50.85, lon: 4.35 }, { lat: 48.21, lon: 16.37 }, { lat: 52.38, lon: 4.90 }, { lat: 48.86, lon: 2.35 }],
  },
  {
    key: 'switzerland', pattern: /\b(swiss|switzerland|zurich|davos)\b/i, lat: 47.38, lon: 8.54,
    cities: [{ lat: 47.38, lon: 8.54 }, { lat: 46.95, lon: 7.45 }, { lat: 46.23, lon: 6.07 }],
  },
  {
    key: 'singapore', pattern: /\b(singapore)\b/i, lat: 1.35, lon: 103.82,
    cities: [{ lat: 1.35, lon: 103.82 }],
  },
  {
    key: 'hong_kong', pattern: /\b(hong kong)\b/i, lat: 22.32, lon: 114.17,
    cities: [{ lat: 22.32, lon: 114.17 }, { lat: 22.39, lon: 114.21 }],
  },

  // ── Additional Asia-Pacific ──────────────────────────────────────────────
  {
    key: 'indonesia', pattern: /\b(indonesia|jakarta|java|sumatra|bali)\b/i, lat: -6.21, lon: 106.85,
    cities: [{ lat: -6.21, lon: 106.85 }, { lat: -7.80, lon: 110.36 }, { lat: -8.65, lon: 115.22 }, { lat: 3.60, lon: 98.67 }],
  },
  {
    key: 'philippines', pattern: /\b(philippines|manila|filipino)\b/i, lat: 14.60, lon: 120.98,
    cities: [{ lat: 14.60, lon: 120.98 }, { lat: 10.32, lon: 123.89 }, { lat: 7.07, lon: 125.61 }],
  },
  {
    key: 'myanmar', pattern: /\b(myanmar|burma|yangon|rangoon)\b/i, lat: 16.87, lon: 96.20,
    cities: [{ lat: 16.87, lon: 96.20 }, { lat: 19.76, lon: 96.07 }, { lat: 21.97, lon: 96.08 }],
  },
  {
    key: 'thailand', pattern: /\b(thailand|bangkok|thai)\b/i, lat: 13.76, lon: 100.50,
    cities: [{ lat: 13.76, lon: 100.50 }, { lat: 18.79, lon: 98.98 }, { lat: 7.88, lon: 98.39 }],
  },
  {
    key: 'vietnam', pattern: /\b(vietnam|hanoi|ho chi minh)\b/i, lat: 21.03, lon: 105.85,
    cities: [{ lat: 21.03, lon: 105.85 }, { lat: 10.82, lon: 106.63 }, { lat: 16.07, lon: 108.22 }],
  },
  {
    key: 'malaysia', pattern: /\b(malaysia|kuala lumpur)\b/i, lat: 3.14, lon: 101.69,
    cities: [{ lat: 3.14, lon: 101.69 }, { lat: 5.41, lon: 100.34 }, { lat: 1.55, lon: 110.35 }],
  },
  {
    key: 'bangladesh', pattern: /\b(bangladesh|dhaka)\b/i, lat: 23.81, lon: 90.41,
    cities: [{ lat: 23.81, lon: 90.41 }, { lat: 22.34, lon: 91.83 }],
  },
  {
    key: 'sri_lanka', pattern: /\b(sri lanka|colombo)\b/i, lat: 6.93, lon: 79.85,
    cities: [{ lat: 6.93, lon: 79.85 }, { lat: 7.29, lon: 80.63 }],
  },
  {
    key: 'nepal', pattern: /\b(nepal|kathmandu)\b/i, lat: 27.72, lon: 85.32,
    cities: [{ lat: 27.72, lon: 85.32 }, { lat: 28.27, lon: 83.97 }],
  },
  {
    key: 'new_zealand', pattern: /\b(new zealand|wellington|auckland)\b/i, lat: -41.29, lon: 174.78,
    cities: [{ lat: -36.85, lon: 174.76 }, { lat: -41.29, lon: 174.78 }, { lat: -43.53, lon: 172.64 }],
  },

  // ── Additional Middle East / Central Asia ────────────────────────────────
  {
    key: 'afghanistan', pattern: /\b(afghanistan|kabul|afghan|taliban)\b/i, lat: 34.53, lon: 69.17,
    cities: [{ lat: 34.53, lon: 69.17 }, { lat: 31.61, lon: 65.71 }, { lat: 36.73, lon: 66.90 }],
  },
  {
    key: 'uae', pattern: /\b(uae|united arab emirates|dubai|abu dhabi|emirati)\b/i, lat: 25.20, lon: 55.27,
    cities: [{ lat: 25.20, lon: 55.27 }, { lat: 24.45, lon: 54.65 }, { lat: 25.34, lon: 55.42 }],
  },
  {
    key: 'qatar', pattern: /\b(qatar|doha)\b/i, lat: 25.29, lon: 51.53,
    cities: [{ lat: 25.29, lon: 51.53 }],
  },
  {
    key: 'jordan', pattern: /\b(jordan|amman)\b/i, lat: 31.95, lon: 35.93,
    cities: [{ lat: 31.95, lon: 35.93 }, { lat: 29.53, lon: 35.01 }],
  },

  // ── Additional Europe ────────────────────────────────────────────────────
  {
    key: 'italy', pattern: /\b(italy|rome|italian|milan)\b/i, lat: 41.90, lon: 12.50,
    cities: [{ lat: 41.90, lon: 12.50 }, { lat: 45.46, lon: 9.19 }, { lat: 40.85, lon: 14.27 }, { lat: 43.77, lon: 11.25 }],
  },
  {
    key: 'spain', pattern: /\b(spain|madrid|spanish|barcelona)\b/i, lat: 40.42, lon: -3.70,
    cities: [{ lat: 40.42, lon: -3.70 }, { lat: 41.39, lon: 2.17 }, { lat: 37.39, lon: -5.99 }],
  },
  {
    key: 'poland', pattern: /\b(poland|warsaw|polish)\b/i, lat: 52.23, lon: 21.01,
    cities: [{ lat: 52.23, lon: 21.01 }, { lat: 50.06, lon: 19.94 }, { lat: 51.76, lon: 19.46 }],
  },
  {
    key: 'greece', pattern: /\b(greece|athens|greek)\b/i, lat: 37.98, lon: 23.73,
    cities: [{ lat: 37.98, lon: 23.73 }, { lat: 40.64, lon: 22.94 }],
  },
  {
    key: 'romania', pattern: /\b(romania|bucharest)\b/i, lat: 44.43, lon: 26.10,
    cities: [{ lat: 44.43, lon: 26.10 }, { lat: 46.77, lon: 23.60 }],
  },
  {
    key: 'norway', pattern: /\b(norway|oslo|norwegian)\b/i, lat: 59.91, lon: 10.75,
    cities: [{ lat: 59.91, lon: 10.75 }, { lat: 60.39, lon: 5.32 }],
  },
  {
    key: 'sweden', pattern: /\b(sweden|stockholm|swedish)\b/i, lat: 59.33, lon: 18.07,
    cities: [{ lat: 59.33, lon: 18.07 }, { lat: 57.71, lon: 11.97 }],
  },

  // ── Additional Africa ────────────────────────────────────────────────────
  {
    key: 'libya', pattern: /\b(libya|tripoli|libyan)\b/i, lat: 32.90, lon: 13.18,
    cities: [{ lat: 32.90, lon: 13.18 }, { lat: 32.08, lon: 20.07 }],
  },
  {
    key: 'morocco', pattern: /\b(morocco|rabat|moroccan|sahara)\b/i, lat: 33.97, lon: -6.85,
    cities: [{ lat: 33.97, lon: -6.85 }, { lat: 33.57, lon: -7.59 }, { lat: 31.63, lon: -8.00 }],
  },
  {
    key: 'somalia', pattern: /\b(somalia|mogadishu|somali)\b/i, lat: 2.05, lon: 45.32,
    cities: [{ lat: 2.05, lon: 45.32 }, { lat: 10.44, lon: 45.04 }],
  },
  {
    key: 'kenya', pattern: /\b(kenya|nairobi)\b/i, lat: -1.29, lon: 36.82,
    cities: [{ lat: -1.29, lon: 36.82 }, { lat: -4.04, lon: 39.67 }],
  },
  {
    key: 'dr_congo', pattern: /\b(congo|kinshasa|congolese)\b/i, lat: -4.32, lon: 15.31,
    cities: [{ lat: -4.32, lon: 15.31 }, { lat: -11.66, lon: 27.47 }],
  },

  // ── Additional Americas ──────────────────────────────────────────────────
  {
    key: 'peru', pattern: /\b(peru|lima|peruvian)\b/i, lat: -12.05, lon: -77.04,
    cities: [{ lat: -12.05, lon: -77.04 }, { lat: -13.53, lon: -71.97 }, { lat: -16.41, lon: -71.54 }],
  },
  {
    key: 'colombia', pattern: /\b(colombia|bogota|colombian)\b/i, lat: 4.71, lon: -74.07,
    cities: [{ lat: 4.71, lon: -74.07 }, { lat: 6.25, lon: -75.56 }, { lat: 3.44, lon: -76.52 }],
  },
  {
    key: 'venezuela', pattern: /\b(venezuela|caracas|maduro)\b/i, lat: 10.49, lon: -66.88,
    cities: [{ lat: 10.49, lon: -66.88 }, { lat: 10.07, lon: -69.32 }],
  },
  {
    key: 'chile', pattern: /\b(chile|santiago|chilean)\b/i, lat: -33.45, lon: -70.67,
    cities: [{ lat: -33.45, lon: -70.67 }, { lat: -36.83, lon: -73.03 }],
  },
  {
    key: 'cuba', pattern: /\b(cuba|havana|cuban)\b/i, lat: 23.11, lon: -82.37,
    cities: [{ lat: 23.11, lon: -82.37 }, { lat: 20.02, lon: -75.83 }],
  },
  {
    key: 'haiti', pattern: /\b(haiti|port-au-prince|haitian)\b/i, lat: 18.54, lon: -72.34,
    cities: [{ lat: 18.54, lon: -72.34 }],
  },

  // ── Topic-based fallbacks (lowest priority) ───────────────────────────────
  // Only topics with a clear geographic centre get markers.
  // Bitcoin/crypto are excluded — they scatter markers globally with no
  // meaningful location.  Bitcoin articles that mention a specific country
  // will already match the country pattern above.
  {
    key: 'opec', pattern: /\b(opec|oil prices?|crude)\b/i, lat: 25.20, lon: 55.27,
    cities: [{ lat: 25.20, lon: 55.27 }, { lat: 24.47, lon: 54.37 }, { lat: 23.61, lon: 58.59 }, { lat: 29.38, lon: 47.99 }],
  },
];

function geolocate(title: string): GeoResult | null {
  for (const geo of GEO_KEYWORDS) {
    if (geo.pattern.test(title)) {
      return {
        lat: geo.lat,
        lon: geo.lon,
        _baseLat: geo.lat,
        _baseLon: geo.lon,
        _geoKey: geo.key,
        _cities: geo.cities,
      };
    }
  }
  return null;
}

/**
 * Distribute event markers across major cities so multiple headlines about the
 * same country/region don't stack at a single point.
 * Mirrors V2 `distributeEventCoords()` — sorts by title (deterministic), then
 * cycles through the city array for each geo key.
 */
type RSSEventWithGeo = RSSEvent & Partial<GeoResult>;

/** Max markers per geo key — keeps the globe readable when one region dominates the news */
const MAX_PER_GEO = 3;

function distributeEventCoords(events: RSSEventWithGeo[]): void {
  // Sort by time desc so we keep the most recent headlines per geo key
  const sorted = [...events].sort((a, b) => b.time - a.time);
  const countByKey: Record<string, number> = {};
  const keep = new Set<RSSEventWithGeo>();

  for (const ev of sorted) {
    const key = ev._geoKey ?? `${ev._baseLat ?? ev.lat},${ev._baseLon ?? ev.lon}`;
    const idx = countByKey[key] ?? 0;

    // Cap markers per region — drop excess
    if (idx >= MAX_PER_GEO) continue;
    countByKey[key] = idx + 1;
    keep.add(ev);

    const cities = ev._cities;
    if (cities && cities.length > 0) {
      const city = cities[idx % cities.length];
      ev.lat = city.lat;
      ev.lon = city.lon;
    } else {
      // Fallback: golden-angle spiral from base coords
      const angle = (idx * 137.5) * (Math.PI / 180);
      const dist = idx * 1.5;
      ev.lat = (ev._baseLat ?? ev.lat) + Math.cos(angle) * dist;
      ev.lon = (ev._baseLon ?? ev.lon) + Math.sin(angle) * dist;
    }
  }

  // Remove dropped events from the original array (in-place)
  for (let i = events.length - 1; i >= 0; i--) {
    if (!keep.has(events[i])) events.splice(i, 1);
  }

  // Cross-key proximity nudge: if two events from DIFFERENT keys land
  // within ~2 degrees, nudge the second one outward so they don't overlap.
  const MIN_DIST = 2.0; // degrees
  for (let i = 0; i < events.length; i++) {
    for (let j = i + 1; j < events.length; j++) {
      const a = events[i], b = events[j];
      const dlat = b.lat - a.lat;
      const dlon = b.lon - a.lon;
      const dist = Math.sqrt(dlat * dlat + dlon * dlon);
      if (dist < MIN_DIST && dist > 0) {
        // Push apart along the line between them
        const scale = (MIN_DIST - dist) / dist;
        b.lat += dlat * scale;
        b.lon += dlon * scale;
      } else if (dist === 0) {
        // Exact overlap — spiral outward
        const angle = (j * 137.5) * (Math.PI / 180);
        b.lat += Math.cos(angle) * MIN_DIST;
        b.lon += Math.sin(angle) * MIN_DIST;
      }
    }
  }
}

// ── categoriseHeadline imported from headline-filters.ts ──────────────────────

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

function parseXML(xml: string): { title: string; link: string; pubDate: string; description: string }[] {
  const items: { title: string; link: string; pubDate: string; description: string }[] = [];
  const itemRegex = /<item[^>]*>([\s\S]*?)<\/item>/gi;
  let match;
  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1];
    const titleMatch = block.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const linkMatch  = block.match(/<link[^>]*>([\s\S]*?)<\/link>/i);
    const dateMatch  = block.match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i);
    const descMatch  = block.match(/<description[^>]*>([\s\S]*?)<\/description>/i);
    if (titleMatch) {
      const title       = decodeEntities(titleMatch[1]);
      const link        = linkMatch  ? decodeEntities(linkMatch[1])  : '';
      const pubDate     = dateMatch  ? dateMatch[1].trim()           : '';
      const description = descMatch  ? decodeEntities(descMatch[1]).substring(0, 300) : '';
      if (title) items.push({ title, link, pubDate, description });
    }
  }
  return items;
}

/** RSSHeadline is now ClassifiedArticle — backward compat alias. */
export type RSSHeadline = ClassifiedArticle;

// ── Module-level cache shared by ALL callers ──────────────────────────────────
let _cache: { events: RSSEvent[]; headlines: ClassifiedArticle[] } | null = null;
let _cacheTime = 0;
const CACHE_DURATION = 300_000; // 5 minutes

/**
 * Unified fetch — single pass fetches all RSS feeds, returns both
 * geolocated events (for globe) and all headlines (for feed + wire).
 * Cache is shared: the dashboard header and the briefing pipeline always
 * compute threat level from the same dataset.
 */
export async function fetchRSSAll(): Promise<{ events: RSSEvent[]; headlines: ClassifiedArticle[] }> {
  if (_cache && Date.now() - _cacheTime < CACHE_DURATION) {
    return _cache;
  }
  const allEvents: RSSEventWithGeo[] = [];
  const allRawHeadlines: RawArticle[] = [];

  const results = await Promise.allSettled(
    RSS_FEEDS.map(async (feed) => {
      try {
        const res = await fetch(feed.url, { signal: AbortSignal.timeout(10_000) });
        if (!res.ok) return { events: [] as RSSEventWithGeo[], rawHeadlines: [] as RawArticle[] };
        const xml = await res.text();
        const items = parseXML(xml);

        const events: RSSEventWithGeo[] = [];
        const rawHeadlines: RawArticle[] = [];

        for (const item of items.slice(0, 12)) {
          const category = categoriseHeadline(item.title, feed.category);
          if (!category) continue; // altcoin / slop gate (unchanged)
          const time = item.pubDate ? Math.floor(new Date(item.pubDate).getTime() / 1000) : Math.floor(Date.now() / 1000);

          // Collect raw article for batch classification
          rawHeadlines.push({
            title:               item.title,
            description:         item.description,
            link:                item.link,
            source:              feed.name,
            feedUrl:             feed.url,
            feedDefaultCategory: category, // from categoriseHeadline gate — used as low-conf fallback
            time,
          });

          // Geolocated items also go to events (coords spread later — unchanged)
          const geo = geolocate(item.title);
          if (geo) {
            events.push({
              title:    item.title,
              category,
              source:   feed.name,
              link:     item.link,
              time,
              lat:      geo.lat,
              lon:      geo.lon,
              _baseLat: geo._baseLat,
              _baseLon: geo._baseLon,
              _geoKey:  geo._geoKey,
              _cities:  geo._cities,
            });
          }
        }

        return { events, rawHeadlines };
      } catch {
        return { events: [] as RSSEventWithGeo[], rawHeadlines: [] as RawArticle[] };
      }
    })
  );

  for (const result of results) {
    if (result.status === 'fulfilled') {
      allEvents.push(...result.value.events);
      allRawHeadlines.push(...result.value.rawHeadlines);
    }
  }

  allEvents.sort((a, b) => b.time - a.time);
  allRawHeadlines.sort((a, b) => b.time - a.time);

  // Deduplicate, then spread markers across major cities (V2 approach — unchanged)
  const dedupedEvents = deduplicateHeadlines(allEvents).slice(0, 100) as RSSEventWithGeo[];
  distributeEventCoords(dedupedEvents);

  // Strip internal geo fields before caching
  const cleanEvents: RSSEvent[] = dedupedEvents.map(({ title, category, source, link, time, lat, lon }) => ({
    title, category, source, link, time, lat, lon,
  }));

  // Deduplicate raw headlines then run classification pipeline.
  // classifyArticles() returns keyword results immediately; Grok results
  // are written to the DB cache async and available on the next refresh.
  const dedupedRaw = deduplicateHeadlines(allRawHeadlines).slice(0, 150);
  const classifiedHeadlines = await classifyArticles(dedupedRaw);

  const result = {
    events: cleanEvents,
    headlines: classifiedHeadlines,
  };

  _cache = result;
  _cacheTime = Date.now();

  return result;
}

// Keep legacy exports for backward compat
export async function fetchRSSEvents(): Promise<RSSEvent[]> {
  return (await fetchRSSAll()).events;
}

export async function fetchRSSHeadlines(): Promise<ClassifiedArticle[]> {
  return (await fetchRSSAll()).headlines;
}
