-- Migration: add_feh_tables
-- Run on VPS: psql $DATABASE_URL -f prisma/migrations/add_feh_tables.sql
-- Or via Supabase SQL editor: paste & run.
--
-- Adds the eight Fiscal Event Horizon tables. Idempotent — re-running is
-- safe (CREATE TABLE IF NOT EXISTS, CREATE INDEX IF NOT EXISTS).

-- ── 1. Sovereign metrics (30 rows after first cron) ─────────────────────────
CREATE TABLE IF NOT EXISTS "feh_sovereign_metrics" (
  "iso3"                    TEXT NOT NULL,
  "country_name"            TEXT NOT NULL,
  "iso_numeric"             INTEGER NOT NULL,
  "region"                  TEXT NOT NULL,
  "debt_gdp"                DOUBLE PRECISION NOT NULL,
  "interest_pct_revenue"    DOUBLE PRECISION NOT NULL,
  "primary_balance"         DOUBLE PRECISION NOT NULL,
  "real_gdp_growth"         DOUBLE PRECISION NOT NULL,
  "effective_rate"          DOUBLE PRECISION NOT NULL,
  "avg_maturity"            DOUBLE PRECISION NOT NULL,
  "fx_debt_share"           DOUBLE PRECISION NOT NULL,
  "external_debt_share"     DOUBLE PRECISION NOT NULL,
  "reserve_adequacy_score"  DOUBLE PRECISION NOT NULL,
  "source_url"              TEXT,
  "updated_at"              TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "feh_sovereign_metrics_pkey" PRIMARY KEY ("iso3")
);

CREATE UNIQUE INDEX IF NOT EXISTS "feh_sovereign_metrics_iso_numeric_key"
  ON "feh_sovereign_metrics"("iso_numeric");

-- ── 2. RCDI monthly points (60+ rows over time) ─────────────────────────────
CREATE TABLE IF NOT EXISTS "feh_rcdi_points" (
  "date"               TEXT NOT NULL,        -- YYYY-MM
  "composite"          DOUBLE PRECISION NOT NULL,
  "gold_usd_score"     DOUBLE PRECISION NOT NULL,
  "cips_swift_score"   DOUBLE PRECISION NOT NULL,
  "yuan_oil_score"     DOUBLE PRECISION NOT NULL,
  "brics_swap_score"   DOUBLE PRECISION NOT NULL,
  "source_url"         TEXT,
  "updated_at"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "feh_rcdi_points_pkey" PRIMARY KEY ("date")
);

-- ── 3. Central bank rates (24 rows after first cron) ────────────────────────
CREATE TABLE IF NOT EXISTS "feh_cb_rates" (
  "iso3"                       TEXT NOT NULL,
  "country_name"               TEXT NOT NULL,
  "bank"                       TEXT NOT NULL,
  "rate"                       DOUBLE PRECISION NOT NULL,
  "last_move_bps"              DOUBLE PRECISION NOT NULL,
  "last_move_date"             TEXT NOT NULL,    -- DDMMMYY military format
  "stance"                     TEXT NOT NULL,    -- 'easing' | 'holding' | 'tightening'
  "market_implied_bps_12m"     DOUBLE PRECISION NOT NULL,
  "gdp_usd_t"                  DOUBLE PRECISION NOT NULL,
  "source_url"                 TEXT,
  "updated_at"                 TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "feh_cb_rates_pkey" PRIMARY KEY ("iso3")
);

-- ── 4. Malinvestment sectors (9 rows) ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS "feh_malinvestment_sectors" (
  "id"               TEXT NOT NULL,
  "short"            TEXT NOT NULL,
  "label"            TEXT NOT NULL,
  "stress"           DOUBLE PRECISION NOT NULL,
  "headline"         TEXT NOT NULL,
  "yoy_delta"        DOUBLE PRECISION NOT NULL,
  "half_life_months" INTEGER NOT NULL,
  "source_url"       TEXT,
  "updated_at"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "feh_malinvestment_sectors_pkey" PRIMARY KEY ("id")
);

-- ── 5. Wartime finance countries (22 rows) ──────────────────────────────────
CREATE TABLE IF NOT EXISTS "feh_wartime_countries" (
  "iso3"                    TEXT NOT NULL,
  "name"                    TEXT NOT NULL,
  "flag"                    TEXT NOT NULL,
  "stage"                   INTEGER NOT NULL,
  "defence_spend_pct_gdp"   DOUBLE PRECISION NOT NULL,
  "defence_cagr_3y"         DOUBLE PRECISION NOT NULL,
  "m2_growth_3y"            DOUBLE PRECISION NOT NULL,
  "cpi_yoy"                 DOUBLE PRECISION NOT NULL,
  "evidence_json"           TEXT NOT NULL,
  "source_url"              TEXT,
  "updated_at"              TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "feh_wartime_countries_pkey" PRIMARY KEY ("iso3")
);

-- ── 6. Petro-dollar layered chart points (120+ rows) ────────────────────────
CREATE TABLE IF NOT EXISTS "feh_petro_dollar_points" (
  "date"        TEXT NOT NULL,        -- YYYY-MM
  "dxy"         DOUBLE PRECISION NOT NULL,
  "yuan_oil"    DOUBLE PRECISION NOT NULL,
  "gold_repat"  DOUBLE PRECISION NOT NULL,
  "brics_swaps" DOUBLE PRECISION NOT NULL,
  "source_url"  TEXT,
  "updated_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "feh_petro_dollar_points_pkey" PRIMARY KEY ("date")
);

-- ── 7. Annotated fiscal events (shared across modules) ──────────────────────
CREATE TABLE IF NOT EXISTS "feh_fiscal_events" (
  "id"          SERIAL NOT NULL,
  "module"      TEXT NOT NULL,        -- 'rcdi' | 'petro-dollar' | etc
  "date"        TEXT NOT NULL,        -- YYYY-MM
  "label"       TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "source_url"  TEXT,
  "created_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "feh_fiscal_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "feh_fiscal_events_module_idx"
  ON "feh_fiscal_events"("module");

-- ── 8. Extraction audit log (one row per Grok attempt) ──────────────────────
CREATE TABLE IF NOT EXISTS "feh_extraction_log" (
  "id"                TEXT NOT NULL,
  "module"            TEXT NOT NULL,
  "metric"            TEXT NOT NULL,
  "old_value"         DOUBLE PRECISION,
  "new_value"         DOUBLE PRECISION,
  "outcome"           TEXT NOT NULL,    -- 'published' | 'sanity_failed' | 'parse_failed' | 'grok_failed'
  "sanity_low"        DOUBLE PRECISION,
  "sanity_high"       DOUBLE PRECISION,
  "grok_model"        TEXT,
  "grok_raw_excerpt"  TEXT,
  "source_url"        TEXT,
  "created_at"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "feh_extraction_log_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "feh_extraction_log_module_idx"
  ON "feh_extraction_log"("module");

CREATE INDEX IF NOT EXISTS "feh_extraction_log_created_at_idx"
  ON "feh_extraction_log"("created_at");
