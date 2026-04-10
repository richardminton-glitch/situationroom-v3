-- Migration: add_signal_type_to_dca_subscribers
-- Adds a signal_type column so one email can hold both a 'dca_in' and
-- 'dca_in_out' (VIP) subscription independently.
--
-- Run on VPS: psql $DATABASE_URL -f this_file.sql

-- 1. Add signal_type column (default 'dca_in' backfills all existing rows)
ALTER TABLE "dca_signal_subscribers"
  ADD COLUMN IF NOT EXISTS "signal_type" TEXT NOT NULL DEFAULT 'dca_in';

-- 2. Drop the old single-column unique index on email
DROP INDEX IF EXISTS "dca_signal_subscribers_email_key";

-- 3. Add composite unique index on (email, signal_type)
CREATE UNIQUE INDEX IF NOT EXISTS "dca_signal_subscribers_email_signal_type_key"
  ON "dca_signal_subscribers"("email", "signal_type");
