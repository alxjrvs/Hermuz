import {
  createAttendance,
  createSurveyDate,
  createSurvey as createSurveyRow,
  type Game,
  type GameDay,
  getGame,
  getOrCreateUser,
  getSurvey,
  getSurveyDates,
  getSurveyResponses,
  type Survey,
  type SurveyDate,
  type SurveyResponse,
  updateSurvey,
  upsertSurveyResponse
} from '@hermuz/db'
import {
  ActionRowBuilder,
  type Client,
  EmbedBuilder,
  type Guild,
  StringSelectMenuBuilder
} from 'discord.js'
import { BRAND, BRAND_AUTHOR } from '~/utils/brand'
import { createSurveyVoteId } from '~/utils/buttonUtils'
import { logger } from '~/utils/logger'
import { getSchedulingChannel } from '~/utils/schedulingChannel'
import { createGameDayWithDiscord } from './gameDayService'
import { upsertChannelMessage } from './notifyService'
import { fail, ok, type ServiceResult } from './result'

/** Most candidate dates a single survey can offer. */
export const MAX_SURVEY_DATES = 10

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  })
}

/** userIds available on each candidate date. */
function tallyByDate(responses: SurveyResponse[]): Map<string, string[]> {
  const by = new Map<string, string[]>()
  for (const r of responses) {
    if (!r.available || !r.userId) continue
    const list = by.get(r.surveyDateId) ?? []
    list.push(r.userId)
    by.set(r.surveyDateId, list)
  }
  return by
}

function surveyEmbed(
  survey: Survey,
  game: Game | null,
  dates: SurveyDate[],
  responses: SurveyResponse[]
): EmbedBuilder {
  const gameName = game?.name ?? 'a game'
  const embed = new EmbedBuilder()
    .setAuthor(BRAND_AUTHOR)
    .setTitle(
      survey.title?.trim()
        ? `${survey.title} — ${gameName}`
        : `Planning a ${gameName} day`
    )
    .setFooter({ text: `Survey ID: ${survey.id}` })

  if (survey.status === 'CANONIZED') {
    const won = dates.find((d) => d.id === survey.canonizedSurveyDateId)
    embed
      .setColor(BRAND.good)
      .setDescription(
        won
          ? `✅ Scheduled for **${formatDate(won.dateTime)}** — the game day is set.`
          : '✅ A date was chosen and scheduled.'
      )
  } else if (survey.status === 'CANCELLED') {
    embed.setColor(BRAND.danger).setDescription('This survey was cancelled.')
  } else {
    embed
      .setColor(BRAND.accent)
      .setDescription(
        survey.description?.trim() ||
          'Pick every day you can make from the menu below.'
      )
  }

  const by = tallyByDate(responses)
  for (const d of dates) {
    const ids = by.get(d.id) ?? []
    const star = survey.canonizedSurveyDateId === d.id ? '⭐ ' : ''
    embed.addFields({
      name: `${star}${formatDate(d.dateTime)} — ${ids.length} available`,
      value: ids.length ? ids.map((id) => `<@${id}>`).join(' ') : '—',
      inline: false
    })
  }
  return embed
}

function surveySelect(
  surveyId: string,
  dates: SurveyDate[]
): ActionRowBuilder<StringSelectMenuBuilder> {
  const menu = new StringSelectMenuBuilder()
    .setCustomId(createSurveyVoteId(surveyId))
    .setPlaceholder('Select every day you can make')
    .setMinValues(0)
    .setMaxValues(Math.max(1, Math.min(dates.length, MAX_SURVEY_DATES)))
    .addOptions(
      dates.map((d) => ({ label: formatDate(d.dateTime), value: d.id }))
    )
  return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu)
}

/** Post or update a survey's announcement in the scheduling channel. */
export async function renderSurvey(
  client: Client,
  surveyId: string
): Promise<void> {
  try {
    const survey = await getSurvey(surveyId)
    if (!survey) return
    const channel = await getSchedulingChannel(client)
    if (!channel) return
    const game = await getGame(survey.gameId)
    const dates = await getSurveyDates(surveyId)
    const responses = await getSurveyResponses(surveyId)
    const open = survey.status === 'OPEN'
    const ping =
      open && game?.discordRoleId
        ? `<@&${game.discordRoleId}> A new game day is being planned — mark the days you can make:`
        : ''
    const message = await upsertChannelMessage(channel, survey.messageId, {
      content: ping,
      embeds: [surveyEmbed(survey, game, dates, responses)],
      components: open && dates.length ? [surveySelect(surveyId, dates)] : []
    })
    if (message && (message.id !== survey.messageId || !survey.channelId)) {
      await updateSurvey(surveyId, {
        messageId: message.id,
        channelId: channel.id
      })
    }
  } catch (err) {
    logger.error('Error rendering survey:', err)
  }
}

export interface CreateSurveyInput {
  gameId: string
  title?: string | null
  description?: string | null
  /** Candidate date/times (ISO or Date-parseable). 1–10 are kept, in order. */
  dateTimes: string[]
  createdByUserId: string
  createdByUsername?: string | null
}

