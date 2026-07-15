// Domain entity types for the Hermuz API.

export interface User {
  id: string
  username: string
  isAdmin: boolean
}

/** A Discord identity resolved via GET /api/users (for names + avatars). */
export interface ResolvedUser {
  id: string
  username: string
  displayName: string
  avatarUrl: string | null
}

export type SchedulingKind = 'SCHEDULED' | 'REPEATING'

export type LocationType = 'VIRTUAL' | 'IN_PERSON'

export interface Game {
  id: string
  name: string
  shortName: string
  description: string | null
  discordRoleId: string | null
  minPlayers: number | null
  maxPlayers: number | null
  defaultSchedulingKind: SchedulingKind
  maxSessions: number | null
  defaultLocationType: LocationType
}

export type GameInput = Omit<Game, 'id'>

export type GameDayStatus = 'CLOSED' | 'SCHEDULING' | 'CANCELLED'

export interface GameDay {
  id: string
  title: string
  dateTime: string // ISO 8601
  description: string | null
  location: string | null
  status: GameDayStatus
  locationType: LocationType | null
  gameId: string | null
  hostUserId: string | null
  discordRoleId: string | null
  campaignId: string | null
  sessionNumber: number | null
}

export interface GameDayInput {
  title: string
  dateTime: string
  description?: string | null
  location?: string | null
  locationType?: LocationType | null
  gameId?: string | null
}

export type AttendanceStatus = 'AVAILABLE' | 'INTERESTED' | 'NOT_AVAILABLE'

export interface Attendance {
  id: string
  gameDayId: string
  userId: string
  status: AttendanceStatus
}

export interface Campaign {
  id: string
  title: string
  description: string | null
  regularGameTime: string | null
  discordRoleId: string | null
  gameId: string | null
  gameName: string | null
  schedulingKind: SchedulingKind
  maxSessions: number | null
  locationType: LocationType | null
  recurrenceAnchor: string | null // ISO datetime of the first session (series start)
  recurrenceWeekday: number | null // 0=Sun..6=Sat (legacy fallback)
  recurrenceTime: string | null // 'HH:MM' (legacy fallback)
  recurrenceIntervalWeeks: number | null
}

export interface CampaignInput {
  title: string
  description?: string | null
  regularGameTime?: string | null
  gameId?: string | null
  schedulingKind?: SchedulingKind
  maxSessions?: number | null
  locationType?: LocationType | null
  recurrenceAnchor?: string | null
  recurrenceWeekday?: number | null
  recurrenceTime?: string | null
  recurrenceIntervalWeeks?: number | null
}

export type PlayerStatus = 'INTERESTED' | 'CONFIRMED'

export interface Player {
  id: string
  campaignId: string
  userId: string
  characterName: string | null
  status: PlayerStatus
}

export interface Settings {
  schedulingChannelId: string | null
}

export interface TaskTemplate {
  id: string
  gameId: string
  label: string
  description: string | null
  sortOrder: number
}

export interface GameDayTask {
  id: string
  gameDayId: string
  templateId: string | null
  label: string
  description: string | null
  assigneeUserId: string | null
  done: number // 0/1
  doneAt: string | null
  sortOrder: number
}

export type MealKind = 'LUNCH' | 'DINNER'

export interface MealResponse {
  id: string
  mealId: string
  userId: string
  attending: number // 0/1
  note: string | null
  respondedAt: string | null
}

export interface Meal {
  id: string
  gameDayId: string
  kind: MealKind
  plan: string | null
  status: 'OPEN' | 'CLOSED'
  channelId: string | null
  messageId: string | null
  dueAt: string | null
  responses: MealResponse[]
}
