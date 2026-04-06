# Missing Country Data — Compilation Brief

## Context
The Situation Room v3 Global Map uses a TopoJSON with 177 territories. We currently have data for 52 countries. This brief covers the remaining **125 territories** that need data compiled.

## Output Format
The output should be a **TypeScript array** that can be directly pasted into `prisma/seed-country-data.ts`. Each entry must match this exact interface:

```typescript
interface CountrySeed {
  countryCode: string;      // ISO 3166-1 alpha-2 (e.g. "AF")
  countryName: string;      // Full name matching TopoJSON (see mapping below)
  isoNumeric: number;       // ISO 3166-1 numeric (e.g. 4 for Afghanistan)
  capital: string;
  region: string;           // e.g. "Central Asia", "West Africa", "Caribbean"
  areaKm2: number;
  currency: string;         // ISO 4217 code (e.g. "AFN")
  language: string;         // Primary language(s) (e.g. "Pashto/Dari")
  population: number;       // In units, not thousands (e.g. 41000000)
  medianAge: number;        // Years (e.g. 18.4)
  lifeExp: number;          // Years (e.g. 64.8)
  hdi: number;              // UNDP HDI 0.000–1.000 (e.g. 0.478)
  giniIndex: number | null; // World Bank Gini 0–100, null if unavailable
  corruption: number;       // Transparency International CPI 0–100
  freedomScore: number;     // Heritage Economic Freedom 0–100
  democracy: number;        // EIU Democracy Index 0–10
  peaceRank: number;        // Global Peace Index rank 1–163
  pressRank: number;        // RSF Press Freedom rank 1–180
  debtPct: number;          // Government debt as % of GDP
  co2PerCap: number;        // CO2 emissions tonnes per capita
  forestPct: number;        // Forest area as % of land
  homicideRate: number;     // Intentional homicides per 100,000
  trivia: string;           // One interesting fact, max ~100 chars
}
```

And a matching entry in the `LIVE_FALLBACKS` object:

```typescript
// Key is countryCode (ISO alpha-2)
{
  gdpPerCap: number;     // GDP per capita USD (e.g. 507)
  gdpGrowth: number;     // Annual GDP growth % (e.g. -3.0)
  inflation: number;     // CPI annual % (e.g. 5.6)
  unemployment: number;  // % of labor force (e.g. 11.7)
  cbRate: number;        // Central bank policy rate % (e.g. 15.0)
  urbanPct: number;      // Urban population % (e.g. 26)
  fertility: number;     // Total fertility rate (e.g. 4.18)
  infantMort: number;    // Infant deaths per 1,000 live births (e.g. 47.0)
}
```

## Data Sources (prefer 2023/2024 data)
- **GDP, population, growth, inflation, unemployment**: World Bank WDI, IMF WEO
- **HDI**: UNDP Human Development Report 2024
- **Gini**: World Bank (null if no data within last 10 years)
- **Corruption**: Transparency International CPI 2024
- **Economic Freedom**: Heritage Foundation Index 2024
- **Democracy**: EIU Democracy Index 2024
- **Peace**: Global Peace Index 2024
- **Press Freedom**: RSF World Press Freedom Index 2024
- **Debt-to-GDP**: IMF Fiscal Monitor
- **CO2**: Global Carbon Project / Our World in Data
- **Forest**: World Bank / FAO
- **Homicide**: UNODC
- **CB Rate**: Central bank websites
- **Fertility, Infant Mortality, Life Expectancy, Median Age**: UN Population Division
- **Urban %**: World Bank

## Countries Needed (125)

Each entry below shows: `isoNumeric | TopoJSON name | ISO alpha-2`

### Real Countries (108)

