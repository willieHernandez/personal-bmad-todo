import Database from 'better-sqlite3';
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { sql } from 'drizzle-orm';
import * as schema from './schema.js';

let instance: BetterSQLite3Database<typeof schema> | null = null;

export function getTestDb(): BetterSQLite3Database<typeof schema> {
  if (instance) return instance;

  const sqlite = new Database(':memory:');
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');

  const testDb = drizzle(sqlite, { schema });

  testDb.run(sql`
    CREATE TABLE nodes (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      type TEXT NOT NULL,
      parent_id TEXT REFERENCES nodes(id) ON DELETE CASCADE,
      sort_order INTEGER NOT NULL DEFAULT 0,
      is_completed INTEGER NOT NULL DEFAULT 0,
      markdown_body TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);

  testDb.run(sql`CREATE INDEX idx_nodes_parent_id ON nodes(parent_id)`);
  testDb.run(sql`CREATE INDEX idx_nodes_type ON nodes(type)`);

  testDb.run(sql`
    CREATE TABLE tree_view_state (
      node_id TEXT PRIMARY KEY REFERENCES nodes(id) ON DELETE CASCADE,
      is_expanded INTEGER NOT NULL DEFAULT 1
    )
  `);

  instance = testDb;
  return testDb;
}

export function clearTestDb(): void {
  const db = getTestDb();
  db.run(sql`DELETE FROM tree_view_state`);
  db.run(sql`DELETE FROM nodes`);
}
