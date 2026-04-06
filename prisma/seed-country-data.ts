/**
 * Seed script — populates the country_data table with 173 countries/territories.
 * Run: npx tsx prisma/seed-country-data.ts
 *
 * 52 original countries (G7, BRICS+, major economies) +
 * 121 additional countries/territories (remaining world coverage).
 *
 * Static fields (HDI, Gini, corruption, etc.) are hardcoded from
 * World Bank / UNDP / TI open datasets. Live fields have fallback
 * values from 2023/2024 sources — the monthly cron overwrites them
 * when API data is available, but the map is never blank.
 */

import { PrismaClient } from '@prisma/client';
import { COUNTRIES_125, LIVE_FALLBACKS_125 } from './seed-country-data-125';

const prisma = new PrismaClient();

interface CountrySeed {
  countryCode: string;
  countryName: string;
  isoNumeric: number;
  capital: string;
  region: string;
  areaKm2: number;
  currency: string;
  language: string;
  population: number;      // approximate, in units
  medianAge: number;
  lifeExp: number;
  hdi: number;
  giniIndex: number | null;
  corruption: number;       // TI CPI 0–100
  freedomScore: number;     // Heritage 0–100
  democracy: number;        // EIU 0–10
  peaceRank: number;
  pressRank: number;
  debtPct: number;
  co2PerCap: number;        // tonnes
  forestPct: number;
  homicideRate: number;     // per 100k
  trivia: string;
}

