#!/bin/bash
set -e

echo "→ Pulling latest..."
git pull

echo "→ Installing dependencies..."
npm ci

echo "→ Generating Prisma client..."
npx prisma generate

echo "→ Syncing database schema..."
# Load DATABASE_URL from .env.local for prisma db push
export $(grep -v '^#' .env.local | grep DATABASE_URL | xargs)
npx prisma db push --accept-data-loss --skip-generate || echo "⚠ db push failed (non-fatal)"

echo "→ Building Next.js..."
npm run build

echo "→ Creating directories..."
mkdir -p logs data

echo "→ Restarting PM2..."
pm2 describe situationroom-v3 > /dev/null 2>&1 \
  && pm2 restart situationroom-v3 \
  || pm2 start ecosystem.config.js

pm2 save
echo "✓ Deploy complete"
