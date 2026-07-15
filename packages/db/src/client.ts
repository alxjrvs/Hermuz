import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Database } from 'bun:sqlite'
import { drizzle } from 'drizzle-orm/bun-sqlite'
import { migrate } from 'drizzle-orm/bun-sqlite/migrator'
import * as schema from './schema'

/**
 * The single SQLite connection for the whole process. One process = one writer,
 * which is exactly how SQLite wants to be used with two surfaces (bot + API).
 * On Render this file lives on the mounted disk (DATABASE_PATH=/var/data/hermuz.db).
 */
const databasePath = process.env.DATABASE_PATH ?? './hermuz.db'

// Durability guard: on Render the container filesystem is ephemeral, so a
// relative/default DB path is wiped on every deploy. A production run must point
// DATABASE_PATH at a mounted persistent disk (e.g. /var/data/hermuz.db).
if (!process.env.DATABASE_PATH && process.env.NODE_ENV === 'production') {
  console.warn(
    `WARN: DATABASE_PATH is unset; using "${databasePath}". On an ephemeral ` +
      'filesystem (e.g. Render without a mounted disk) the database will be ' +
      'LOST on every deploy. Set DATABASE_PATH to a persistent disk path.'
  )
}

export const sqlite = new Database(databasePath, { create: true })

// WAL: concurrent readers alongside the single writer. Plus FK enforcement and a
// busy timeout so brief lock waits retry instead of throwing SQLITE_BUSY.
sqlite.exec('PRAGMA journal_mode = WAL;')
sqlite.exec('PRAGMA foreign_keys = ON;')
sqlite.exec('PRAGMA busy_timeout = 5000;')

export const db = drizzle(sqlite, { schema })

export { schema }

/**
 * Apply all pending migrations from `packages/db/migrations`. Call this on boot,
 * before opening the Discord gateway or serving the API (Phase 1).
 */
export function runMigrations(): void {
  const migrationsFolder = join(
    dirname(fileURLToPath(import.meta.url)),
    '..',
    'migrations'
  )
  migrate(db, { migrationsFolder })
}
