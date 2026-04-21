-- Migration: add_dashboard_share_theme
-- VIP can now pick the theme (parchment or dark) their invitees see on the
-- /shared/[token] page. Stored per-share so different invitees can see the
-- same dashboard in different modes.
--
-- Run on VPS: psql $DATABASE_URL -f this_file.sql

ALTER TABLE "dashboard_shares"
  ADD COLUMN IF NOT EXISTS "theme" TEXT NOT NULL DEFAULT 'parchment';