const COUNTRIES: CountrySeed[] = [
  // G7
  { countryCode: 'US', countryName: 'United States', isoNumeric: 840, capital: 'Washington D.C.', region: 'North America', areaKm2: 9833520, currency: 'USD', language: 'English', population: 334000000, medianAge: 38.5, lifeExp: 77.5, hdi: 0.921, giniIndex: 39.8, corruption: 69, freedomScore: 70.1, democracy: 7.85, peaceRank: 131, pressRank: 45, debtPct: 123, co2PerCap: 14.4, forestPct: 33.9, homicideRate: 6.4, trivia: 'Largest economy by nominal GDP and home to the world\'s reserve currency.' },
  { countryCode: 'GB', countryName: 'United Kingdom', isoNumeric: 826, capital: 'London', region: 'Europe', areaKm2: 243610, currency: 'GBP', language: 'English', population: 67700000, medianAge: 40.6, lifeExp: 80.7, hdi: 0.929, giniIndex: 35.1, corruption: 71, freedomScore: 69.9, democracy: 8.54, peaceRank: 34, pressRank: 26, debtPct: 101, co2PerCap: 5.2, forestPct: 13.2, homicideRate: 1.2, trivia: 'Home of the oldest central bank still in operation (Bank of England, 1694).' },
  { countryCode: 'DE', countryName: 'Germany', isoNumeric: 276, capital: 'Berlin', region: 'Europe', areaKm2: 357022, currency: 'EUR', language: 'German', population: 84400000, medianAge: 45.7, lifeExp: 80.6, hdi: 0.942, giniIndex: 31.7, corruption: 78, freedomScore: 73.7, democracy: 8.80, peaceRank: 16, pressRank: 21, debtPct: 66, co2PerCap: 8.1, forestPct: 32.7, homicideRate: 0.9, trivia: 'Europe\'s largest economy and the world\'s third-largest exporter.' },
  { countryCode: 'FR', countryName: 'France', isoNumeric: 250, capital: 'Paris', region: 'Europe', areaKm2: 643801, currency: 'EUR', language: 'French', population: 68100000, medianAge: 42.3, lifeExp: 82.5, hdi: 0.903, giniIndex: 32.4, corruption: 72, freedomScore: 65.7, democracy: 8.07, peaceRank: 56, pressRank: 24, debtPct: 112, co2PerCap: 4.7, forestPct: 31.4, homicideRate: 1.3, trivia: 'Most visited country in the world and second-largest economy in the EU.' },
  { countryCode: 'IT', countryName: 'Italy', isoNumeric: 380, capital: 'Rome', region: 'Europe', areaKm2: 301340, currency: 'EUR', language: 'Italian', population: 58900000, medianAge: 47.3, lifeExp: 82.9, hdi: 0.895, giniIndex: 35.2, corruption: 56, freedomScore: 64.7, democracy: 7.69, peaceRank: 32, pressRank: 41, debtPct: 145, co2PerCap: 5.7, forestPct: 32.0, homicideRate: 0.5, trivia: 'Third-largest eurozone economy with one of the highest debt-to-GDP ratios globally.' },
  { countryCode: 'CA', countryName: 'Canada', isoNumeric: 124, capital: 'Ottawa', region: 'North America', areaKm2: 9984670, currency: 'CAD', language: 'English/French', population: 40100000, medianAge: 41.1, lifeExp: 81.7, hdi: 0.935, giniIndex: 33.3, corruption: 74, freedomScore: 73.7, democracy: 8.88, peaceRank: 12, pressRank: 15, debtPct: 107, co2PerCap: 14.3, forestPct: 38.7, homicideRate: 2.0, trivia: 'Second-largest country by area and home to 20% of the world\'s fresh water.' },
  { countryCode: 'JP', countryName: 'Japan', isoNumeric: 392, capital: 'Tokyo', region: 'East Asia', areaKm2: 377975, currency: 'JPY', language: 'Japanese', population: 124500000, medianAge: 48.6, lifeExp: 84.8, hdi: 0.920, giniIndex: 32.9, corruption: 73, freedomScore: 69.3, democracy: 8.33, peaceRank: 9, pressRank: 68, debtPct: 264, co2PerCap: 8.5, forestPct: 68.4, homicideRate: 0.3, trivia: 'Highest government debt-to-GDP ratio in the developed world.' },
  // BRICS+
  { countryCode: 'CN', countryName: 'China', isoNumeric: 156, capital: 'Beijing', region: 'East Asia', areaKm2: 9596960, currency: 'CNY', language: 'Mandarin', population: 1412000000, medianAge: 39.0, lifeExp: 78.2, hdi: 0.788, giniIndex: 38.2, corruption: 42, freedomScore: 48.3, democracy: 1.94, peaceRank: 80, pressRank: 172, debtPct: 84, co2PerCap: 8.0, forestPct: 23.3, homicideRate: 0.5, trivia: 'World\'s largest population until 2023; now the second-largest manufacturing economy.' },
  { countryCode: 'IN', countryName: 'India', isoNumeric: 356, capital: 'New Delhi', region: 'South Asia', areaKm2: 3287263, currency: 'INR', language: 'Hindi/English', population: 1428000000, medianAge: 28.4, lifeExp: 70.8, hdi: 0.644, giniIndex: 35.7, corruption: 39, freedomScore: 52.9, democracy: 7.18, peaceRank: 126, pressRank: 159, debtPct: 83, co2PerCap: 1.9, forestPct: 24.3, homicideRate: 3.0, trivia: 'World\'s most populous country since 2023 and fastest-growing major economy.' },
  { countryCode: 'RU', countryName: 'Russia', isoNumeric: 643, capital: 'Moscow', region: 'Europe/Asia', areaKm2: 17098242, currency: 'RUB', language: 'Russian', population: 144000000, medianAge: 39.6, lifeExp: 73.4, hdi: 0.822, giniIndex: 36.0, corruption: 26, freedomScore: 50.3, democracy: 2.22, peaceRank: 158, pressRank: 164, debtPct: 17, co2PerCap: 11.4, forestPct: 49.8, homicideRate: 6.8, trivia: 'Largest country by area, spanning 11 time zones.' },
  { countryCode: 'BR', countryName: 'Brazil', isoNumeric: 76, capital: 'Brasilia', region: 'South America', areaKm2: 8515767, currency: 'BRL', language: 'Portuguese', population: 216400000, medianAge: 33.2, lifeExp: 75.3, hdi: 0.760, giniIndex: 48.9, corruption: 36, freedomScore: 53.4, democracy: 6.78, peaceRank: 107, pressRank: 82, debtPct: 87, co2PerCap: 2.3, forestPct: 59.4, homicideRate: 22.4, trivia: 'Home to the largest tropical rainforest and a top-5 Bitcoin-adopting nation.' },
  { countryCode: 'ZA', countryName: 'South Africa', isoNumeric: 710, capital: 'Pretoria', region: 'Africa', areaKm2: 1219090, currency: 'ZAR', language: 'English/Zulu', population: 60400000, medianAge: 28.0, lifeExp: 64.9, hdi: 0.713, giniIndex: 63.0, corruption: 41, freedomScore: 55.7, democracy: 7.05, peaceRank: 118, pressRank: 25, debtPct: 72, co2PerCap: 7.5, forestPct: 7.6, homicideRate: 33.5, trivia: 'Highest Gini coefficient globally — most unequal income distribution.' },
  { countryCode: 'SA', countryName: 'Saudi Arabia', isoNumeric: 682, capital: 'Riyadh', region: 'Middle East', areaKm2: 2149690, currency: 'SAR', language: 'Arabic', population: 36900000, medianAge: 31.8, lifeExp: 77.6, hdi: 0.875, giniIndex: null, corruption: 52, freedomScore: 58.3, democracy: 2.08, peaceRank: 102, pressRank: 166, debtPct: 30, co2PerCap: 18.7, forestPct: 0.5, homicideRate: 1.5, trivia: 'World\'s largest oil exporter and home to two of Islam\'s holiest cities.' },
  { countryCode: 'AE', countryName: 'UAE', isoNumeric: 784, capital: 'Abu Dhabi', region: 'Middle East', areaKm2: 83600, currency: 'AED', language: 'Arabic', population: 10000000, medianAge: 33.5, lifeExp: 78.7, hdi: 0.911, giniIndex: null, corruption: 68, freedomScore: 76.9, democracy: 2.76, peaceRank: 55, pressRank: 145, debtPct: 30, co2PerCap: 20.7, forestPct: 4.5, homicideRate: 0.5, trivia: 'Major crypto hub — Dubai leads global Bitcoin real-estate transactions.' },
  { countryCode: 'EG', countryName: 'Egypt', isoNumeric: 818, capital: 'Cairo', region: 'North Africa', areaKm2: 1002450, currency: 'EGP', language: 'Arabic', population: 104000000, medianAge: 24.1, lifeExp: 72.0, hdi: 0.731, giniIndex: 31.5, corruption: 30, freedomScore: 49.0, democracy: 2.93, peaceRank: 136, pressRank: 170, debtPct: 92, co2PerCap: 2.3, forestPct: 0.1, homicideRate: 2.5, trivia: 'Controls the Suez Canal — 12% of world trade passes through it.' },
  { countryCode: 'ET', countryName: 'Ethiopia', isoNumeric: 231, capital: 'Addis Ababa', region: 'Africa', areaKm2: 1104300, currency: 'ETB', language: 'Amharic', population: 126500000, medianAge: 19.5, lifeExp: 66.6, hdi: 0.498, giniIndex: 35.0, corruption: 37, freedomScore: 47.5, democracy: 3.27, peaceRank: 139, pressRank: 149, debtPct: 37, co2PerCap: 0.2, forestPct: 15.5, homicideRate: 7.6, trivia: 'Only African country never colonized; uses its own calendar 7–8 years behind Gregorian.' },
  { countryCode: 'IR', countryName: 'Iran', isoNumeric: 364, capital: 'Tehran', region: 'Middle East', areaKm2: 1648195, currency: 'IRR', language: 'Persian', population: 87900000, medianAge: 32.0, lifeExp: 76.7, hdi: 0.774, giniIndex: 40.9, corruption: 24, freedomScore: 42.4, democracy: 1.96, peaceRank: 143, pressRank: 176, debtPct: 33, co2PerCap: 8.8, forestPct: 6.6, homicideRate: 2.5, trivia: 'Major Bitcoin mining hub — once estimated at 4.5% of global hashrate.' },
  // Major economies
  { countryCode: 'AU', countryName: 'Australia', isoNumeric: 36, capital: 'Canberra', region: 'Oceania', areaKm2: 7692024, currency: 'AUD', language: 'English', population: 26500000, medianAge: 37.2, lifeExp: 83.3, hdi: 0.946, giniIndex: 34.4, corruption: 75, freedomScore: 74.8, democracy: 8.71, peaceRank: 22, pressRank: 27, debtPct: 50, co2PerCap: 15.0, forestPct: 17.4, homicideRate: 0.9, trivia: 'World\'s largest island continent and a top global gold producer.' },
  { countryCode: 'KR', countryName: 'South Korea', isoNumeric: 410, capital: 'Seoul', region: 'East Asia', areaKm2: 100210, currency: 'KRW', language: 'Korean', population: 51700000, medianAge: 44.6, lifeExp: 83.7, hdi: 0.929, giniIndex: 31.4, corruption: 63, freedomScore: 72.6, democracy: 8.03, peaceRank: 43, pressRank: 47, debtPct: 54, co2PerCap: 11.6, forestPct: 63.7, homicideRate: 0.6, trivia: 'World\'s fastest internet speeds and a massive crypto trading market.' },
  { countryCode: 'MX', countryName: 'Mexico', isoNumeric: 484, capital: 'Mexico City', region: 'North America', areaKm2: 1964375, currency: 'MXN', language: 'Spanish', population: 129200000, medianAge: 29.3, lifeExp: 75.0, hdi: 0.758, giniIndex: 45.4, corruption: 31, freedomScore: 63.4, democracy: 5.57, peaceRank: 137, pressRank: 128, debtPct: 53, co2PerCap: 3.6, forestPct: 33.6, homicideRate: 25.6, trivia: 'Second-largest economy in Latin America and a top remittance receiver.' },
  { countryCode: 'ID', countryName: 'Indonesia', isoNumeric: 360, capital: 'Jakarta', region: 'Southeast Asia', areaKm2: 1904569, currency: 'IDR', language: 'Indonesian', population: 277500000, medianAge: 30.2, lifeExp: 71.7, hdi: 0.713, giniIndex: 37.9, corruption: 34, freedomScore: 60.7, democracy: 6.71, peaceRank: 42, pressRank: 111, debtPct: 39, co2PerCap: 2.3, forestPct: 49.1, homicideRate: 0.4, trivia: 'World\'s largest archipelago with over 17,000 islands.' },
  { countryCode: 'TR', countryName: 'Turkey', isoNumeric: 792, capital: 'Ankara', region: 'Europe/Asia', areaKm2: 783562, currency: 'TRY', language: 'Turkish', population: 85300000, medianAge: 32.2, lifeExp: 76.0, hdi: 0.838, giniIndex: 41.9, corruption: 34, freedomScore: 55.2, democracy: 4.35, peaceRank: 147, pressRank: 165, debtPct: 34, co2PerCap: 4.8, forestPct: 28.4, homicideRate: 2.6, trivia: 'Straddles two continents and has one of the world\'s highest crypto adoption rates.' },
  { countryCode: 'AR', countryName: 'Argentina', isoNumeric: 32, capital: 'Buenos Aires', region: 'South America', areaKm2: 2780400, currency: 'ARS', language: 'Spanish', population: 46300000, medianAge: 31.7, lifeExp: 76.5, hdi: 0.842, giniIndex: 42.3, corruption: 38, freedomScore: 50.3, democracy: 6.85, peaceRank: 59, pressRank: 66, debtPct: 85, co2PerCap: 3.9, forestPct: 10.7, homicideRate: 4.6, trivia: 'Prolific Bitcoin adoption driven by decades of currency devaluation and capital controls.' },
  { countryCode: 'NG', countryName: 'Nigeria', isoNumeric: 566, capital: 'Abuja', region: 'Africa', areaKm2: 923768, currency: 'NGN', language: 'English', population: 223800000, medianAge: 18.1, lifeExp: 52.7, hdi: 0.535, giniIndex: 35.1, corruption: 25, freedomScore: 47.7, democracy: 4.11, peaceRank: 144, pressRank: 112, debtPct: 38, co2PerCap: 0.6, forestPct: 7.2, homicideRate: 10.3, trivia: 'Africa\'s largest economy and one of the world\'s highest P2P Bitcoin trading volumes.' },
  { countryCode: 'PL', countryName: 'Poland', isoNumeric: 616, capital: 'Warsaw', region: 'Europe', areaKm2: 312696, currency: 'PLN', language: 'Polish', population: 37800000, medianAge: 41.7, lifeExp: 77.8, hdi: 0.876, giniIndex: 29.7, corruption: 54, freedomScore: 69.7, democracy: 7.04, peaceRank: 25, pressRank: 57, debtPct: 49, co2PerCap: 8.1, forestPct: 30.9, homicideRate: 0.7, trivia: 'Central Europe\'s largest economy and a major NATO eastern flank state.' },
  { countryCode: 'NL', countryName: 'Netherlands', isoNumeric: 528, capital: 'Amsterdam', region: 'Europe', areaKm2: 41543, currency: 'EUR', language: 'Dutch', population: 17700000, medianAge: 42.8, lifeExp: 81.7, hdi: 0.941, giniIndex: 28.1, corruption: 79, freedomScore: 78.0, democracy: 8.88, peaceRank: 15, pressRank: 6, debtPct: 52, co2PerCap: 8.8, forestPct: 11.2, homicideRate: 0.6, trivia: 'World\'s second-largest agricultural exporter despite its tiny size.' },
  { countryCode: 'CH', countryName: 'Switzerland', isoNumeric: 756, capital: 'Bern', region: 'Europe', areaKm2: 41284, currency: 'CHF', language: 'German/French', population: 8800000, medianAge: 42.7, lifeExp: 83.4, hdi: 0.962, giniIndex: 33.1, corruption: 82, freedomScore: 84.2, democracy: 9.14, peaceRank: 11, pressRank: 12, debtPct: 41, co2PerCap: 4.0, forestPct: 31.7, homicideRate: 0.5, trivia: 'Home to "Crypto Valley" Zug — a global hub for blockchain companies.' },
  { countryCode: 'SE', countryName: 'Sweden', isoNumeric: 752, capital: 'Stockholm', region: 'Europe', areaKm2: 450295, currency: 'SEK', language: 'Swedish', population: 10500000, medianAge: 41.0, lifeExp: 83.0, hdi: 0.947, giniIndex: 30.0, corruption: 83, freedomScore: 77.5, democracy: 9.39, peaceRank: 18, pressRank: 3, debtPct: 33, co2PerCap: 3.6, forestPct: 68.7, homicideRate: 1.1, trivia: 'Pioneering cashless economy — electronic payments dominate daily life.' },
  { countryCode: 'NO', countryName: 'Norway', isoNumeric: 578, capital: 'Oslo', region: 'Europe', areaKm2: 385207, currency: 'NOK', language: 'Norwegian', population: 5500000, medianAge: 39.5, lifeExp: 83.2, hdi: 0.961, giniIndex: 27.7, corruption: 84, freedomScore: 76.9, democracy: 9.81, peaceRank: 14, pressRank: 1, debtPct: 43, co2PerCap: 7.5, forestPct: 33.2, homicideRate: 0.5, trivia: 'Government Pension Fund ("Oil Fund") is the world\'s largest sovereign wealth fund.' },
  { countryCode: 'ES', countryName: 'Spain', isoNumeric: 724, capital: 'Madrid', region: 'Europe', areaKm2: 505990, currency: 'EUR', language: 'Spanish', population: 47400000, medianAge: 45.5, lifeExp: 83.0, hdi: 0.905, giniIndex: 34.7, corruption: 60, freedomScore: 68.2, democracy: 7.97, peaceRank: 30, pressRank: 36, debtPct: 113, co2PerCap: 5.2, forestPct: 36.8, homicideRate: 0.6, trivia: 'Fourth-largest eurozone economy and second-most visited country globally.' },
  { countryCode: 'TH', countryName: 'Thailand', isoNumeric: 764, capital: 'Bangkok', region: 'Southeast Asia', areaKm2: 513120, currency: 'THB', language: 'Thai', population: 71800000, medianAge: 40.1, lifeExp: 78.7, hdi: 0.800, giniIndex: 34.9, corruption: 35, freedomScore: 62.1, democracy: 6.35, peaceRank: 92, pressRank: 106, debtPct: 62, co2PerCap: 3.8, forestPct: 38.0, homicideRate: 2.7, trivia: 'One of only three SE Asian countries never colonised by a European power.' },
  { countryCode: 'VN', countryName: 'Vietnam', isoNumeric: 704, capital: 'Hanoi', region: 'Southeast Asia', areaKm2: 331212, currency: 'VND', language: 'Vietnamese', population: 99500000, medianAge: 30.5, lifeExp: 75.4, hdi: 0.726, giniIndex: 35.7, corruption: 41, freedomScore: 59.3, democracy: 2.73, peaceRank: 41, pressRank: 174, debtPct: 37, co2PerCap: 3.5, forestPct: 42.0, homicideRate: 1.5, trivia: 'One of the fastest-growing economies in Asia with a booming tech sector.' },
  { countryCode: 'MY', countryName: 'Malaysia', isoNumeric: 458, capital: 'Kuala Lumpur', region: 'Southeast Asia', areaKm2: 330803, currency: 'MYR', language: 'Malay', population: 33600000, medianAge: 30.3, lifeExp: 76.2, hdi: 0.803, giniIndex: 41.1, corruption: 47, freedomScore: 66.2, democracy: 7.30, peaceRank: 19, pressRank: 107, debtPct: 67, co2PerCap: 7.6, forestPct: 54.6, homicideRate: 2.1, trivia: 'World\'s second-largest palm oil producer and a growing Islamic finance hub.' },
  { countryCode: 'PH', countryName: 'Philippines', isoNumeric: 608, capital: 'Manila', region: 'Southeast Asia', areaKm2: 300000, currency: 'PHP', language: 'Filipino/English', population: 115600000, medianAge: 25.7, lifeExp: 71.1, hdi: 0.699, giniIndex: 42.3, corruption: 33, freedomScore: 62.8, democracy: 6.73, peaceRank: 116, pressRank: 132, debtPct: 61, co2PerCap: 1.3, forestPct: 24.0, homicideRate: 4.3, trivia: 'One of the world\'s largest remittance-receiving countries — crypto remittances growing fast.' },
  { countryCode: 'PK', countryName: 'Pakistan', isoNumeric: 586, capital: 'Islamabad', region: 'South Asia', areaKm2: 881912, currency: 'PKR', language: 'Urdu/English', population: 231400000, medianAge: 22.8, lifeExp: 67.3, hdi: 0.544, giniIndex: 29.6, corruption: 27, freedomScore: 47.3, democracy: 4.13, peaceRank: 150, pressRank: 152, debtPct: 75, co2PerCap: 0.9, forestPct: 5.0, homicideRate: 3.6, trivia: 'Fifth-most populous country with a rapidly growing digital payments ecosystem.' },
  { countryCode: 'BD', countryName: 'Bangladesh', isoNumeric: 50, capital: 'Dhaka', region: 'South Asia', areaKm2: 147570, currency: 'BDT', language: 'Bengali', population: 172000000, medianAge: 27.9, lifeExp: 72.4, hdi: 0.670, giniIndex: 32.4, corruption: 24, freedomScore: 49.8, democracy: 5.99, peaceRank: 95, pressRank: 165, debtPct: 39, co2PerCap: 0.5, forestPct: 11.0, homicideRate: 2.4, trivia: 'World\'s largest garment exporter after China; extremely vulnerable to rising sea levels.' },
  { countryCode: 'CO', countryName: 'Colombia', isoNumeric: 170, capital: 'Bogota', region: 'South America', areaKm2: 1141748, currency: 'COP', language: 'Spanish', population: 51900000, medianAge: 31.2, lifeExp: 77.3, hdi: 0.752, giniIndex: 51.3, corruption: 39, freedomScore: 60.9, democracy: 7.13, peaceRank: 140, pressRank: 129, debtPct: 60, co2PerCap: 1.7, forestPct: 52.0, homicideRate: 25.3, trivia: 'One of the world\'s most biodiverse countries and a growing crypto adoption market.' },
  { countryCode: 'CL', countryName: 'Chile', isoNumeric: 152, capital: 'Santiago', region: 'South America', areaKm2: 756102, currency: 'CLP', language: 'Spanish', population: 19500000, medianAge: 35.3, lifeExp: 80.2, hdi: 0.855, giniIndex: 44.9, corruption: 67, freedomScore: 69.5, democracy: 8.28, peaceRank: 52, pressRank: 54, debtPct: 37, co2PerCap: 4.3, forestPct: 24.4, homicideRate: 4.6, trivia: 'World\'s largest copper producer, accounting for over a quarter of global output.' },
  { countryCode: 'PE', countryName: 'Peru', isoNumeric: 604, capital: 'Lima', region: 'South America', areaKm2: 1285216, currency: 'PEN', language: 'Spanish', population: 33700000, medianAge: 31.0, lifeExp: 76.7, hdi: 0.762, giniIndex: 43.8, corruption: 36, freedomScore: 67.3, democracy: 6.09, peaceRank: 101, pressRank: 110, debtPct: 34, co2PerCap: 1.8, forestPct: 57.8, homicideRate: 6.7, trivia: 'Second-largest silver producer and home to more than half the Amazon basin.' },
  { countryCode: 'SG', countryName: 'Singapore', isoNumeric: 702, capital: 'Singapore', region: 'Southeast Asia', areaKm2: 728, currency: 'SGD', language: 'English/Mandarin', population: 5900000, medianAge: 42.2, lifeExp: 83.5, hdi: 0.939, giniIndex: null, corruption: 83, freedomScore: 83.9, democracy: 6.02, peaceRank: 7, pressRank: 126, debtPct: 168, co2PerCap: 8.6, forestPct: 23.1, homicideRate: 0.2, trivia: 'One of the world\'s leading financial centres and a major crypto regulatory hub.' },
  { countryCode: 'IL', countryName: 'Israel', isoNumeric: 376, capital: 'Jerusalem', region: 'Middle East', areaKm2: 22072, currency: 'ILS', language: 'Hebrew/Arabic', population: 9800000, medianAge: 30.4, lifeExp: 82.6, hdi: 0.919, giniIndex: 39.0, corruption: 62, freedomScore: 67.6, democracy: 7.93, peaceRank: 134, pressRank: 101, debtPct: 62, co2PerCap: 7.1, forestPct: 7.7, homicideRate: 1.5, trivia: 'Known as "Startup Nation" — highest VC funding per capita in the world.' },
  { countryCode: 'TW', countryName: 'Taiwan', isoNumeric: 158, capital: 'Taipei', region: 'East Asia', areaKm2: 36193, currency: 'TWD', language: 'Mandarin', population: 23600000, medianAge: 42.3, lifeExp: 80.7, hdi: 0.926, giniIndex: 33.6, corruption: 68, freedomScore: 80.7, democracy: 8.99, peaceRank: 33, pressRank: 35, debtPct: 28, co2PerCap: 11.6, forestPct: 60.7, homicideRate: 0.8, trivia: 'Produces over 90% of the world\'s most advanced semiconductors (TSMC).' },
  { countryCode: 'NZ', countryName: 'New Zealand', isoNumeric: 554, capital: 'Wellington', region: 'Oceania', areaKm2: 270467, currency: 'NZD', language: 'English/Maori', population: 5200000, medianAge: 37.4, lifeExp: 82.3, hdi: 0.937, giniIndex: null, corruption: 77, freedomScore: 80.6, democracy: 9.61, peaceRank: 4, pressRank: 11, debtPct: 42, co2PerCap: 6.8, forestPct: 38.6, homicideRate: 0.7, trivia: 'First country where women won the right to vote (1893).' },
  { countryCode: 'IE', countryName: 'Ireland', isoNumeric: 372, capital: 'Dublin', region: 'Europe', areaKm2: 70273, currency: 'EUR', language: 'English/Irish', population: 5100000, medianAge: 38.2, lifeExp: 82.0, hdi: 0.945, giniIndex: 30.6, corruption: 77, freedomScore: 80.6, democracy: 9.00, peaceRank: 3, pressRank: 9, debtPct: 44, co2PerCap: 7.7, forestPct: 11.0, homicideRate: 0.4, trivia: 'European HQ hub for Apple, Google, and Meta — "Silicon Docks" in Dublin.' },
  { countryCode: 'DK', countryName: 'Denmark', isoNumeric: 208, capital: 'Copenhagen', region: 'Europe', areaKm2: 43094, currency: 'DKK', language: 'Danish', population: 5900000, medianAge: 42.0, lifeExp: 81.4, hdi: 0.948, giniIndex: 28.2, corruption: 90, freedomScore: 77.6, democracy: 9.28, peaceRank: 5, pressRank: 2, debtPct: 29, co2PerCap: 5.1, forestPct: 14.6, homicideRate: 0.8, trivia: 'Consistently ranked as the least corrupt country in the world.' },
  { countryCode: 'BE', countryName: 'Belgium', isoNumeric: 56, capital: 'Brussels', region: 'Europe', areaKm2: 30528, currency: 'EUR', language: 'Dutch/French', population: 11700000, medianAge: 41.6, lifeExp: 81.4, hdi: 0.937, giniIndex: 27.2, corruption: 73, freedomScore: 68.2, democracy: 7.64, peaceRank: 17, pressRank: 14, debtPct: 105, co2PerCap: 8.3, forestPct: 22.6, homicideRate: 1.7, trivia: 'De facto capital of the EU — hosts NATO HQ and European Commission.' },
  { countryCode: 'AT', countryName: 'Austria', isoNumeric: 40, capital: 'Vienna', region: 'Europe', areaKm2: 83871, currency: 'EUR', language: 'German', population: 9100000, medianAge: 44.5, lifeExp: 81.6, hdi: 0.916, giniIndex: 30.5, corruption: 71, freedomScore: 73.4, democracy: 8.41, peaceRank: 6, pressRank: 17, debtPct: 78, co2PerCap: 7.0, forestPct: 47.3, homicideRate: 0.7, trivia: 'Vienna has been ranked the world\'s most liveable city multiple years running.' },
  { countryCode: 'CZ', countryName: 'Czech Republic', isoNumeric: 203, capital: 'Prague', region: 'Europe', areaKm2: 78867, currency: 'CZK', language: 'Czech', population: 10800000, medianAge: 43.3, lifeExp: 79.0, hdi: 0.889, giniIndex: 25.0, corruption: 57, freedomScore: 73.8, democracy: 7.97, peaceRank: 8, pressRank: 20, debtPct: 44, co2PerCap: 9.3, forestPct: 34.5, homicideRate: 0.6, trivia: 'Has the lowest Gini coefficient in this dataset — one of the most equal societies.' },
  { countryCode: 'GR', countryName: 'Greece', isoNumeric: 300, capital: 'Athens', region: 'Europe', areaKm2: 131957, currency: 'EUR', language: 'Greek', population: 10400000, medianAge: 45.6, lifeExp: 80.1, hdi: 0.887, giniIndex: 32.9, corruption: 49, freedomScore: 59.9, democracy: 7.56, peaceRank: 49, pressRank: 88, debtPct: 177, co2PerCap: 5.7, forestPct: 32.0, homicideRate: 0.9, trivia: 'Eurozone\'s highest debt-to-GDP ratio; birthplace of democracy.' },
  { countryCode: 'PT', countryName: 'Portugal', isoNumeric: 620, capital: 'Lisbon', region: 'Europe', areaKm2: 92090, currency: 'EUR', language: 'Portuguese', population: 10300000, medianAge: 46.2, lifeExp: 81.1, hdi: 0.866, giniIndex: 33.8, corruption: 62, freedomScore: 67.0, democracy: 7.95, peaceRank: 7, pressRank: 7, debtPct: 113, co2PerCap: 4.3, forestPct: 36.1, homicideRate: 0.8, trivia: 'Pioneer in drug decriminalisation and a popular digital nomad destination.' },
  { countryCode: 'KE', countryName: 'Kenya', isoNumeric: 404, capital: 'Nairobi', region: 'Africa', areaKm2: 580367, currency: 'KES', language: 'English/Swahili', population: 55100000, medianAge: 20.0, lifeExp: 61.4, hdi: 0.575, giniIndex: 40.8, corruption: 31, freedomScore: 55.6, democracy: 5.33, peaceRank: 123, pressRank: 102, debtPct: 68, co2PerCap: 0.4, forestPct: 7.4, homicideRate: 4.2, trivia: 'M-Pesa mobile money leads the world — Kenya pioneered mobile financial services.' },
  { countryCode: 'GH', countryName: 'Ghana', isoNumeric: 288, capital: 'Accra', region: 'Africa', areaKm2: 238533, currency: 'GHS', language: 'English', population: 33500000, medianAge: 21.1, lifeExp: 63.8, hdi: 0.602, giniIndex: 43.5, corruption: 43, freedomScore: 58.3, democracy: 6.48, peaceRank: 40, pressRank: 60, debtPct: 88, co2PerCap: 0.6, forestPct: 21.7, homicideRate: 2.1, trivia: 'One of Africa\'s most stable democracies and second-largest cocoa producer.' },
];

