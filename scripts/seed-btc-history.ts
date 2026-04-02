/**
 * Seed script — imports btc-price-history.csv into btc_price_history table.
 * Run with: npx tsx scripts/seed-btc-history.ts
 */

import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'fs';
import { join } from 'path';

const prisma = new PrismaClient();

async function main() {
  const csvPath = join(__dirname, '..', 'data', 'btc-price-history.csv');
  const content = readFileSync(csvPath, 'utf-8');
  const lines = content.trim().split('\n').slice(1); // skip header

  console.log(`[Seed] Importing ${lines.length} BTC price history records...`);

  let imported = 0;
  let skipped = 0;

  for (const line of lines) {
    const [dateStr, priceStr] = line.split(',');
    if (!dateStr || !priceStr) continue;

    // Parse DD/MM/YYYY → YYYY-MM-DD
    const parts = dateStr.trim().split('/');
    if (parts.length !== 3) continue;
    const isoDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    const price = parseFloat(priceStr.replace(/,/g, ''));

    if (isNaN(price)) continue;

    try {
      await prisma.btcPriceHistory.upsert({
        where: { date: new Date(isoDate) },
        update: { close: price },
        create: { date: new Date(isoDate), close: price },
      });
      imported++;
    } catch {
      skipped++;
    }
  }

  console.log(`[Seed] Imported ${imported}, skipped ${skipped}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
