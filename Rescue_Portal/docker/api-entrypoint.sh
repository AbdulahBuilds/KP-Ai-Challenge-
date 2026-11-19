#!/bin/sh
set -eu

STORAGE_DIR="${STORAGE_LOCAL_DIR:-/app/storage}"
mkdir -p "$STORAGE_DIR"
chown -R rescue:rescue "$STORAGE_DIR" 2>/dev/null || true

echo "Syncing MongoDB Atlas schema..."
su-exec rescue npx prisma db push --schema apps/api/prisma/schema.prisma --skip-generate

echo "Starting Rescue Portal API..."
exec su-exec rescue node apps/api/dist/main.js
