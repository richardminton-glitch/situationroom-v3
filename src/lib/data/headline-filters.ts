/**
 * Headline filtering — ported from V2.
 * Bitcoin-only (no altcoins/shitcoins), slop removal, deduplication.
 */

// ═══════════════════════════════════════════════════════════
// EXCLUSION PATTERNS — headlines matching these are rejected
// ═══════════════════════════════════════════════════════════

const EXCLUDE_PATTERNS: { pattern: RegExp; unless?: RegExp }[] = [
  // Altcoins & shitcoins
  {
    pattern: /\b(ethereum|eth\b|solana|sol\b|cardano|ada\b|polkadot|dot\b|avalanche|avax|polygon|matic|chainlink|link\b|dogecoin|doge|shiba|pepe coin|meme ?coin|altcoin|altseason|defi|nft|airdrop|token launch|token sale|ico\b|ido\b|staking reward|yield farm|liquidity pool|dex\b|dapp|dao\b|smart contract|web3|metaverse|gamefi|play.to.earn)\b/i,
  },
  // Stablecoins (unless regulatory)
  {
    pattern: /\b(tether|usdt|usdc|stablecoin|busd)\b/i,
    unless: /\b(regulat|ban|seize|lawsuit|fraud|reserve|audit|congress|sec|cftc)\b/i,
  },
  // Exchange drama (unless legal/collapse)
  {
    pattern: /\b(binance|coinbase|kraken|okx|bybit)\b/i,
    unless: /\b(sec|lawsuit|hack|fraud|fine|regulat|ban|collapse|insolven|bankrupt|subpoena|arrest|charged)\b/i,
  },
  // Generic "crypto" without bitcoin
  {
    pattern: /\bcrypto\b(?!.*\bbitcoin\b)(?!.*\bbtc\b)/i,
  },
  // Analyst price targets & stock ratings
  {
    pattern: /\b(price target|stock rating|outperform|underperform|overweight|underweight|buy rating|sell rating|hold rating|neutral rating)\b/i,
  },
  {
    pattern: /\b(TD Cowen|Stifel|Barclays|Citi|JPMorgan|Goldman|Morgan Stanley|BofA|UBS|Deutsche Bank|HSBC|Jefferies|Piper Sandler|Wedbush|Canaccord)\b.*\b(target|rating|upgrade|downgrade)\b/i,
  },
  // Company earnings
  {
    pattern: /\b(Q[1-4] (earnings|results)|quarterly (results|earnings)|annual (results|earnings)|EPS (beats?|miss)|earnings (beat|miss|surprise))\b/i,
  },
  // Sponsored/PR
  {
    pattern: /\b(sponsored|press release|advertorial|partner content|promoted)\b/i,
  },
  // CoinDesk indices (not Bitcoin)
  {
    pattern: /\b(CoinDesk 20|CoinDesk 50|CoinDesk.*index)\b/i,
  },
];

// ═══════════════════════════════════════════════════════════
// SLOP PATTERNS — clickbait, lifestyle, entertainment noise
// ═══════════════════════════════════════════════════════════

