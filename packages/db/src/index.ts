export * from './schema'
export { db, sqlite, schema, runMigrations } from './client'
export * from './repositories'

import {
  users,
  games,
  gameDays,
  campaigns,
  players,
  attendances,
  GAME_DAY_STATUS,
  PLAYER_STATUS,
  ATTENDANCE_STATUS
} from './schema'

// Row types (replace the Supabase-generated `Tables<>` / `TablesInsert<>`).
export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
export type Game = typeof games.$inferSelect
export type NewGame = typeof games.$inferInsert
export type GameDay = typeof gameDays.$inferSelect
export type NewGameDay = typeof gameDays.$inferInsert
export type Campaign = typeof campaigns.$inferSelect
export type NewCampaign = typeof campaigns.$inferInsert
export type Player = typeof players.$inferSelect
export type NewPlayer = typeof players.$inferInsert
export type Attendance = typeof attendances.$inferSelect
export type NewAttendance = typeof attendances.$inferInsert

// Status union types (replace the Supabase `Enums<>`).
export type GameDayStatus = (typeof GAME_DAY_STATUS)[number]
export type PlayerStatus = (typeof PLAYER_STATUS)[number]
export type AttendanceStatus = (typeof ATTENDANCE_STATUS)[number]
