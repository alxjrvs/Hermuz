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

/** Where play happens. Games carry a default; campaigns/game days may override. */
export const LOCATION_TYPE = ['VIRTUAL', 'IN_PERSON'] as const

/** Meal slots a game day can coordinate. */
export const MEAL_KIND = ['LUNCH', 'DINNER'] as const

/** A meal poll's lifecycle. */
export const MEAL_STATUS = ['OPEN', 'CLOSED'] as const

/** Durable scheduler-job lifecycle (see `jobs`). */
export const JOB_STATUS = ['PENDING', 'DONE', 'FAILED', 'CANCELLED'] as const

/**
 * A game-day availability survey's lifecycle: OPEN while collecting responses,
 * CANONIZED once an admin promotes one date into a real game day, CANCELLED if
 * abandoned.
 */
export const SURVEY_STATUS = ['OPEN', 'CANONIZED', 'CANCELLED'] as const

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
  maxSessions: integer('max_sessions'),
  /** Default location type new campaigns/game days of this game inherit. */
  defaultLocationType: text('default_location_type', { enum: LOCATION_TYPE })
    .notNull()
    .default('IN_PERSON')
})

/** `game_days` — a scheduled play session for a game. */
export const gameDays = sqliteTable('game_days', {
  id: uuidPk(),
  title: text('title').notNull(),
  dateTime: text('date_time').notNull(),
  description: text('description'),
  /** Free text: a physical place, or (for VIRTUAL) a join link/URL. */
  location: text('location'),
  /** null = inherit from campaign/game at read time. */
  locationType: text('location_type', { enum: LOCATION_TYPE }),
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
  /** null = inherit from the game. Sessions inherit this unless they override. */
  locationType: text('location_type', { enum: LOCATION_TYPE }),
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
 * `jobs` — durable scheduler queue. The bot process polls this on a timer
 * (Tier 0) and runs each row whose `runAt` is due. `payload` is a JSON string
 * scoped to the `kind`. Rows are idempotent by design: a handler re-derives
 * state from the domain tables, so a duplicate run is a no-op.
 */
export const jobs = sqliteTable('jobs', {
  id: uuidPk(),
  kind: text('kind').notNull(),
  runAt: text('run_at').notNull(),
  payload: text('payload'),
  status: text('status', { enum: JOB_STATUS }).notNull().default('PENDING'),
  attempts: integer('attempts').notNull().default(0),
  lastError: text('last_error'),
  createdAt: isoTimestamp('created_at'),
  updatedAt: isoTimestamp('updated_at')
})

/**
 * `meals` — a lunch/dinner coordination slot on a game day. Each slot polls the
 * relevant players and tracks their responses in `meal_responses`; the scheduler
 * nudges non-responders. `channelId`/`messageId` point at the live summary the
 * bot edits in the game day's `food` channel.
 */
export const meals = sqliteTable('meals', {
  id: uuidPk(),
  gameDayId: text('game_day_id')
    .notNull()
    .references(() => gameDays.id),
  kind: text('kind', { enum: MEAL_KIND }).notNull(),
  /** Free text plan, e.g. "ordering pizza" or "potluck". */
  plan: text('plan'),
  status: text('status', { enum: MEAL_STATUS }).notNull().default('OPEN'),
  channelId: text('channel_id'),
  messageId: text('message_id'),
  /** Respond-by time (ISO). Drives nudge scheduling and auto-close. */
  dueAt: text('due_at'),
  createdAt: isoTimestamp('created_at')
})

/** `meal_responses` — one user's answer to a meal poll. */
export const mealResponses = sqliteTable('meal_responses', {
  id: uuidPk(),
  mealId: text('meal_id')
    .notNull()
    .references(() => meals.id),
  userId: text('user_id')
    .notNull()
    .references(() => users.discordId),
  /** 0/1 boolean — is this user in for this meal. */
  attending: integer('attending').notNull().default(0),
  /** What they're eating/bringing/ordering. */
  note: text('note'),
  respondedAt: isoTimestamp('responded_at')
})

/**
 * `task_templates` — a reusable pre-game setup task owned by a game (the default
 * checklist a new game day of that game inherits). Editable in the GUI; a game
 * day's checklist can be saved back here as the new default.
 */
export const taskTemplates = sqliteTable('task_templates', {
  id: uuidPk(),
  gameId: text('game_id')
    .notNull()
    .references(() => games.id),
  label: text('label').notNull(),
  description: text('description'),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: isoTimestamp('created_at')
})

/**
 * `game_day_tasks` — a concrete checklist item on a game day (materialized from
 * a template or added ad-hoc). Assignable to a user and checkable; the bot
 * mirrors the list into the game day's `logistics` channel.
 */
export const gameDayTasks = sqliteTable('game_day_tasks', {
  id: uuidPk(),
  gameDayId: text('game_day_id')
    .notNull()
    .references(() => gameDays.id),
  /** Source template, when materialized from one (null for ad-hoc items). */
  templateId: text('template_id').references(() => taskTemplates.id),
  label: text('label').notNull(),
  description: text('description'),
  assigneeUserId: text('assignee_user_id').references(() => users.discordId),
  /** 0/1 boolean. */
  done: integer('done').notNull().default(0),
  doneAt: text('done_at'),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: isoTimestamp('created_at')
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
  schedulingChannelId: 'scheduling_channel_id',
  /** IANA timezone (e.g. 'America/New_York') used for recurrence + reminders. */
  timezone: 'timezone',
  /** Days before a session the scheduler auto-opens/announces it. */
  sessionOpenLeadDays: 'session_open_lead_days'
} as const

/**
 * `surveys` — a "survey a new game day" poll. Proposes up to 10 candidate dates
 * for a specific game and collects per-user, per-date availability
 * (`survey_responses`). An admin canonizes one date, which promotes it into a
 * real `game_day` seeded with the available players; `canonizedGameDayId` points
 * at that game day. `channelId`/`messageId` locate the live Discord announcement
 * the bot edits after each response.
 */
export const surveys = sqliteTable('surveys', {
  id: uuidPk(),
  gameId: text('game_id')
    .notNull()
    .references(() => games.id),
  title: text('title'),
  description: text('description'),
  status: text('status', { enum: SURVEY_STATUS }).notNull().default('OPEN'),
  channelId: text('channel_id'),
  messageId: text('message_id'),
  createdByUserId: text('created_by_user_id').references(() => users.discordId),
  /** The winning candidate + the game day it became, set on canonize. */
  canonizedSurveyDateId: text('canonized_survey_date_id'),
  canonizedGameDayId: text('canonized_game_day_id').references(
    () => gameDays.id
  ),
  createdAt: isoTimestamp('created_at'),
  updatedAt: isoTimestamp('updated_at')
})

/** `survey_dates` — one candidate date/time for a survey (up to 10 per survey). */
export const surveyDates = sqliteTable('survey_dates', {
  id: uuidPk(),
  surveyId: text('survey_id')
    .notNull()
    .references(() => surveys.id),
  /** Candidate date/time (ISO). */
  dateTime: text('date_time').notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: isoTimestamp('created_at')
})

/** `survey_responses` — one user's availability for one candidate date (0/1). */
export const surveyResponses = sqliteTable('survey_responses', {
  id: uuidPk(),
  surveyId: text('survey_id')
    .notNull()
    .references(() => surveys.id),
  surveyDateId: text('survey_date_id')
    .notNull()
    .references(() => surveyDates.id),
  userId: text('user_id')
    .notNull()
    .references(() => users.discordId),
  /** 0/1 boolean — is this user available on this date. */
  available: integer('available').notNull().default(0),
  respondedAt: isoTimestamp('responded_at')
})
