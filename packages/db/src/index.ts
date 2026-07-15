export { db, runMigrations, schema, sqlite } from './client'
export * from './repositories'
export * from './schema'

import type {
  ATTENDANCE_STATUS,
  attendances,
  campaigns,
  GAME_DAY_STATUS,
  gameDays,
  gameDayTasks,
  games,
  JOB_STATUS,
  jobs,
  LOCATION_TYPE,
  MEAL_KIND,
  MEAL_STATUS,
  mealResponses,
  meals,
  PLAYER_STATUS,
  players,
  SCHEDULING_KIND,
  SURVEY_STATUS,
  surveyDates,
  surveyResponses,
  surveys,
  taskTemplates,
  users
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
export type Survey = typeof surveys.$inferSelect
export type NewSurvey = typeof surveys.$inferInsert
export type SurveyDate = typeof surveyDates.$inferSelect
export type NewSurveyDate = typeof surveyDates.$inferInsert
export type SurveyResponse = typeof surveyResponses.$inferSelect
export type NewSurveyResponse = typeof surveyResponses.$inferInsert

// Status union types (replace the Supabase `Enums<>`).
export type GameDayStatus = (typeof GAME_DAY_STATUS)[number]
export type PlayerStatus = (typeof PLAYER_STATUS)[number]
export type AttendanceStatus = (typeof ATTENDANCE_STATUS)[number]
export type SchedulingKind = (typeof SCHEDULING_KIND)[number]
export type LocationType = (typeof LOCATION_TYPE)[number]
export type MealKind = (typeof MEAL_KIND)[number]
export type MealStatus = (typeof MEAL_STATUS)[number]
export type JobStatus = (typeof JOB_STATUS)[number]
export type SurveyStatus = (typeof SURVEY_STATUS)[number]