/**
 * Fallback values for live fields (2023/2024 estimates).
 * Sources: World Bank, IMF WEO, central bank websites.
 * The monthly cron overwrites these when fresh API data is available.
 */
const LIVE_FALLBACKS: Record<string, {
  gdpPerCap: number; gdpGrowth: number; inflation: number;
  unemployment: number; cbRate: number; urbanPct: number;
  fertility: number; infantMort: number;
}> = {
  US: { gdpPerCap: 65000, gdpGrowth: 2.5, inflation: 3.4, unemployment: 3.7, cbRate: 5.33, urbanPct: 83, fertility: 1.66, infantMort: 5.4 },
  GB: { gdpPerCap: 46000, gdpGrowth: 0.1, inflation: 4.0, unemployment: 4.0, cbRate: 5.25, urbanPct: 84, fertility: 1.56, infantMort: 3.7 },
  DE: { gdpPerCap: 51000, gdpGrowth: -0.3, inflation: 2.9, unemployment: 3.0, cbRate: 4.50, urbanPct: 78, fertility: 1.36, infantMort: 3.1 },
  FR: { gdpPerCap: 44000, gdpGrowth: 0.9, inflation: 2.5, unemployment: 7.4, cbRate: 4.50, urbanPct: 81, fertility: 1.68, infantMort: 3.3 },
  IT: { gdpPerCap: 35000, gdpGrowth: 0.7, inflation: 1.7, unemployment: 7.6, cbRate: 4.50, urbanPct: 71, fertility: 1.24, infantMort: 2.5 },
  CA: { gdpPerCap: 52000, gdpGrowth: 1.1, inflation: 3.9, unemployment: 5.4, cbRate: 5.00, urbanPct: 82, fertility: 1.33, infantMort: 4.3 },
  JP: { gdpPerCap: 34000, gdpGrowth: 1.9, inflation: 3.3, unemployment: 2.6, cbRate: 0.25, urbanPct: 92, fertility: 1.20, infantMort: 1.8 },
  CN: { gdpPerCap: 12500, gdpGrowth: 5.2, inflation: 0.2, unemployment: 5.1, cbRate: 3.45, urbanPct: 65, fertility: 1.09, infantMort: 5.1 },
  IN: { gdpPerCap: 2500, gdpGrowth: 7.8, inflation: 5.4, unemployment: 3.1, cbRate: 6.50, urbanPct: 36, fertility: 2.00, infantMort: 25.5 },
  RU: { gdpPerCap: 12100, gdpGrowth: 3.6, inflation: 7.4, unemployment: 2.9, cbRate: 16.00, urbanPct: 75, fertility: 1.50, infantMort: 4.5 },
  BR: { gdpPerCap: 9000, gdpGrowth: 2.9, inflation: 4.6, unemployment: 7.8, cbRate: 13.25, urbanPct: 87, fertility: 1.63, infantMort: 12.4 },
  ZA: { gdpPerCap: 6100, gdpGrowth: 0.6, inflation: 5.1, unemployment: 32.1, cbRate: 8.25, urbanPct: 68, fertility: 2.33, infantMort: 23.6 },
  SA: { gdpPerCap: 27000, gdpGrowth: -0.8, inflation: 2.3, unemployment: 4.8, cbRate: 6.00, urbanPct: 84, fertility: 2.18, infantMort: 5.6 },
  AE: { gdpPerCap: 50000, gdpGrowth: 3.6, inflation: 2.3, unemployment: 2.7, cbRate: 5.40, urbanPct: 87, fertility: 1.39, infantMort: 5.1 },
  EG: { gdpPerCap: 3900, gdpGrowth: 3.8, inflation: 33.9, unemployment: 7.1, cbRate: 27.25, urbanPct: 43, fertility: 2.88, infantMort: 16.5 },
  ET: { gdpPerCap: 1100, gdpGrowth: 7.2, inflation: 30.2, unemployment: 3.5, cbRate: 7.00, urbanPct: 22, fertility: 4.07, infantMort: 34.0 },
  IR: { gdpPerCap: 4300, gdpGrowth: 5.4, inflation: 42.5, unemployment: 9.0, cbRate: 23.00, urbanPct: 76, fertility: 1.69, infantMort: 11.7 },
  AU: { gdpPerCap: 65000, gdpGrowth: 2.0, inflation: 4.1, unemployment: 3.7, cbRate: 4.35, urbanPct: 87, fertility: 1.58, infantMort: 3.0 },
  KR: { gdpPerCap: 33000, gdpGrowth: 1.4, inflation: 3.6, unemployment: 2.7, cbRate: 3.50, urbanPct: 82, fertility: 0.72, infantMort: 2.7 },
  MX: { gdpPerCap: 11000, gdpGrowth: 3.2, inflation: 4.7, unemployment: 2.8, cbRate: 11.25, urbanPct: 81, fertility: 1.81, infantMort: 11.8 },
  ID: { gdpPerCap: 4900, gdpGrowth: 5.1, inflation: 3.7, unemployment: 5.3, cbRate: 6.25, urbanPct: 58, fertility: 2.18, infantMort: 17.3 },
  TR: { gdpPerCap: 11000, gdpGrowth: 4.5, inflation: 65.0, unemployment: 10.0, cbRate: 50.00, urbanPct: 77, fertility: 1.51, infantMort: 8.4 },
  AR: { gdpPerCap: 13000, gdpGrowth: -1.6, inflation: 211.0, unemployment: 6.3, cbRate: 133.00, urbanPct: 92, fertility: 1.88, infantMort: 8.4 },
  NG: { gdpPerCap: 2200, gdpGrowth: 2.9, inflation: 28.2, unemployment: 5.0, cbRate: 18.75, urbanPct: 53, fertility: 5.13, infantMort: 54.7 },
  PL: { gdpPerCap: 18000, gdpGrowth: 0.2, inflation: 3.7, unemployment: 2.8, cbRate: 5.75, urbanPct: 60, fertility: 1.29, infantMort: 3.4 },
  NL: { gdpPerCap: 57000, gdpGrowth: 0.1, inflation: 3.3, unemployment: 3.6, cbRate: 4.50, urbanPct: 93, fertility: 1.49, infantMort: 3.1 },
  CH: { gdpPerCap: 94000, gdpGrowth: 0.7, inflation: 1.7, unemployment: 4.1, cbRate: 1.75, urbanPct: 74, fertility: 1.39, infantMort: 3.5 },
  SE: { gdpPerCap: 56000, gdpGrowth: -0.2, inflation: 3.7, unemployment: 7.5, cbRate: 4.00, urbanPct: 88, fertility: 1.52, infantMort: 2.1 },
  NO: { gdpPerCap: 83000, gdpGrowth: 0.5, inflation: 3.5, unemployment: 3.5, cbRate: 4.50, urbanPct: 83, fertility: 1.41, infantMort: 1.6 },
  ES: { gdpPerCap: 32000, gdpGrowth: 2.5, inflation: 3.4, unemployment: 11.7, cbRate: 4.50, urbanPct: 81, fertility: 1.16, infantMort: 2.6 },
  TH: { gdpPerCap: 7300, gdpGrowth: 1.9, inflation: 1.2, unemployment: 1.0, cbRate: 2.50, urbanPct: 53, fertility: 1.08, infantMort: 7.3 },
  VN: { gdpPerCap: 4300, gdpGrowth: 5.1, inflation: 3.3, unemployment: 2.3, cbRate: 4.50, urbanPct: 39, fertility: 1.94, infantMort: 14.4 },
  MY: { gdpPerCap: 12500, gdpGrowth: 3.7, inflation: 2.5, unemployment: 3.3, cbRate: 3.00, urbanPct: 78, fertility: 1.74, infantMort: 6.7 },
  PH: { gdpPerCap: 3500, gdpGrowth: 5.6, inflation: 6.0, unemployment: 4.3, cbRate: 6.50, urbanPct: 48, fertility: 2.78, infantMort: 19.7 },
  PK: { gdpPerCap: 1500, gdpGrowth: -0.2, inflation: 29.2, unemployment: 6.3, cbRate: 22.00, urbanPct: 37, fertility: 3.41, infantMort: 52.3 },
  BD: { gdpPerCap: 2700, gdpGrowth: 5.8, inflation: 9.7, unemployment: 5.2, cbRate: 8.00, urbanPct: 39, fertility: 1.98, infantMort: 22.1 },
  CO: { gdpPerCap: 6600, gdpGrowth: 0.6, inflation: 9.3, unemployment: 10.2, cbRate: 13.25, urbanPct: 82, fertility: 1.73, infantMort: 11.1 },
  CL: { gdpPerCap: 16000, gdpGrowth: 0.2, inflation: 4.5, unemployment: 8.5, cbRate: 8.25, urbanPct: 88, fertility: 1.54, infantMort: 5.9 },
  PE: { gdpPerCap: 7000, gdpGrowth: -0.6, inflation: 3.2, unemployment: 6.7, cbRate: 6.75, urbanPct: 78, fertility: 2.22, infantMort: 10.1 },
  SG: { gdpPerCap: 83000, gdpGrowth: 1.1, inflation: 4.8, unemployment: 2.0, cbRate: 3.75, urbanPct: 100, fertility: 1.04, infantMort: 1.5 },
  IL: { gdpPerCap: 52000, gdpGrowth: 2.0, inflation: 3.3, unemployment: 3.4, cbRate: 4.75, urbanPct: 93, fertility: 2.90, infantMort: 3.0 },
  TW: { gdpPerCap: 33000, gdpGrowth: 1.3, inflation: 2.5, unemployment: 3.5, cbRate: 1.88, urbanPct: 79, fertility: 0.87, infantMort: 3.6 },
  NZ: { gdpPerCap: 48000, gdpGrowth: 0.6, inflation: 4.7, unemployment: 3.9, cbRate: 5.50, urbanPct: 87, fertility: 1.56, infantMort: 3.3 },
  IE: { gdpPerCap: 100000, gdpGrowth: 3.3, inflation: 4.1, unemployment: 4.3, cbRate: 4.50, urbanPct: 64, fertility: 1.55, infantMort: 2.8 },
  DK: { gdpPerCap: 67000, gdpGrowth: 1.8, inflation: 2.8, unemployment: 4.8, cbRate: 3.60, urbanPct: 88, fertility: 1.55, infantMort: 3.1 },
  BE: { gdpPerCap: 51000, gdpGrowth: 1.4, inflation: 2.3, unemployment: 5.5, cbRate: 4.50, urbanPct: 98, fertility: 1.53, infantMort: 3.0 },
  AT: { gdpPerCap: 54000, gdpGrowth: -0.8, inflation: 4.5, unemployment: 5.1, cbRate: 4.50, urbanPct: 59, fertility: 1.41, infantMort: 2.7 },
  CZ: { gdpPerCap: 27000, gdpGrowth: -0.4, inflation: 10.7, unemployment: 2.6, cbRate: 7.00, urbanPct: 74, fertility: 1.66, infantMort: 2.4 },
  GR: { gdpPerCap: 23000, gdpGrowth: 2.0, inflation: 3.5, unemployment: 11.1, cbRate: 4.50, urbanPct: 80, fertility: 1.32, infantMort: 3.1 },
  PT: { gdpPerCap: 25000, gdpGrowth: 2.3, inflation: 4.3, unemployment: 6.5, cbRate: 4.50, urbanPct: 67, fertility: 1.35, infantMort: 2.6 },
  KE: { gdpPerCap: 2100, gdpGrowth: 5.4, inflation: 6.6, unemployment: 5.7, cbRate: 12.50, urbanPct: 29, fertility: 3.35, infantMort: 29.7 },
  GH: { gdpPerCap: 2400, gdpGrowth: 3.1, inflation: 23.2, unemployment: 5.5, cbRate: 29.50, urbanPct: 59, fertility: 3.58, infantMort: 32.1 },
};

