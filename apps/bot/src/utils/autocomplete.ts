import {
  getAllCampaigns,
  getAllGameDays,
  getAllGames,
  getGameDayTasks,
  getOpenSurveys,
  getPlayersByUser,
  getSurveyDates,
  getSurveyResponses
} from '@hermuz/db'
import type { AutocompleteInteraction } from 'discord.js'
import { logger } from '~/utils/logger'

const MAX_CHOICES = 25

function short(s: string, n = 90): string {
  return s.length > n ? `${s.slice(0, n - 1)}…` : s
}

function matches(haystack: string, needle: string): boolean {
  return haystack.toLowerCase().includes(needle.toLowerCase())
}

/** Autocomplete a `game_day` option to non-cancelled game days, soonest first. */
export async function respondGameDayAutocomplete(
  interaction: AutocompleteInteraction
): Promise<void> {
  try {
    const focused = interaction.options.getFocused()
    const gameDays = (await getAllGameDays())
      .filter((gd) => gd.status !== 'CANCELLED' && matches(gd.title, focused))
      .sort((a, b) => a.dateTime.localeCompare(b.dateTime))
      .slice(0, MAX_CHOICES)
    await interaction.respond(
      gameDays.map((gd) => ({
        name: short(
          `${gd.title} — ${new Date(gd.dateTime).toLocaleDateString()}`
        ),
        value: gd.id
      }))
    )
  } catch (err) {
    logger.error('Game day autocomplete failed:', err)
    await interaction.respond([])
  }
}

/** Autocomplete a `campaign` option by title. */
export async function respondCampaignAutocomplete(
  interaction: AutocompleteInteraction
): Promise<void> {
  try {
    const focused = interaction.options.getFocused()
    const campaigns = (await getAllCampaigns())
      .filter((c) => matches(c.title, focused))
      .slice(0, MAX_CHOICES)
    await interaction.respond(
      campaigns.map((c) => ({ name: short(c.title), value: c.id }))
    )
  } catch (err) {
    logger.error('Campaign autocomplete failed:', err)
    await interaction.respond([])
  }
}

/**
 * Autocomplete for the `/task` commands: the `game_day` option lists game days,
 * and the `task` option lists tasks scoped to the already-chosen game day.
 */
export async function respondTaskAutocomplete(
  interaction: AutocompleteInteraction
): Promise<void> {
  try {
    const focused = interaction.options.getFocused(true)
    if (focused.name === 'game_day') {
      return respondGameDayAutocomplete(interaction)
    }
    // focused.name === 'task'
    const gameDayId = interaction.options.getString('game_day', false)
    if (!gameDayId) return interaction.respond([])
    const tasks = (await getGameDayTasks(gameDayId))
      .filter((t) => matches(t.label, String(focused.value)))
      .slice(0, MAX_CHOICES)
    await interaction.respond(
      tasks.map((t) => ({
        name: short(`${t.done ? '✅ ' : ''}${t.label}`),
        value: t.id
      }))
    )
  } catch (err) {
    logger.error('Task autocomplete failed:', err)
    await interaction.respond([])
  }
}

/**
 * Autocomplete for the `/survey` admin commands: the `survey` option lists open
 * surveys (by game), and the `date` option lists that survey's candidate dates
 * with their current availability counts.
 */
export async function respondSurveyAutocomplete(
  interaction: AutocompleteInteraction
): Promise<void> {
  try {
    const focused = interaction.options.getFocused(true)
    if (focused.name === 'survey') {
      const [surveys, games] = await Promise.all([
        getOpenSurveys(),
        getAllGames()
      ])
      const gameName = (id: string) =>
        games.find((g) => g.id === id)?.name ?? 'Game'
      const filtered = surveys
        .filter((s) => matches(gameName(s.gameId), String(focused.value)))
        .slice(0, MAX_CHOICES)
      return interaction.respond(
        filtered.map((s) => ({
          name: short(
            `${gameName(s.gameId)} — ${new Date(s.createdAt ?? '').toLocaleDateString()}`
          ),
          value: s.id
        }))
      )
    }
    // focused.name === 'date' — scoped to the already-chosen survey.
    const surveyId = interaction.options.getString('survey', false)
    if (!surveyId) return interaction.respond([])
    const [dates, responses] = await Promise.all([
      getSurveyDates(surveyId),
      getSurveyResponses(surveyId)
    ])
    const count = (dateId: string) =>
      responses.filter((r) => r.surveyDateId === dateId && r.available).length
    const label = (iso: string) =>
      new Date(iso).toLocaleString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
      })
    return interaction.respond(
      dates
        .filter((d) => matches(label(d.dateTime), String(focused.value)))
        .slice(0, MAX_CHOICES)
        .map((d) => ({
          name: short(`${label(d.dateTime)} (${count(d.id)} available)`),
          value: d.id
        }))
    )
  } catch (err) {
    logger.error('Survey autocomplete failed:', err)
    await interaction.respond([])
  }
}

/** Autocomplete a `campaign` option to only the campaigns the caller is in. */
export async function respondMyCampaignAutocomplete(
  interaction: AutocompleteInteraction
): Promise<void> {
  try {
    const focused = interaction.options.getFocused()
    const players = await getPlayersByUser(interaction.user.id)
    const campaignIds = new Set(players.map((p) => p.campaignId))
    const campaigns = (await getAllCampaigns())
      .filter((c) => campaignIds.has(c.id) && matches(c.title, focused))
      .slice(0, MAX_CHOICES)
    await interaction.respond(
      campaigns.map((c) => ({ name: short(c.title), value: c.id }))
    )
  } catch (err) {
    logger.error('My-campaign autocomplete failed:', err)
    await interaction.respond([])
  }
}
