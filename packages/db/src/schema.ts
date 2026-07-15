import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'

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
  'NOT_AVAILABLE'
] as const

/**
 * How a game/campaign is scheduled:
 * - SCHEDULED: independent one-off instances (each session scheduled on its own).
 * - REPEATING: a regular cadence that auto-generates a recurring series of sessions.
 */
export const SCHEDULING_KIND = ['SCHEDULED', 'REPEATING'] as const

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
  username: text('username').notNull()
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
  /** Default scheduling kind new campaigns of this game inherit. */
  defaultSchedulingKind: text('default_scheduling_kind', {
    enum: SCHEDULING_KIND
  })
    .notNull()
    .default('SCHEDULED'),
  /** Default cap on a campaign's sessions (null = uncapped). Campaigns may override. */
  maxSessions: integer('max_sessions')
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
  /** When set, this game day is a session of the given campaign. */
  campaignId: text('campaign_id').references(() => campaigns.id),
  /** 1-based ordinal within its campaign (null for standalone game days). */
  sessionNumber: integer('session_number'),
  createdAt: isoTimestamp('created_at'),
  updatedAt: isoTimestamp('updated_at')
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
  /** Inherited from the game at create, overridable. */
  schedulingKind: text('scheduling_kind', { enum: SCHEDULING_KIND })
    .notNull()
    .default('SCHEDULED'),
  /** Cap on total sessions (null = uncapped). Inherited from the game, overridable. */
  maxSessions: integer('max_sessions'),
  /**
   * Recurrence for REPEATING campaigns. `recurrenceAnchor` is the FIRST session's
   * date/time (ISO) — the series start, which may be in the past — and is the
   * source of truth for the cadence; session N = anchor + (N-1)·intervalWeeks.
   * This is what lets "started this past Monday, every other week" be expressed
   * (the weekday/time pair could only anchor to the next occurrence). The legacy
   * `recurrenceWeekday`/`recurrenceTime` remain as a fallback when no anchor is set.
   */
  recurrenceAnchor: text('recurrence_anchor'),
  recurrenceWeekday: integer('recurrence_weekday'),
  recurrenceTime: text('recurrence_time'),
  recurrenceIntervalWeeks: integer('recurrence_interval_weeks'),
  createdAt: isoTimestamp('created_at')
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
  createdAt: isoTimestamp('created_at')
})

/** `attendances` — a user's RSVP status for a game day. */
export const attendances = sqliteTable('attendances', {
  id: uuidPk(),
  gameDayId: text('game_day_id').references(() => gameDays.id),
  userId: text('user_id').references(() => users.discordId),
  status: text('status', { enum: ATTENDANCE_STATUS }).notNull()
})

/**
 * `settings` — single-server key/value config. Replaces the old per-server
 * `discord_servers` columns (e.g. `scheduling_channel_id`) now that Hermuz
 * serves exactly one guild. Both the bot and the web GUI read/write these.
 */
export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull()
})

/** Well-known setting keys. */
export const SETTING_KEYS = {
  schedulingChannelId: 'scheduling_channel_id'
} as const
