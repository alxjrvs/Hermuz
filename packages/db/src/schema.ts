import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'

/**
 * Enum value tuples — single source of truth for the three status enums.
 * SQLite has no native enums; Drizzle renders these as TEXT columns with a
 * CHECK constraint. Kept as `as const` tuples so both the schema and app code
 * (Phase 1 type guards) can derive literal union types from them.
 */
export const GAME_DAY_STATUS = ['CLOSED', 'SCHEDULING', 'CANCELLED'] as const
export const PLAYER_STATUS = ['INTERESTED', 'CONFIRMED'] as const
export const ATTENDANCE_STATUS = [
  'AVAILABLE',
  'INTERESTED',
  'NOT_AVAILABLE',
] as const

/** New UUID text primary key (replaces Postgres `gen_random_uuid()`). */
const uuidPk = () =>
  text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID())

/** ISO-8601 timestamp stored as TEXT (string-comparable, matches legacy behavior). */
const isoTimestamp = (name: string) =>
  text(name).$defaultFn(() => new Date().toISOString())

/**
 * `users` — Discord members. The primary key is `discord_id` (no surrogate id),
 * matching the original Supabase schema: every user FK below references it.
 * The multi-tenant `server_id` column is dropped (single-server).
 */
export const users = sqliteTable('users', {
  discordId: text('discord_id').primaryKey(),
  username: text('username').notNull(),
})

/** `games` — a board/RPG game. Multi-tenant `server_id` dropped. */
export const games = sqliteTable('games', {
  id: uuidPk(),
  name: text('name').notNull(),
  shortName: text('short_name').notNull(),
  description: text('description'),
  discordRoleId: text('discord_role_id'),
  minPlayers: integer('min_players'),
  maxPlayers: integer('max_players'),
})

/** `game_days` — a scheduled play session for a game. */
export const gameDays = sqliteTable('game_days', {
  id: uuidPk(),
  title: text('title').notNull(),
  dateTime: text('date_time').notNull(),
  description: text('description'),
  location: text('location'),
  status: text('status', { enum: GAME_DAY_STATUS }).notNull(),
  gameId: text('game_id').references(() => games.id),
  hostUserId: text('host_user_id').references(() => users.discordId),
  discordRoleId: text('discord_role_id'),
  discordCategoryId: text('discord_category_id'),
  discordEventId: text('discord_event_id'),
  announcementMessageId: text('announcement_message_id'),
  createdAt: isoTimestamp('created_at'),
  updatedAt: isoTimestamp('updated_at'),
})

/** `campaigns` — an ongoing campaign with interest sign-ups. `server_id` dropped. */
export const campaigns = sqliteTable('campaigns', {
  id: uuidPk(),
  title: text('title').notNull(),
  description: text('description'),
  regularGameTime: text('regular_game_time').notNull(),
  discordRoleId: text('discord_role_id').notNull(),
  gameId: text('game_id').references(() => games.id),
  gameName: text('game_name'),
  announcementMessageId: text('announcement_message_id'),
  createdAt: isoTimestamp('created_at'),
})

/** `players` — a user's membership/interest in a campaign. */
export const players = sqliteTable('players', {
  id: uuidPk(),
  campaignId: text('campaign_id')
    .notNull()
    .references(() => campaigns.id),
  userId: text('user_id')
    .notNull()
    .references(() => users.discordId),
  characterName: text('character_name'),
  status: text('status', { enum: PLAYER_STATUS })
    .notNull()
    .default('INTERESTED'),
  createdAt: isoTimestamp('created_at'),
})

/** `attendances` — a user's RSVP status for a game day. */
export const attendances = sqliteTable('attendances', {
  id: uuidPk(),
  gameDayId: text('game_day_id').references(() => gameDays.id),
  userId: text('user_id').references(() => users.discordId),
  status: text('status', { enum: ATTENDANCE_STATUS }).notNull(),
})
