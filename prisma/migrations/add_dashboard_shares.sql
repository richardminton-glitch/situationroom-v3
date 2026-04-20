-- Migration: add_dashboard_shares
-- VIP dashboard sharing: 5 tokenised invite slots per VIP, pointing at a single
-- UserLayout. Invitees bind to the share on first authenticated view; access
-- persists while the owner's tier remains 'vip'.
--
-- Run on VPS: psql $DATABASE_URL -f this_file.sql
-- Or via:    npx prisma migrate dev --name add_dashboard_shares

CREATE TABLE IF NOT EXISTS "dashboard_shares" (
  "id"             TEXT NOT NULL,
  "owner_id"       TEXT NOT NULL,
  "layout_id"      TEXT NOT NULL,
  "token"          TEXT NOT NULL,
  "label"          TEXT NOT NULL DEFAULT '',
  "invite_email"   TEXT,
  "bound_user_id"  TEXT,
  "revoked_at"     TIMESTAMP(3),
  "created_at"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "last_viewed_at" TIMESTAMP(3),

  CONSTRAINT "dashboard_shares_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "dashboard_shares_token_key"
  ON "dashboard_shares"("token");

CREATE INDEX IF NOT EXISTS "dashboard_shares_owner_id_idx"
  ON "dashboard_shares"("owner_id");

CREATE INDEX IF NOT EXISTS "dashboard_shares_bound_user_id_idx"
  ON "dashboard_shares"("bound_user_id");

CREATE INDEX IF NOT EXISTS "dashboard_shares_layout_id_idx"
  ON "dashboard_shares"("layout_id");

ALTER TABLE "dashboard_shares"
  ADD CONSTRAINT "dashboard_shares_owner_id_fkey"
  FOREIGN KEY ("owner_id") REFERENCES "users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "dashboard_shares"
  ADD CONSTRAINT "dashboard_shares_bound_user_id_fkey"
  FOREIGN KEY ("bound_user_id") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "dashboard_shares"
  ADD CONSTRAINT "dashboard_shares_layout_id_fkey"
  FOREIGN KEY ("layout_id") REFERENCES "user_layouts"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
