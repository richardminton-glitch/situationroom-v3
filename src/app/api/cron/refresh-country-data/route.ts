import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const CRON_SECRET = process.env.CRON_SECRET || '';
const NINJAS_KEY = process.env.API_NINJAS_KEY || '';
const NINJAS_BASE = 'https://api.api-ninjas.com/v1';

async function ninjaFetch(endpoint: string): Promise<unknown> {
  const res = await fetch(`${NINJAS_BASE}${endpoint}`, {
    headers: { 'X-Api-Key': NINJAS_KEY },
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`API Ninjas ${endpoint}: ${res.status}`);
  return res.json();
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

// API Ninjas uses different names for some countries
// NOTE: "Korea" returns North Korea — must use "Korea, South"
// Taiwan is not covered by API Ninjas — all data comes from seed fallback
const API_NAME_MAP: Record<string, string> = {
  'South Korea': 'Korea, South',
  'UAE': 'United Arab Emirates',
  'Czech Republic': 'Czechia',
  'Bosnia and Herz.': 'Bosnia and Herzegovina',
  'Central African Rep.': 'Central African Republic',
  "Cote d'Ivoire": 'Ivory Coast',
  'Dem. Rep. Congo': 'DR Congo',
  'Dominican Rep.': 'Dominican Republic',
  'Eq. Guinea': 'Equatorial Guinea',
  'eSwatini': 'Eswatini',
  'Falkland Is.': 'Falkland Islands',
  'North Korea': 'Korea, North',
};

/** Get the name to use for API Ninjas queries */
function apiName(countryName: string): string {
  return API_NAME_MAP[countryName] ?? countryName;
}

// Capital cities for AQI lookup (173 countries/territories)
const CAPITALS: Record<string, string> = {
  // ── Original 52 ──
  US: 'Washington', GB: 'London', DE: 'Berlin', FR: 'Paris', IT: 'Rome',
  CA: 'Ottawa', JP: 'Tokyo', CN: 'Beijing', IN: 'New Delhi', RU: 'Moscow',
  BR: 'Brasilia', ZA: 'Pretoria', SA: 'Riyadh', AE: 'Abu Dhabi', EG: 'Cairo',
  ET: 'Addis Ababa', IR: 'Tehran', AU: 'Canberra', KR: 'Seoul', MX: 'Mexico City',
  ID: 'Jakarta', TR: 'Ankara', AR: 'Buenos Aires', NG: 'Abuja', PL: 'Warsaw',
  NL: 'Amsterdam', CH: 'Bern', SE: 'Stockholm', NO: 'Oslo', ES: 'Madrid',
  TH: 'Bangkok', VN: 'Hanoi', MY: 'Kuala Lumpur', PH: 'Manila', PK: 'Islamabad',
  BD: 'Dhaka', CO: 'Bogota', CL: 'Santiago', PE: 'Lima', SG: 'Singapore',
  IL: 'Jerusalem', TW: 'Taipei', NZ: 'Wellington', IE: 'Dublin', DK: 'Copenhagen',
  BE: 'Brussels', AT: 'Vienna', CZ: 'Prague', GR: 'Athens', PT: 'Lisbon',
  KE: 'Nairobi', GH: 'Accra',
  // ── New 121 (seed-country-data-125) ──
  AF: 'Kabul', AL: 'Tirana', DZ: 'Algiers', AO: 'Luanda', AM: 'Yerevan',
  AZ: 'Baku', BS: 'Nassau', BY: 'Minsk', BZ: 'Belmopan', BJ: 'Porto-Novo',
  BT: 'Thimphu', BO: 'Sucre', BA: 'Sarajevo', BW: 'Gaborone', BN: 'Bandar Seri Begawan',
  BG: 'Sofia', BF: 'Ouagadougou', BI: 'Gitega', KH: 'Phnom Penh', CM: 'Yaounde',
  CF: 'Bangui', CG: 'Brazzaville', CR: 'San Jose', CI: 'Yamoussoukro', HR: 'Zagreb',
  CU: 'Havana', CY: 'Nicosia', CD: 'Kinshasa', DJ: 'Djibouti', DO: 'Santo Domingo',
  EC: 'Quito', SV: 'San Salvador', GQ: 'Malabo', ER: 'Asmara', EE: 'Tallinn',
  SZ: 'Mbabane', FJ: 'Suva', FI: 'Helsinki', GA: 'Libreville', GM: 'Banjul',
  GE: 'Tbilisi', GT: 'Guatemala City', GN: 'Conakry', GW: 'Bissau', GY: 'Georgetown',
  HT: 'Port-au-Prince', HN: 'Tegucigalpa', HU: 'Budapest', IS: 'Reykjavik', IQ: 'Baghdad',
  JM: 'Kingston', JO: 'Amman', KZ: 'Astana', KW: 'Kuwait City', KG: 'Bishkek',
  LA: 'Vientiane', LV: 'Riga', LB: 'Beirut', LS: 'Maseru', LR: 'Monrovia',
  LY: 'Tripoli', LT: 'Vilnius', LU: 'Luxembourg', MK: 'Skopje', MG: 'Antananarivo',
  MW: 'Lilongwe', ML: 'Bamako', MR: 'Nouakchott', MD: 'Chisinau', MN: 'Ulaanbaatar',
  ME: 'Podgorica', MA: 'Rabat', MZ: 'Maputo', MM: 'Naypyidaw', NA: 'Windhoek',
  NP: 'Kathmandu', NI: 'Managua', NE: 'Niamey', KP: 'Pyongyang', OM: 'Muscat',
  PA: 'Panama City', PG: 'Port Moresby', PY: 'Asuncion', QA: 'Doha', RO: 'Bucharest',
  RW: 'Kigali', SS: 'Juba', SN: 'Dakar', RS: 'Belgrade', SL: 'Freetown',
  SK: 'Bratislava', SI: 'Ljubljana', SB: 'Honiara', SO: 'Mogadishu', LK: 'Colombo',
  SD: 'Khartoum', SR: 'Paramaribo', SY: 'Damascus', TJ: 'Dushanbe', TZ: 'Dodoma',
  TL: 'Dili', TG: 'Lome', TT: 'Port of Spain', TN: 'Tunis', TM: 'Ashgabat',
  UG: 'Kampala', UA: 'Kyiv', UY: 'Montevideo', UZ: 'Tashkent', VU: 'Port Vila',
  VE: 'Caracas', ZM: 'Lusaka', ZW: 'Harare', PS: 'Ramallah', GL: 'Nuuk',
  NC: 'Noumea', PR: 'San Juan', FK: 'Stanley', EH: 'Laayoune',
  TD: "N'Djamena",
};

export async function GET(req: NextRequest) {
  // Auth check
  const auth = req.headers.get('authorization');
  if (!CRON_SECRET || auth !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const startMs = Date.now();
  const errors: { country: string; endpoint: string; error: string }[] = [];
  let updated = 0;

  try {
    const countries = await prisma.countryData.findMany();

    for (const c of countries) {
      const updates: Record<string, unknown> = {};
      const name = apiName(c.countryName);

      // /v1/country — returns GDP, population, urbanisation, fertility, infant mortality
      // NOTE: API Ninjas returns population in thousands and GDP in millions USD
      try {
        const data = await ninjaFetch(`/country?name=${encodeURIComponent(name)}`);
        const arr = data as Record<string, unknown>[];
        if (arr?.[0]) {
          const d = arr[0];
          if (d.gdp != null && d.population != null) {
            const popThousands = d.population as number;  // in thousands
            const gdpMillions = d.gdp as number;          // in millions USD
            updates.gdpPerCap = Math.round((gdpMillions * 1000) / popThousands);
            updates.population = BigInt(Math.round(popThousands * 1000));
          }
          if (d.gdp_growth != null) updates.gdpGrowth = d.gdp_growth as number;
          if (d.urban_population != null) updates.urbanPct = d.urban_population as number;
          if (d.fertility_rate != null) updates.fertility = d.fertility_rate as number;
          if (d.infant_mortality != null) updates.infantMort = d.infant_mortality as number;
          if (d.unemployment != null) updates.unemployment = d.unemployment as number;
        }
      } catch (e) {
        errors.push({ country: c.countryCode, endpoint: '/country', error: String(e) });
      }

      await sleep(250);

      // /v1/inflation — CPI annual rate
      try {
        const data = await ninjaFetch(`/inflation?country=${encodeURIComponent(name)}`);
        const arr = data as Record<string, unknown>[];
        if (arr?.[0]?.yearly_rate_pct != null) {
          updates.inflation = arr[0].yearly_rate_pct as number;
        }
      } catch (e) {
        errors.push({ country: c.countryCode, endpoint: '/inflation', error: String(e) });
      }

      await sleep(250);

      // /v1/interestrate — central bank rate
      // API Ninjas returns { central_bank_rate: number, country: string }
      try {
        const data = await ninjaFetch(`/interestrate?country=${encodeURIComponent(name)}`);
        const arr = data as Record<string, unknown>[];
        if (arr?.[0]?.central_bank_rate != null) {
          updates.cbRate = arr[0].central_bank_rate as number;
        }
      } catch (e) {
        errors.push({ country: c.countryCode, endpoint: '/interestrate', error: String(e) });
      }

      await sleep(250);

      // /v1/airquality — AQI for capital city
      const capital = CAPITALS[c.countryCode];
      if (capital) {
        try {
          const data = await ninjaFetch(`/airquality?city=${encodeURIComponent(capital)}`);
          const obj = data as Record<string, unknown>;
          if (obj?.overall_aqi != null) {
            updates.aqi = obj.overall_aqi as number;
            const aqiVal = obj.overall_aqi as number;
            updates.aqiLabel = aqiVal <= 50 ? 'Good' : aqiVal <= 100 ? 'Moderate' : aqiVal <= 150 ? 'Unhealthy (Sensitive)' : aqiVal <= 200 ? 'Unhealthy' : aqiVal <= 300 ? 'Very Unhealthy' : 'Hazardous';
          }
        } catch (e) {
          errors.push({ country: c.countryCode, endpoint: '/airquality', error: String(e) });
        }
      }

      // Apply updates
      if (Object.keys(updates).length > 0) {
        await prisma.countryData.update({
          where: { id: c.id },
          data: updates,
        });
        updated++;
      }

      await sleep(200); // rate limit buffer between countries
    }

    const durationMs = Date.now() - startMs;

    return NextResponse.json({
      ok: true,
      updated,
      total: countries.length,
      errors: errors.length,
      errorDetails: errors.slice(0, 20),
      durationMs,
    });
  } catch (err) {
    console.error('[refresh-country-data] Fatal error:', err);
    return NextResponse.json({ error: 'Refresh failed', details: String(err) }, { status: 500 });
  }
}
