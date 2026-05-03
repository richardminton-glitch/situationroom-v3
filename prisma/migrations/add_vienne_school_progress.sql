-- Migration: add_vienne_school_progress
-- Run on VPS: psql $DATABASE_URL -f this_file.sql
-- Or via:    npx prisma migrate dev --name add_vienne_school_progress
--
-- Stores per-user Vienna School curriculum progress: which modules' field
-- tests have been passed, and the graduation timestamp set on the first
-- completion of all 6 modules. Mirrors the spec § 6.4 schema.

CREATE TABLE IF NOT EXISTS "vienne_school_progress" (
  "user_id"            TEXT NOT NULL,
  "modules_completed"  TEXT[] NOT NULL DEFAULT '{}',
  "books_read"         TEXT[] NOT NULL DEFAULT '{}',
  "graduation_date"    TIMESTAMP(3),
  "updated_at"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "vienne_school_progress_pkey" PRIMARY KEY ("user_id"),
  CONSTRAINT "vienne_school_progress_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
);
