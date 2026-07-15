// Domain entity types for the Hermuz API.

export interface User {
  id: string
  username: string
  isAdmin: boolean
}

export interface Game {
  id: string
  name: string
  shortName: string
  description: string | null
  discordRoleId: string | null
  minPlayers: number | null
  maxPlayers: number | null
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
  gameId: string | null
  hostUserId: string | null
  discordRoleId: string | null
}

export interface GameDayInput {
  title: string
  dateTime: string
  description?: string | null
  location?: string | null
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
}

export interface CampaignInput {
  title: string
  description?: string | null
  regularGameTime?: string | null
  gameId?: string | null
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