/** Create a survey with its candidate dates and announce it. */
export async function createSurvey(
  client: Client,
  input: CreateSurveyInput
): Promise<ServiceResult<Survey>> {
  const game = await getGame(input.gameId)
  if (!game) return fail('Game not found.', 404)

  const parsed = input.dateTimes
    .map((s) => new Date(s))
    .filter((d) => !Number.isNaN(d.getTime()))
    .sort((a, b) => a.getTime() - b.getTime())
    .slice(0, MAX_SURVEY_DATES)
  if (parsed.length === 0) {
    return fail('Add at least one valid candidate date.', 400)
  }

  await getOrCreateUser(
    input.createdByUserId,
    input.createdByUsername ?? input.createdByUserId
  )

  const survey = await createSurveyRow({
    gameId: game.id,
    title: input.title ?? null,
    description: input.description ?? null,
    createdByUserId: input.createdByUserId
  })
  if (!survey) return fail('Failed to create the survey.', 500)

  for (const [i, d] of parsed.entries()) {
    await createSurveyDate({
      surveyId: survey.id,
      dateTime: d.toISOString(),
      sortOrder: i
    })
  }

  await renderSurvey(client, survey.id)
  return ok(survey)
}

/**
 * Replace a user's availability with exactly `availableDateIds` (the full set
 * they can make) — the multi-select "pick all that work" semantics.
 */
export async function respondToSurvey(
  client: Client,
  surveyId: string,
  userId: string,
  username: string,
  availableDateIds: string[]
): Promise<ServiceResult<Survey>> {
  const survey = await getSurvey(surveyId)
  if (!survey) return fail('Survey not found.', 404)
  if (survey.status !== 'OPEN') return fail('This survey is closed.', 400)

  await getOrCreateUser(userId, username)
  const dates = await getSurveyDates(surveyId)
  const picked = new Set(availableDateIds)
  for (const d of dates) {
    await upsertSurveyResponse(surveyId, d.id, userId, picked.has(d.id) ? 1 : 0)
  }
  await renderSurvey(client, surveyId)
  return ok(survey)
}

/**
 * Promote one candidate date into a real game day, seeding an `AVAILABLE`
 * attendance for every user who marked that date. The chosen date must be in
 * the future (game days can't be scheduled in the past).
 */
export async function canonizeSurvey(
  client: Client,
  guild: Guild,
  surveyId: string,
  surveyDateId: string,
  actingUserId: string,
  actingUsername?: string | null
): Promise<ServiceResult<GameDay>> {
  const survey = await getSurvey(surveyId)
  if (!survey) return fail('Survey not found.', 404)
  if (survey.status !== 'OPEN') {
    return fail('This survey has already been resolved.', 400)
  }
  const dates = await getSurveyDates(surveyId)
  const winning = dates.find((d) => d.id === surveyDateId)
  if (!winning) return fail('That date is not part of this survey.', 400)

  const game = await getGame(survey.gameId)
  const host = survey.createdByUserId ?? actingUserId
  const result = await createGameDayWithDiscord(guild, {
    title: survey.title?.trim() || `${game?.name ?? 'Game'} Day`,
    description: survey.description,
    dateTime: winning.dateTime,
    hostUserId: host,
    hostUsername: host === actingUserId ? actingUsername : null,
    gameId: survey.gameId
  })
  if (!result.ok) return result
  const gameDay = result.data

  // Everyone available on the winning date carries over as AVAILABLE.
  const responses = await getSurveyResponses(surveyId)
  const availableUserIds = new Set(
    responses
      .filter((r) => r.surveyDateId === surveyDateId && r.available && r.userId)
      .map((r) => r.userId as string)
  )
  for (const uid of availableUserIds) {
    if (uid === host) continue // host is already seeded by createGameDayWithDiscord
    await createAttendance({
      gameDayId: gameDay.id,
      userId: uid,
      status: 'AVAILABLE'
    })
    if (gameDay.discordRoleId) {
      try {
        const member = await guild.members.fetch(uid)
        await member.roles.add(
          gameDay.discordRoleId,
          'Available in the game-day survey'
        )
      } catch (err) {
        logger.debug(`Could not add game-day role to ${uid}:`, err)
      }
    }
  }

  await updateSurvey(surveyId, {
    status: 'CANONIZED',
    canonizedSurveyDateId: surveyDateId,
    canonizedGameDayId: gameDay.id
  })
  await renderSurvey(client, surveyId)
  return ok(gameDay)
}

/** Cancel a survey (drops the menu, stops collecting). */
export async function cancelSurvey(
  client: Client,
  surveyId: string
): Promise<ServiceResult<Survey>> {
  const survey = await updateSurvey(surveyId, { status: 'CANCELLED' })
  if (!survey) return fail('Failed to cancel the survey.', 500)
  await renderSurvey(client, surveyId)
  return ok(survey)
}
