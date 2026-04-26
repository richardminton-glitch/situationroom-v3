-- Migration: add_feh_sovereign_commentary
-- Run on VPS: psql $DATABASE_URL -f prisma/migrations/add_feh_sovereign_commentary.sql
--
-- Adds the per-(iso3, quarter) narrative commentary table for the sovereign
-- dossier "STATE OF [country]" section. Idempotent — re-running is safe.

CREATE TABLE IF NOT EXISTS "feh_sovereign_commentary" (
  "id"                 TEXT NOT NULL,
  "iso3"               TEXT NOT NULL,
  "quarter"            TEXT NOT NULL,            -- e.g. "2026Q2"
  "fiscal_trajectory"  TEXT NOT NULL,
  "key_risks"          TEXT NOT NULL,
  "comparable_peers"   TEXT NOT NULL,
  "grok_model"         TEXT,
  "source_url"         TEXT,
  "generated_at"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "feh_sovereign_commentary_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "feh_sovereign_commentary_iso3_quarter_key"
  ON "feh_sovereign_commentary"("iso3", "quarter");

CREATE INDEX IF NOT EXISTS "feh_sovereign_commentary_iso3_idx"
  ON "feh_sovereign_commentary"("iso3");