const SLOP_PATTERNS: RegExp[] = [
  // Lifestyle clickbait
  /\b(how I retired|passive income|side hustle|my Airbnb|quit my job|work from home hack)/i,
  // Advice columns
  /\b(Dear Abby|should I dump|am I wrong|ask a therapist|relationship advice)/i,
  // Food & recipes
  /\b(recipe for|best restaurants|air fryer|meal prep|instant pot|baking tips|cookbook)/i,
  // Celebrity gossip
  /\b(Kardashian|Jenner|Bieber|red carpet|Wordle|reality TV|celebrity couple)/i,
  /\bSwift\b(?!.*\b(economy|market|bank|rate|inflation|sanctions)\b)/i,
  /\bOscars?\b(?!.*\b(scandal|boycott|controversy|protest)\b)/i,
  // Horoscopes & wellness
  /\b(horoscope|zodiac|mercury retrograde|crystal healing|manifesting|chakra|astrology)/i,
  // Sports (unless economic angle)
  /\b(fantasy football|NFL.*score|NBA.*score|MLB.*score|Super Bowl)\b(?!.*\b(economy|ad revenue|betting|gambling|stadium.*tax)\b)/i,
  /\bLebron\b(?!.*\b(politic|protest|activism|china)\b)/i,
  // Listicles & clickbait
  /\b(\d+ ways|you won't believe|one weird trick|shocking reason|doctors hate|this one thing)/i,
  // Shopping & deals
  /\b(Amazon deals|best deals|price drop|Black Friday|Cyber Monday|coupon code|flash sale)/i,
  /\b(Black Friday)\b(?!.*\b(retail sales|consumer spending|economic)\b)/i,
  // Pet fluff
  /\b(cutest dog|adopted a kitten|pet care tips|puppy|rescue animal)/i,
  // Health & fitness
  /\b(weight loss|keto diet|diet tips|skincare routine|anti.aging)/i,
  /\b(skincare|weight loss)\b(?!.*\b(regulat|lawsuit|FDA|recall)\b)/i,
  // Travel fluff
  /\b(best beaches|hidden destinations?|travel hacks?|flight deals|vacation tips)/i,
  // Tech gadgets
  /\b(iPhone review|iOS update|Android update|Samsung Galaxy.*review)/i,
  /\bTikTok\b(?!.*\b(ban|regulat|congress|national security|lawsuit)\b)/i,
  /\bgaming\b(?!.*\b(antitrust|FTC|monopoly|acquisition.*regulat)\b)/i,
  // Car reviews
  /\b(Tesla|Toyota|Ford|BMW|Mercedes).*\breview\b/i,
  /\b(Tesla|Toyota|Ford)\b(?!.*\b(layoff|strike|tariff|recall|investigation|NHTSA|union)\b).*\b(review|test drive|range test)\b/i,
  // Real estate fluff
  /\b(dream home|tiny house|home renovation|interior design|HGTV)/i,
  // Parenting
  /\b(parenting tips|homework hacks|back to school|mom hack|dad hack)/i,
  // Obituaries (unless politically significant)
  /\bdies at \d+\b(?!.*(president|prime minister|PM|leader|senator|general|dictator|monarch|king|queen))/i,
  // Viral/meme noise
  /\b(goes viral|internet reacts|claps back|opinion:|letter to (the )?editor|hot take)/i,
];

// ═══════════════════════════════════════════════════════════
// BITCOIN-ONLY CATEGORY MATCH
// ═══════════════════════════════════════════════════════════

const BITCOIN_PATTERN = /\b(bitcoin|btc|satoshi|lightning network|halving|block reward|hash ?rate|mining pool|mempool|utxo|segwit|taproot|ordinal|inscription|nostr|sats|hodl|cold storage|hardware wallet|seed phrase|node runner|full node|bitcoin etf|btc etf|michael saylor|microstrategy|el salvador.*bitcoin|strike app|swan bitcoin|river financial|unchained|trezor|ledger.*bitcoin|bitaxe|bitcoin reserve|strategic reserve.*btc|spot etf|grayscale.*btc|bitwise.*bitcoin|ark.*bitcoin|fidelity.*bitcoin)\b/i;

// ═══════════════════════════════════════════════════════════
// CATEGORY PATTERNS — strict, no default fallback
// ═══════════════════════════════════════════════════════════

const CATEGORY_PATTERNS: { category: string; pattern: RegExp }[] = [
  {
    category: 'bitcoin',
    pattern: BITCOIN_PATTERN,
  },
  {
    category: 'conflict',
    pattern: /\b(war|missile|airstrike|bombing|troops|invasion|military|attack|killed|casualties|strike|drone|assassination|hostage|siege|artillery|ceasefire|NATO|soldiers|weapon|nuclear|sanctions.*war|terrorist|insurgent|rebel|militia|sniper|shelling|ambush|coup|martial law)\b/i,
  },
  {
    category: 'disaster',
    pattern: /\b(earthquake|hurricane|flood|wildfire|tsunami|volcano|storm|drought|tornado|cyclone|pandemic|outbreak|evacuation|explosion|collapse|famine|landslide|blizzard)\b/i,
  },
  {
    category: 'economy',
    pattern: /\b(fed\b|federal reserve|inflation|gdp|recession|trade war|tariff|sanctions|economy|market|banking|interest rate|central bank|treasury|deficit|debt ceiling|unemployment|jobs report|CPI|PPI|retail sales|housing|mortgage|stock|bond|yield|commodity|oil price|gold price|dollar|euro|yen|yuan|currency|forex|monetary policy|fiscal|bailout|default|credit rating)\b/i,
  },
  {
    category: 'political',
    pattern: /\b(election|vote|parliament|congress|president|minister|law|regulation|legislation|senate|supreme court|ruling|treaty|diplomat|embassy|summit|UN\b|G7|G20|EU\b|NATO|executive order|impeach|indictment|referendum)\b/i,
  },
];

// ═══════════════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════════════

function isExcluded(title: string): boolean {
  for (const { pattern, unless } of EXCLUDE_PATTERNS) {
    if (pattern.test(title)) {
      if (unless && unless.test(title)) continue; // exception applies
      return true;
    }
  }
  return false;
}

function isSlop(title: string): boolean {
  if (title.length < 15) return true;
  if (title.length > 30 && title === title.toUpperCase()) return true;
  return SLOP_PATTERNS.some((p) => p.test(title));
}

export function categoriseHeadline(title: string, feedDefaultCategory: string): string | null {
  // Reject excluded content
  if (isExcluded(title)) return null;

  // Reject slop
  if (isSlop(title)) return null;

  // Try strict category match
  for (const { category, pattern } of CATEGORY_PATTERNS) {
    if (pattern.test(title)) return category;
  }

  // If feed has a default category AND it's not bitcoin (bitcoin must match strictly)
  if (feedDefaultCategory && feedDefaultCategory !== 'bitcoin') {
    return feedDefaultCategory;
  }

  // No match, no default — reject
  return null;
}

export function deduplicateHeadlines<T extends { title: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (!item.title) return false;
    // Use first 50 chars lowercased as dedup key
    const key = item.title.toLowerCase().substring(0, 50);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
