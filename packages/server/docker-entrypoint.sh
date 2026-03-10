#!/bin/sh
set -e

# Check if DB has been initialized by looking for the nodes table
db_has_schema() {
  if [ ! -f "$DB_PATH" ]; then
    return 1
  fi
  node -e "
    const Database = require('better-sqlite3');
    const db = new Database(process.env.DB_PATH);
    const row = db.prepare(\"SELECT name FROM sqlite_master WHERE type='table' AND name='nodes'\").get();
    process.exit(row ? 0 : 1);
  "
}

# Run schema push on fresh/empty DB or when explicitly requested
if ! db_has_schema; then
  echo "No initialized database at $DB_PATH — running schema push..."
  pnpm --filter server db:push
elif [ "$RUN_MIGRATIONS" = "true" ]; then
  echo "RUN_MIGRATIONS=true — running schema push..."
  pnpm --filter server db:push
fi

exec node packages/server/dist/index.js
