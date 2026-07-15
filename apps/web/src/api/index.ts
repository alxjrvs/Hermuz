// Typed API surface grouped by resource. Every method returns a Promise and
// throws ApiError on failure (see client.ts).

import type {
  Attendance,
  AttendanceStatus,
  Campaign,
  CampaignInput,
  Game,
  GameDay,
  GameDayInput,
  GameInput,
  Player,
  PlayerStatus,
  Settings,
  User
} from '../types'
import { apiFetch } from './client'

export const meApi = {
  get: () => apiFetch<User>('/api/me')
}

export const gamesApi = {
  list: () => apiFetch<Game[]>('/api/games'),
  get: (id: string) => apiFetch<Game>(`/api/games/${id}`),
  create: (body: GameInput) =>
    apiFetch<Game>('/api/games', { method: 'POST', body }),
  update: (id: string, body: Partial<GameInput>) =>
    apiFetch<Game>(`/api/games/${id}`, { method: 'PATCH', body }),
  remove: (id: string) =>
    apiFetch<void>(`/api/games/${id}`, { method: 'DELETE' })
}

export const gameDaysApi = {
  list: () => apiFetch<GameDay[]>('/api/game-days'),
  get: (id: string) => apiFetch<GameDay>(`/api/game-days/${id}`),
  attendances: (id: string) =>
    apiFetch<Attendance[]>(`/api/game-days/${id}/attendances`),
  create: (body: GameDayInput) =>
    apiFetch<GameDay>('/api/game-days', { method: 'POST', body }),
  update: (id: string, body: Partial<GameDayInput>) =>
    apiFetch<GameDay>(`/api/game-days/${id}`, { method: 'PATCH', body }),
  announce: (id: string) =>
    apiFetch<GameDay>(`/api/game-days/${id}/announce`, { method: 'POST' }),
  cancel: (id: string) =>
    apiFetch<GameDay>(`/api/game-days/${id}/cancel`, { method: 'POST' })
}

export const campaignsApi = {
  list: () => apiFetch<Campaign[]>('/api/campaigns'),
  get: (id: string) => apiFetch<Campaign>(`/api/campaigns/${id}`),
  players: (id: string) => apiFetch<Player[]>(`/api/campaigns/${id}/players`),
  sessions: (id: string) =>
    apiFetch<GameDay[]>(`/api/campaigns/${id}/sessions`),
  create: (body: CampaignInput) =>
    apiFetch<Campaign>('/api/campaigns', { method: 'POST', body }),
  update: (id: string, body: Partial<CampaignInput>) =>
    apiFetch<Campaign>(`/api/campaigns/${id}`, { method: 'PATCH', body }),
  remove: (id: string) =>
    apiFetch<void>(`/api/campaigns/${id}`, { method: 'DELETE' }),
  announce: (id: string) =>
    apiFetch<Campaign>(`/api/campaigns/${id}/announce`, { method: 'POST' }),
  generate: (id: string) =>
    apiFetch<GameDay[]>(`/api/campaigns/${id}/generate`, { method: 'POST' }),
  scheduleNext: (id: string, dateTime?: string) =>
    apiFetch<GameDay>(`/api/campaigns/${id}/schedule-next`, {
      method: 'POST',
      body: dateTime ? { dateTime } : {}
    }),
  cancelSession: (id: string, gameDayId: string) =>
    apiFetch<GameDay>(`/api/campaigns/${id}/sessions/${gameDayId}/cancel`, {
      method: 'POST'
    })
}

export const attendancesApi = {
  update: (id: string, status: AttendanceStatus) =>
    apiFetch<Attendance>(`/api/attendances/${id}`, {
      method: 'PATCH',
      body: { status }
    }),
  set: (gameDayId: string, userId: string, status: AttendanceStatus) =>
    apiFetch<Attendance>(
      `/api/attendances/game-day/${gameDayId}/user/${userId}`,
      { method: 'PUT', body: { status } }
    )
}

export const playersApi = {
  update: (
    id: string,
    body: { status?: PlayerStatus; characterName?: string | null }
  ) => apiFetch<Player>(`/api/players/${id}`, { method: 'PATCH', body }),
  remove: (id: string) =>
    apiFetch<void>(`/api/players/${id}`, { method: 'DELETE' })
}

export const settingsApi = {
  get: () => apiFetch<Settings>('/api/settings'),
  setSchedulingChannel: (channelId: string) =>
    apiFetch<Settings>('/api/settings/scheduling-channel', {
      method: 'PUT',
      body: { channelId }
    })
}
