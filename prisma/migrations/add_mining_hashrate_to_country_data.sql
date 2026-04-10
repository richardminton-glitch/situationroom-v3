-- Add mining hashrate fields to country_data
ALTER TABLE "country_data" ADD COLUMN IF NOT EXISTS "mining_hashrate_pct" DOUBLE PRECISION;
ALTER TABLE "country_data" ADD COLUMN IF NOT EXISTS "mining_hashrate_at" TIMESTAMP(3);
