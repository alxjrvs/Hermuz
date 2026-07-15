import type { AutocompleteInteraction } from 'discord.js'
import {
  getAllGameDays,
  getAllCampaigns,
  getPlayersByUser
} from '@hermuz/db'
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
        name: short(`${gd.title} — ${new Date(gd.dateTime).toLocaleDateString()}`),
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
