#!/bin/sh
set -e

# SQLite: no separate database server, no password. The file lives in the
# mounted /app/data volume and is created automatically if it doesn't
# exist yet. The Prisma CLI reads DATABASE_URL directly from the
# environment (it doesn't know about the default in src/lib/env.ts, which
# only applies to our own app code) — default it here too, to the same path.
DATA_DIR="${STORAGE_LOCAL_PATH:-/app/data}"
mkdir -p "$DATA_DIR"
export DATABASE_URL="${DATABASE_URL:-file:${DATA_DIR}/production.db}"

echo "Syncing database schema..."
npx prisma db push --skip-generate --accept-data-loss

echo "Seeding starter registry data (safe to re-run — uses upserts)..."
npm run seed

echo "Starting app..."
exec npm start