// Merge both datasets
const ALL_COUNTRIES = [...COUNTRIES, ...COUNTRIES_125];
const ALL_FALLBACKS: Record<string, typeof LIVE_FALLBACKS[string]> = {
  ...LIVE_FALLBACKS,
  ...LIVE_FALLBACKS_125,
};

async function main() {
  console.log(`Seeding ${ALL_COUNTRIES.length} countries/territories...`);

  for (const c of ALL_COUNTRIES) {
    const fb = ALL_FALLBACKS[c.countryCode];
    const staticFields = {
      countryName: c.countryName,
      isoNumeric: c.isoNumeric,
      capital: c.capital,
      region: c.region,
      areaKm2: c.areaKm2,
      currency: c.currency,
      language: c.language,
      population: BigInt(c.population),
      medianAge: c.medianAge,
      lifeExp: c.lifeExp,
      hdi: c.hdi,
      giniIndex: c.giniIndex,
      corruption: c.corruption,
      freedomScore: c.freedomScore,
      democracy: c.democracy,
      peaceRank: c.peaceRank,
      pressRank: c.pressRank,
      debtPct: c.debtPct,
      co2PerCap: c.co2PerCap,
      forestPct: c.forestPct,
      homicideRate: c.homicideRate,
      trivia: c.trivia,
    };
    // Fallback live data — only set if value is currently null
    const liveFields = fb ? {
      gdpPerCap: fb.gdpPerCap,
      gdpGrowth: fb.gdpGrowth,
      inflation: fb.inflation,
      unemployment: fb.unemployment,
      cbRate: fb.cbRate,
      urbanPct: fb.urbanPct,
      fertility: fb.fertility,
      infantMort: fb.infantMort,
    } : {};

    await prisma.countryData.upsert({
      where: { countryCode: c.countryCode },
      update: { ...staticFields, ...liveFields },
      create: { countryCode: c.countryCode, ...staticFields, ...liveFields },
    });
    process.stdout.write('.');
  }

  console.log(`\n✓ ${ALL_COUNTRIES.length} countries/territories seeded.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
