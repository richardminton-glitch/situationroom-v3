/**
 * Dead currencies — the cemetery dataset.
 *
 * A representative sample of ~60 fiat (and a few commodity-backed)
 * currencies that have died since 1700. Sources: Bureau of Engraving
 * & Printing histories, central-bank archives, IMF working papers on
 * currency reforms, and Wikipedia's hyperinflation list cross-checked
 * against academic monetary histories.
 *
 * The point of the dataset is not exhaustiveness — it is the visceral
 * scale of the graveyard. Every entry has a real-world cause of death.
 *
 * Conventions:
 *   - born/died are years; "Born" of a successor currency = "Died" of
 *     its predecessor.
 *   - cause is one of: 'hyperinflation' | 'redenomination' | 'union' |
 *     'collapse' | 'replaced' (orderly retirement). Tracked so the
 *     interactive can colour-code the headstones.
 *   - country is the ISO English short name at time of death.
 */

export type DeathCause =
  | 'hyperinflation'   // print until worthless — the canonical fiat death
  | 'redenomination'   // chopped zeros off; technically retired
  | 'union'            // absorbed by a monetary union (e.g. → euro)
  | 'collapse'         // war / dissolution of issuing state
  | 'replaced';        // orderly retirement / standard switch

export interface DeadCurrency {
  name:    string;
  symbol?: string;
  country: string;
  born:    number;
  died:    number;
  cause:   DeathCause;
  /** One-sentence cause of death, shown on hover. */
  story:   string;
}