```
004 | Afghanistan          | AF
008 | Albania              | AL
012 | Algeria              | DZ
024 | Angola               | AO
051 | Armenia              | AM
031 | Azerbaijan           | AZ
044 | Bahamas              | BS
112 | Belarus              | BY
084 | Belize               | BZ
204 | Benin                | BJ
064 | Bhutan               | BT
068 | Bolivia              | BO
070 | Bosnia and Herz.     | BA
072 | Botswana             | BW
096 | Brunei               | BN
100 | Bulgaria             | BG
854 | Burkina Faso         | BF
108 | Burundi              | BI
116 | Cambodia             | KH
120 | Cameroon             | CM
140 | Central African Rep. | CF
148 | Chad                 | TD
178 | Congo                | CG  (Republic of Congo, NOT DRC)
188 | Costa Rica           | CR
384 | Cote d'Ivoire        | CI
191 | Croatia              | HR
192 | Cuba                 | CU
196 | Cyprus               | CY
180 | Dem. Rep. Congo      | CD
262 | Djibouti             | DJ
214 | Dominican Rep.       | DO
218 | Ecuador              | EC
222 | El Salvador          | SV
226 | Eq. Guinea           | GQ
232 | Eritrea              | ER
233 | Estonia              | EE
748 | eSwatini             | SZ
242 | Fiji                 | FJ
246 | Finland              | FI
266 | Gabon                | GA
270 | Gambia               | GM
268 | Georgia              | GE
320 | Guatemala            | GT
324 | Guinea               | GN
624 | Guinea-Bissau        | GW
328 | Guyana               | GY
332 | Haiti                | HT
340 | Honduras             | HN
348 | Hungary              | HU
352 | Iceland              | IS
368 | Iraq                 | IQ
388 | Jamaica              | JM
400 | Jordan               | JO
398 | Kazakhstan           | KZ
414 | Kuwait               | KW
417 | Kyrgyzstan           | KG
418 | Laos                 | LA
428 | Latvia               | LV
422 | Lebanon              | LB
426 | Lesotho              | LS
430 | Liberia              | LR
434 | Libya                | LY
440 | Lithuania            | LT
442 | Luxembourg           | LU
807 | Macedonia            | MK  (North Macedonia)
450 | Madagascar           | MG
454 | Malawi               | MW
466 | Mali                 | ML
478 | Mauritania           | MR
498 | Moldova              | MD
496 | Mongolia             | MN
499 | Montenegro           | ME
504 | Morocco              | MA
508 | Mozambique           | MZ
104 | Myanmar              | MM
516 | Namibia              | NA
524 | Nepal                | NP
558 | Nicaragua            | NI
562 | Niger                | NE
408 | North Korea          | KP
512 | Oman                 | OM
591 | Panama               | PA
598 | Papua New Guinea     | PG
600 | Paraguay             | PY
634 | Qatar                | QA
642 | Romania              | RO
646 | Rwanda               | RW
728 | S. Sudan             | SS  (South Sudan)
686 | Senegal              | SN
688 | Serbia               | RS
694 | Sierra Leone         | SL
703 | Slovakia             | SK
705 | Slovenia             | SI
706 | Somalia              | SO
144 | Sri Lanka            | LK
729 | Sudan                | SD
740 | Suriname             | SR
760 | Syria                | SY
762 | Tajikistan           | TJ
834 | Tanzania             | TZ
626 | Timor-Leste          | TL
768 | Togo                 | TG
780 | Trinidad and Tobago  | TT
788 | Tunisia              | TN
795 | Turkmenistan         | TM
800 | Uganda               | UG
804 | Ukraine              | UA
858 | Uruguay              | UY
860 | Uzbekistan           | UZ
548 | Vanuatu              | VU
862 | Venezuela            | VE
887 | Yemen                | YE
894 | Zambia               | ZM
716 | Zimbabwe             | ZW
```

### Dependent/Disputed Territories (skip or minimal data)

These appear in the TopoJSON but are NOT sovereign states. For these, provide **best-effort data** using the parent country's metrics where applicable. Set `corruption`, `freedomScore`, `democracy`, `peaceRank`, `pressRank` to the parent country values. If truly no data exists, omit the entry entirely.

```
090 | Solomon Is.              | SB  (sovereign — include full data)
275 | Palestine                | PS  (include — use Palestinian Authority data)
304 | Greenland                | GL  (Danish territory — use Denmark metrics where needed)
540 | New Caledonia            | NC  (French territory — use France metrics where needed)
630 | Puerto Rico              | PR  (US territory — use US metrics where needed)
238 | Falkland Is.             | FK  (UK territory — minimal, ~3,500 pop)
010 | Antarctica               | AQ  (skip entirely)
260 | Fr. S. Antarctic Lands   | TF  (skip entirely)
732 | W. Sahara                | EH  (disputed — use Morocco metrics)
    | Kosovo                   | XK  (no ISO numeric in TopoJSON — skip if undefined)
    | N. Cyprus                | --  (no ISO numeric — skip if undefined)
    | Somaliland               | --  (no ISO numeric — skip if undefined)
```

## Example Entry (copy this format exactly)

In the `COUNTRIES` array:
```typescript
{ countryCode: 'AF', countryName: 'Afghanistan', isoNumeric: 4, capital: 'Kabul', region: 'Central Asia', areaKm2: 652230, currency: 'AFN', language: 'Pashto/Dari', population: 41100000, medianAge: 18.4, lifeExp: 64.8, hdi: 0.478, giniIndex: null, corruption: 20, freedomScore: 32.4, democracy: 0.32, peaceRank: 163, pressRank: 152, debtPct: 7, co2PerCap: 0.2, forestPct: 2.1, homicideRate: 6.7, trivia: 'One of the youngest populations in the world with a median age of 18.' },
```

In the `LIVE_FALLBACKS` object:
```typescript
AF: { gdpPerCap: 380, gdpGrowth: -3.0, inflation: 5.6, unemployment: 11.7, cbRate: 5.00, urbanPct: 26, fertility: 4.18, infantMort: 47.0 },
```

## IMPORTANT NOTES

1. **countryName MUST match what the COUNTRY_NAMES lookup uses** — check `src/components/panels/globes/country-names.ts` for the mapping from ISO numeric to display name. The DB `countryName` should be the full proper name (not the TopoJSON abbreviation).

2. **isoNumeric must be a plain number** (e.g. `4` not `004`). It must match the TopoJSON feature `id` when parsed as an integer.

3. **population must be in units** (e.g. 41100000 for 41.1 million), NOT thousands.

4. For small island nations or territories with truly no data for a field, use reasonable estimates or parent-country values. Never leave a numeric field as `null` except `giniIndex`.

5. The trivia field should be interesting, Bitcoin/crypto-relevant where possible, or geopolitically notable. Keep under ~120 characters.

6. Verify the `countryCode` (alpha-2) is correct for each — some territories use non-standard codes (e.g. Kosovo = XK, not officially in ISO).

## Delivery

Provide TWO code blocks:
1. The `COUNTRIES` array entries (TypeScript, one per line, same format as existing entries)
2. The `LIVE_FALLBACKS` entries (TypeScript, one per line)

These will be appended to the existing arrays in `prisma/seed-country-data.ts`.
