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
  jobs,
  meals,
  mealResponses,
  taskTemplates,
  gameDayTasks,
  GAME_DAY_STATUS,
  PLAYER_STATUS,
  ATTENDANCE_STATUS,
  SCHEDULING_KIND,
  LOCATION_TYPE,
  MEAL_KIND,
  MEAL_STATUS,
  JOB_STATUS
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
export type Job = typeof jobs.$inferSelect
export type NewJob = typeof jobs.$inferInsert
export type Meal = typeof meals.$inferSelect
export type NewMeal = typeof meals.$inferInsert
export type MealResponse = typeof mealResponses.$inferSelect
export type NewMealResponse = typeof mealResponses.$inferInsert
export type TaskTemplate = typeof taskTemplates.$inferSelect
export type NewTaskTemplate = typeof taskTemplates.$inferInsert
export type GameDayTask = typeof gameDayTasks.$inferSelect
export type NewGameDayTask = typeof gameDayTasks.$inferInsert

// Status union types (replace the Supabase `Enums<>`).
export type GameDayStatus = (typeof GAME_DAY_STATUS)[number]
export type PlayerStatus = (typeof PLAYER_STATUS)[number]
export type AttendanceStatus = (typeof ATTENDANCE_STATUS)[number]
export type SchedulingKind = (typeof SCHEDULING_KIND)[number]
export type LocationType = (typeof LOCATION_TYPE)[number]
export type MealKind = (typeof MEAL_KIND)[number]
export type MealStatus = (typeof MEAL_STATUS)[number]
export type JobStatus = (typeof JOB_STATUS)[number]
