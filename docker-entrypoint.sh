#!/bin/sh
set -e

# The Prisma CLI reads DATABASE_URL directly from the environment — it
# has no idea about our app's DB_HOST/DB_USER/DB_NAME/DB_PASSWORD split
# (that's resolved in src/lib/secrets.ts, which only runs inside the
# Next.js app itself, not for CLI commands like `prisma migrate deploy`).
# Build it here too if it wasn't provided directly.
if [ -z "$DATABASE_URL" ]; then
  : "${DB_HOST:?Set DATABASE_URL directly, or DB_HOST/DB_USER/DB_NAME/DB_PASSWORD}"
  : "${DB_USER:?Set DATABASE_URL directly, or DB_HOST/DB_USER/DB_NAME/DB_PASSWORD}"
  : "${DB_NAME:?Set DATABASE_URL directly, or DB_HOST/DB_USER/DB_NAME/DB_PASSWORD}"
  : "${DB_PASSWORD:?Set DATABASE_URL directly, or DB_HOST/DB_USER/DB_NAME/DB_PASSWORD}"
  # Note: if your DB_PASSWORD contains special URL characters (@ : / ? #),
  # set DATABASE_URL directly instead — this doesn't URL-encode it.
  export DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT:-5432}/${DB_NAME}"
fi

echo "Running database migrations..."
npx prisma migrate deploy

echo "Seeding starter registry data (safe to re-run — uses upserts)..."
npm run seed

echo "Starting app..."
exec npm start
