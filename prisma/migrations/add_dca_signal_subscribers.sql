-- Migration: add_dca_signal_subscribers
-- Run on VPS: psql $DATABASE_URL -f this_file.sql
-- Or via: npx prisma migrate dev --name add_dca_signal_subscribers

CREATE TABLE IF NOT EXISTS "dca_signal_subscribers" (
  "id"            TEXT NOT NULL,
  "email"         TEXT NOT NULL,
  "frequency"     TEXT NOT NULL DEFAULT 'weekly',
  "base_amount"   INTEGER NOT NULL DEFAULT 100,
  "confirmed"     BOOLEAN NOT NULL DEFAULT false,
  "confirm_token" TEXT,
  "unsub_token"   TEXT NOT NULL,
  "confirmed_at"  TIMESTAMP(3),
  "last_sent_at"  TIMESTAMP(3),
  "created_at"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "dca_signal_subscribers_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "dca_signal_subscribers_email_key"
  ON "dca_signal_subscribers"("email");

CREATE UNIQUE INDEX IF NOT EXISTS "dca_signal_subscribers_confirm_token_key"
  ON "dca_signal_subscribers"("confirm_token");

CREATE UNIQUE INDEX IF NOT EXISTS "dca_signal_subscribers_unsub_token_key"
  ON "dca_signal_subscribers"("unsub_token");
