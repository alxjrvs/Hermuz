import { runMigrations } from './client'

// Standalone migration runner: `bun run migrate` (or `bun --filter '@hermuz/db' migrate`).
runMigrations()
console.log(`Migrations applied to ${process.env.DATABASE_PATH ?? './hermuz.db'}`)
