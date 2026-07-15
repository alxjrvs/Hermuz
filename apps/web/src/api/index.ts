// Typed API surface grouped by resource. Every method returns a Promise and
// throws ApiError on failure (see client.ts).

import { apiFetch } from './client'
import type {
  Attendance,
  Campaign,
  CampaignInput,
  Game,
  GameDay,
  GameDayInput,
  GameInput,
  Player,
  PlayerStatus,
  AttendanceStatus,
  ResolvedUser,
  Settings,
  TaskTemplate,
  GameDayTask,
  Meal,
  MealKind,
  MealResponse,
  User
} from '../types'

export const meApi = {
  get: () => apiFetch<User>('/api/me')
}

export const usersApi = {
  resolve: (ids: string[]) =>
    ids.length === 0
      ? Promise.resolve([] as ResolvedUser[])
      : apiFetch<ResolvedUser[]>(
          `/api/users?ids=${encodeURIComponent(ids.join(','))}`
        )
}

export const gamesApi = {
  list: () => apiFetch<Game[]>('/api/games'),
  get: (id: string) => apiFetch<Game>(`/api/games/${id}`),
  create: (body: GameInput) =>
    apiFetch<Game>('/api/games', { method: 'POST', body }),
  update: (id: string, body: Partial<GameInput>) =>
    apiFetch<Game>(`/api/games/${id}`, { method: 'PATCH', body }),
  remove: (id: string) =>
    apiFetch<void>(`/api/games/${id}`, { method: 'DELETE' }),
  taskTemplates: (id: string) =>
    apiFetch<TaskTemplate[]>(`/api/games/${id}/task-templates`),
  setTaskTemplates: (
    id: string,
    items: { label: string; description?: string | null }[]
  ) =>
    apiFetch<TaskTemplate[]>(`/api/games/${id}/task-templates`, {
      method: 'PUT',
      body: { items }
    })
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
    apiFetch<GameDay>(`/api/game-days/${id}/cancel`, { method: 'POST' }),
  tasks: (id: string) =>
    apiFetch<GameDayTask[]>(`/api/game-days/${id}/tasks`),
  addTask: (id: string, label: string, description?: string | null) =>
    apiFetch<GameDayTask>(`/api/game-days/${id}/tasks`, {
      method: 'POST',
      body: { label, description }
    }),
  updateTask: (
    id: string,
    taskId: string,
    body: {
      done?: boolean
      assigneeUserId?: string | null
      label?: string
      description?: string | null
    }
  ) =>
    apiFetch<GameDayTask>(`/api/game-days/${id}/tasks/${taskId}`, {
      method: 'PATCH',
      body
    }),
  deleteTask: (id: string, taskId: string) =>
    apiFetch<void>(`/api/game-days/${id}/tasks/${taskId}`, {
      method: 'DELETE'
    }),
  saveTasksAsDefault: (id: string) =>
    apiFetch<TaskTemplate[]>(`/api/game-days/${id}/tasks/save-as-default`, {
      method: 'POST'
    }),
  meals: (id: string) => apiFetch<Meal[]>(`/api/game-days/${id}/meals`),
  addMeal: (
    id: string,
    kind: MealKind,
    plan?: string | null,
    dueAt?: string | null
  ) =>
    apiFetch<Meal>(`/api/game-days/${id}/meals`, {
      method: 'POST',
      body: { kind, plan, dueAt }
    }),
  respondMeal: (
    id: string,
    mealId: string,
    attending: boolean,
    note?: string | null
  ) =>
    apiFetch<MealResponse>(`/api/game-days/${id}/meals/${mealId}/me`, {
      method: 'PUT',
      body: { attending, note }
    }),
  closeMeal: (id: string, mealId: string) =>
    apiFetch<Meal>(`/api/game-days/${id}/meals/${mealId}/close`, {
      method: 'POST'
    })
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
    ),
  // Self-service: the logged-in member sets their own RSVP.
  setMine: (gameDayId: string, status: AttendanceStatus) =>
    apiFetch<Attendance>(`/api/attendances/game-day/${gameDayId}/me`, {
      method: 'PUT',
      body: { status }
    })
}

export const playersApi = {
  update: (
    id: string,
    body: { status?: PlayerStatus; characterName?: string | null }
  ) => apiFetch<Player>(`/api/players/${id}`, { method: 'PATCH', body }),
  remove: (id: string) =>
    apiFetch<void>(`/api/players/${id}`, { method: 'DELETE' }),
  // Self-service: the logged-in member manages their own membership.
  joinMine: (campaignId: string) =>
    apiFetch<Player>(`/api/players/campaign/${campaignId}/me`, {
      method: 'PUT'
    }),
  leaveMine: (campaignId: string) =>
    apiFetch<void>(`/api/players/campaign/${campaignId}/me`, {
      method: 'DELETE'
    }),
  setMyStatus: (campaignId: string, status: PlayerStatus) =>
    apiFetch<Player>(`/api/players/campaign/${campaignId}/me/status`, {
      method: 'PUT',
      body: { status }
    }),
  setMyCharacter: (campaignId: string, characterName: string) =>
    apiFetch<Player>(`/api/players/campaign/${campaignId}/me/character`, {
      method: 'PUT',
      body: { characterName }
    })
}

export const settingsApi = {
  get: () => apiFetch<Settings>('/api/settings'),
  setSchedulingChannel: (channelId: string) =>
    apiFetch<Settings>('/api/settings/scheduling-channel', {
      method: 'PUT',
      body: { channelId }
    })
}