export const DEAD_CURRENCIES: DeadCurrency[] = [
  // ── Hyperinflation deaths — the textbook cases ──────────────────────
  { name: 'Reichsmark',                     country: 'Weimar Germany', born: 1924, died: 1948, cause: 'hyperinflation',
    story: 'Successor to the Papiermark; survived rebuilding only to dissolve in postwar reform.' },
  { name: 'Papiermark',                     country: 'Weimar Germany', born: 1914, died: 1923, cause: 'hyperinflation',
    story: 'Wheelbarrows of cash to buy bread. Inflation peaked at 29,500% per month in October 1923.' },
  { name: 'Hungarian pengő',                country: 'Hungary',        born: 1927, died: 1946, cause: 'hyperinflation',
    story: 'The worst hyperinflation in recorded history. Prices doubled every 15 hours by July 1946.' },
  { name: 'Yugoslav dinar (1990s)',         country: 'Yugoslavia',     born: 1944, died: 1994, cause: 'hyperinflation',
    story: '5 × 10^15 per cent inflation in 1993. Five redenominations in three years; the last at 1:13 trillion.' },
  { name: 'Zimbabwean dollar',              country: 'Zimbabwe',       born: 1980, died: 2009, cause: 'hyperinflation',
    story: 'Hit 89.7 sextillion per cent inflation in November 2008. The 100-trillion-dollar note became a meme.' },
  { name: 'Venezuelan bolívar',             country: 'Venezuela',      born: 1879, died: 2008, cause: 'hyperinflation',
    story: 'Replaced by the bolívar fuerte; that died in 2018; its successor is on its third redenomination.' },
  { name: 'Bolívar fuerte',                 country: 'Venezuela',      born: 2008, died: 2018, cause: 'hyperinflation',
    story: 'Lasted ten years before being replaced by the bolívar soberano. Both died of the same disease.' },
  { name: 'Bolívar soberano',               country: 'Venezuela',      born: 2018, died: 2021, cause: 'redenomination',
    story: 'Six zeros lopped off. Renamed bolívar digital. Same disease, different label.' },
  { name: 'Greek drachma (Civil War)',      country: 'Greece',         born: 1944, died: 1953, cause: 'hyperinflation',
    story: 'October 1944 inflation peaked at 13,800% per month. Rebuilt postwar, then died into the new drachma.' },
  { name: 'Argentine peso ley',             country: 'Argentina',      born: 1970, died: 1983, cause: 'hyperinflation',
    story: 'One of four Argentine currencies dead within twenty years. Became the peso argentino at 10,000:1.' },
  { name: 'Peso argentino',                 country: 'Argentina',      born: 1983, died: 1985, cause: 'hyperinflation',
    story: 'Lasted two years. Replaced by the austral.' },
  { name: 'Argentine austral',              country: 'Argentina',      born: 1985, died: 1991, cause: 'hyperinflation',
    story: 'Replaced by the convertible peso, pegged 1:1 to the dollar. The peg lasted until 2002.' },
  { name: 'Chinese gold yuan',              country: 'Republic of China', born: 1948, died: 1949, cause: 'hyperinflation',
    story: 'Issued by Chiang Kai-shek\'s government; collapsed within 12 months. Helped lose the civil war.' },
  { name: 'Brazilian cruzeiro novo',        country: 'Brazil',         born: 1967, died: 1986, cause: 'hyperinflation',
    story: 'One of six Brazilian currencies that died between 1942 and 1994. Successor: cruzado.' },
  { name: 'Brazilian cruzado',              country: 'Brazil',         born: 1986, died: 1989, cause: 'hyperinflation',
    story: 'Three years. Replaced by cruzado novo, which lasted nine months.' },
  { name: 'Brazilian cruzado novo',         country: 'Brazil',         born: 1989, died: 1990, cause: 'hyperinflation',
    story: 'Nine months. Renamed cruzeiro (recycled name, third time).' },
  { name: 'Brazilian cruzeiro real',        country: 'Brazil',         born: 1993, died: 1994, cause: 'hyperinflation',
    story: 'Twelve months. Finally tamed by the Real Plan; the real has held since 1994.' },
  { name: 'Peruvian inti',                  country: 'Peru',           born: 1985, died: 1991, cause: 'hyperinflation',
    story: '7,650% inflation in 1990. Replaced by the nuevo sol after lopping six zeros.' },
  { name: 'Bolivian peso',                  country: 'Bolivia',        born: 1963, died: 1987, cause: 'hyperinflation',
    story: '24,000% inflation in 1985. Replaced by the boliviano.' },
  { name: 'Nicaraguan córdoba',             country: 'Nicaragua',      born: 1912, died: 1988, cause: 'hyperinflation',
    story: '13,109% in 1990. Replaced by the new córdoba; replaced again by córdoba oro 1991.' },
  { name: 'Polish złoty (1944)',            country: 'Poland',         born: 1944, died: 1995, cause: 'redenomination',
    story: '10,000:1 exchange to the new złoty after years of communist-era inflation.' },
  { name: 'Belarusian ruble (old)',         country: 'Belarus',        born: 1992, died: 2016, cause: 'redenomination',
    story: 'Two redenominations in 16 years. The most recent: 10,000:1.' },
  { name: 'Romanian leu (old)',             country: 'Romania',        born: 1947, died: 2005, cause: 'redenomination',
    story: '10,000:1 swap. The post-1947 leu was already itself the second redenominated leu of the century.' },
  { name: 'Turkish lira (old)',             country: 'Turkey',         born: 1923, died: 2005, cause: 'redenomination',
    story: 'Six zeros chopped in 2005 after decades of inflation. The new lira has now itself lost ~95% vs USD.' },
  { name: 'Israeli pound',                  country: 'Israel',         born: 1948, died: 1980, cause: 'hyperinflation',
    story: 'Replaced by the shekel after years of high inflation; the shekel itself was redenominated 1985.' },

  // ── Monetary union deaths (orderly absorption) ──────────────────────
  { name: 'Deutsche Mark',                  country: 'Germany',        born: 1948, died: 2002, cause: 'union',
    story: 'Postwar Germany\'s sound-money flagship. Surrendered to the euro at 1.95583:1.' },
  { name: 'French franc',                   country: 'France',         born: 1795, died: 2002, cause: 'union',
    story: '207 years old, replaced by the euro. The franc had itself been redenominated 1960 (100:1).' },
  { name: 'Italian lira',                   country: 'Italy',          born: 1861, died: 2002, cause: 'union',
    story: 'Italy\'s post-unification currency. Joined the euro at 1936.27:1.' },
  { name: 'Spanish peseta',                 country: 'Spain',          born: 1869, died: 2002, cause: 'union',
    story: 'Replaced the escudo. Replaced by the euro at 166.386:1.' },
  { name: 'Dutch guilder',                  country: 'Netherlands',    born: 1814, died: 2002, cause: 'union',
    story: 'One of the world\'s oldest currencies before the euro. 2.20371:1 swap.' },
  { name: 'Greek drachma (modern)',         country: 'Greece',         born: 1953, died: 2002, cause: 'union',
    story: 'Postwar successor to the inflated drachma. Joined the euro at 340.75:1.' },
  { name: 'Portuguese escudo',              country: 'Portugal',       born: 1911, died: 2002, cause: 'union',
    story: 'Survived the Estado Novo; absorbed by the euro at 200.482:1.' },
  { name: 'Austrian schilling',             country: 'Austria',        born: 1925, died: 2002, cause: 'union',
    story: 'Vienna\'s post-WWI currency, twice. Final retirement at 13.7603:1 to the euro.' },
  { name: 'Belgian franc',                  country: 'Belgium',        born: 1832, died: 2002, cause: 'union',
    story: '170 years. Euro at 40.3399:1.' },
  { name: 'Luxembourgish franc',            country: 'Luxembourg',     born: 1854, died: 2002, cause: 'union',
    story: 'Pegged 1:1 to the Belgian franc since 1944. Joined the euro on the same day.' },
  { name: 'Finnish markka',                 country: 'Finland',        born: 1860, died: 2002, cause: 'union',
    story: 'Survived two world wars and a 1963 redenomination. Joined the euro at 5.94573:1.' },
  { name: 'Irish pound (punt)',             country: 'Ireland',        born: 1928, died: 2002, cause: 'union',
    story: 'Pegged to sterling until 1979. Replaced by the euro at 0.787564:1.' },
  { name: 'Estonian kroon',                 country: 'Estonia',        born: 1992, died: 2011, cause: 'union',
    story: 'Restored after independence; held a hard peg to the D-mark, then euro. Lasted 19 years.' },
  { name: 'Slovak koruna',                  country: 'Slovakia',       born: 1993, died: 2009, cause: 'union',
    story: 'Born from the dissolution of Czechoslovakia. Joined the euro at 30.126:1.' },
  { name: 'Cypriot pound',                  country: 'Cyprus',         born: 1879, died: 2008, cause: 'union',
    story: 'Survived British rule, Turkish invasion, and EU accession. Euro at 0.585274:1.' },
  { name: 'Maltese lira',                   country: 'Malta',          born: 1972, died: 2008, cause: 'union',
    story: 'One of only a handful of currencies stronger than the dollar. Euro at 0.4293:1.' },
  { name: 'Latvian lats',                   country: 'Latvia',         born: 1993, died: 2014, cause: 'union',
    story: 'Strongest currency unit in Europe by face value before joining the euro at 0.702804:1.' },
  { name: 'Lithuanian litas',               country: 'Lithuania',      born: 1993, died: 2015, cause: 'union',
    story: 'Restored after independence. Last Baltic state to join the euro.' },
  { name: 'Slovenian tolar',                country: 'Slovenia',       born: 1991, died: 2007, cause: 'union',
    story: 'Born from the breakup of Yugoslavia. First post-Yugoslav currency to join the euro.' },

  // ── State collapse / war deaths ─────────────────────────────────────
  { name: 'Confederate States dollar',      country: 'CSA',            born: 1861, died: 1865, cause: 'collapse',
    story: 'Issued by the Confederate States during the American Civil War. Worthless on the day of surrender.' },
  { name: 'Continental currency',           country: 'United States',  born: 1775, died: 1791, cause: 'hyperinflation',
    story: 'The Continental Congress\'s war finance. "Not worth a continental" entered the language.' },
  { name: 'Russian assignat',               country: 'Russian Empire', born: 1769, died: 1843, cause: 'redenomination',
    story: 'Catherine the Great\'s paper money. Eventually swapped 3.5:1 for silver-backed roubles.' },
  { name: 'Soviet rouble',                  country: 'USSR',           born: 1922, died: 1992, cause: 'collapse',
    story: 'Died with the Soviet Union. Successor states issued ~15 new currencies in 24 months.' },
  { name: 'East German mark',               country: 'East Germany',   born: 1948, died: 1990, cause: 'union',
    story: 'Reunification absorbed it into the D-Mark at 1:1 for wages — politically generous, economically ruinous.' },
  { name: 'French assignat',                country: 'France',         born: 1789, died: 1796, cause: 'hyperinflation',
    story: 'Revolutionary France\'s land-backed paper money. Lost 99% of value in seven years.' },
  { name: 'Mandate Palestinian pound',      country: 'British Mandate', born: 1927, died: 1948, cause: 'collapse',
    story: 'Died with the British Mandate. Succeeded by the Israeli pound and the Jordanian dinar.' },
  { name: 'South Vietnamese đồng',          country: 'South Vietnam',  born: 1953, died: 1975, cause: 'collapse',
    story: 'Died on the fall of Saigon. Replaced by the unified North Vietnamese đồng.' },
  { name: 'Iraqi Swiss dinar',              country: 'Iraq',           born: 1932, died: 1993, cause: 'redenomination',
    story: 'Saddam-era replacement printed in China. The Kurds kept using the old "Swiss" notes informally for years.' },
  { name: 'Yugoslav dinar (1920)',          country: 'Yugoslavia',     born: 1920, died: 1944, cause: 'collapse',
    story: 'The original Yugoslav dinar. Survived the interwar period; died in WWII.' },

  // ── Standard / regime change deaths ─────────────────────────────────
  { name: 'US gold certificate',            country: 'United States',  born: 1865, died: 1934, cause: 'replaced',
    story: 'Redeemable in gold. Killed by Roosevelt\'s gold confiscation Executive Order 6102.' },
  { name: 'US silver certificate',          country: 'United States',  born: 1878, died: 1968, cause: 'replaced',
    story: 'Redeemable in silver. Demonetised once silver-content coins exceeded face value.' },
  { name: 'British gold sovereign (currency)', country: 'United Kingdom', born: 1817, died: 1932, cause: 'replaced',
    story: 'Britain\'s last general-circulation gold coin. Withdrawn in 1932 as the gold standard ended.' },
  { name: 'Russian rouble (Tsarist gold)',  country: 'Russian Empire', born: 1897, died: 1917, cause: 'collapse',
    story: 'Witte\'s gold standard rouble. Destroyed by WWI war finance and the Revolution.' },
  { name: 'Spanish escudo',                 country: 'Spain',          born: 1864, died: 1869, cause: 'replaced',
    story: 'Brief silver-standard predecessor to the peseta.' },
  { name: 'Pre-decimal British penny',      country: 'United Kingdom', born: 1707, died: 1971, cause: 'redenomination',
    story: 'D-Day (Decimal Day) February 1971. Twelve-pence shillings retired after 264 years.' },

  // ── Notable interwar / postwar redenominations ──────────────────────
  { name: 'Mexican peso (old)',             country: 'Mexico',         born: 1864, died: 1993, cause: 'redenomination',
    story: '1,000:1 swap to the nuevo peso after decades of inflation. Renamed back to peso in 1996.' },
  { name: 'Russian rouble (1991)',          country: 'Russia',         born: 1992, died: 1998, cause: 'redenomination',
    story: 'Post-Soviet hyperinflation. 1,000:1 redenomination in 1998.' },
  { name: 'Ukrainian karbovanets',          country: 'Ukraine',        born: 1992, died: 1996, cause: 'hyperinflation',
    story: '10,256% inflation in 1993. Replaced by the hryvnia at 100,000:1.' },
  { name: 'Iceland króna (old)',            country: 'Iceland',        born: 1885, died: 1981, cause: 'redenomination',
    story: '100:1 swap to the new króna after years of high inflation.' },
];

export const TOTAL_CURRENCIES = DEAD_CURRENCIES.length;

/** Average lifespan in years across the dataset. The headline figure on
 *  the cemetery's tombstone counter. */
export function averageLifespanYears(): number {
  const total = DEAD_CURRENCIES.reduce((sum, c) => sum + (c.died - c.born), 0);
  return Math.round((total / DEAD_CURRENCIES.length) * 10) / 10;
}

/** Median is more honest for a long-tailed distribution like this — a few
 *  ancient survivors (200+ year currencies) skew the mean. Surface both. */
export function medianLifespanYears(): number {
  const lifespans = DEAD_CURRENCIES.map((c) => c.died - c.born).sort((a, b) => a - b);
  const mid = Math.floor(lifespans.length / 2);
  return lifespans.length % 2 === 0
    ? Math.round(((lifespans[mid - 1] + lifespans[mid]) / 2) * 10) / 10
    : lifespans[mid];
}
