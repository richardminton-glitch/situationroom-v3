#!/bin/bash
set -e

echo "→ Pulling latest..."
git pull

echo "→ Installing dependencies..."
npm ci

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
