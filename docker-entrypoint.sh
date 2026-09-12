#!/bin/sh
set -e

echo "Running database migrations..."
npx prisma migrate deploy

echo "Seeding starter registry data (safe to re-run — uses upserts)..."
npm run seed

echo "Starting app..."
exec npm start
