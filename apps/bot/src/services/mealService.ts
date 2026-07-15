import {
  createMeal,
  getGameDay,
  getGameDayAttendances,
  getMeal,
  getMealResponses,
  getOrCreateUser,
  type Meal,
  type MealKind,
  type MealResponse,
  updateMeal,
  upsertMealResponse
} from '@hermuz/db'
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  type Client,
  Colors,
  EmbedBuilder
} from 'discord.js'
import { config } from '~/config'
import { createMealButtonId } from '~/utils/buttonUtils'
import { logger } from '~/utils/logger'
import { registerJobHandler } from './jobRegistry'
import {
  dmUsers,
  getGameDayChannel,
  upsertChannelMessage
} from './notifyService'
import { fail, ok, type ServiceResult } from './result'
import { enqueueJob } from './schedulerService'

export const MEAL_NUDGE = 'MEAL_NUDGE'
/** How often to re-nudge non-responders while a meal poll is open. */
const NUDGE_INTERVAL_MS = 12 * 60 * 60_000

const kindLabel = (k: MealKind) => (k === 'LUNCH' ? '🥪 Lunch' : '🍽️ Dinner')

/** The users a meal poll concerns: the game day's available/interested RSVPs. */
async function relevantUserIds(gameDayId: string): Promise<string[]> {
  const attendances = await getGameDayAttendances(gameDayId)
  return attendances
    .filter((a) => a.status !== 'NOT_AVAILABLE' && a.userId)
    .map((a) => a.userId as string)
}

function mealEmbed(
  meal: Meal,
  gameDayTitle: string,
  responses: MealResponse[]
): EmbedBuilder {
  const inList = responses.filter((r) => r.attending)
  const out = responses.filter((r) => !r.attending)
  const fmtIn = inList.length
    ? inList
        .map((r) => `<@${r.userId}>${r.note ? ` — ${r.note}` : ''}`)
        .join('\n')
    : 'No one yet'
  const embed = new EmbedBuilder()
    .setTitle(`${kindLabel(meal.kind)} — ${gameDayTitle}`)
    .setColor(meal.status === 'CLOSED' ? Colors.Greyple : Colors.Gold)
    .setDescription(
      meal.plan ? `**Plan:** ${meal.plan}` : 'React below with your plans.'
    )
    .addFields(
      { name: `✅ In (${inList.length})`, value: fmtIn, inline: false },
      {
        name: `🚫 Out (${out.length})`,
        value: out.length ? out.map((r) => `<@${r.userId}>`).join(' ') : '—',
        inline: false
      }
    )
    .setFooter({ text: `Meal ID: ${meal.id}` })
  if (meal.dueAt) {
    embed.addFields({
      name: 'Respond by',
      value: `<t:${Math.floor(new Date(meal.dueAt).getTime() / 1000)}:R>`,
      inline: false
    })
  }
  return embed
}

function mealButtons(mealId: string): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(createMealButtonId('IN', mealId))
      .setLabel("I'm in")
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(createMealButtonId('OUT', mealId))
      .setLabel('Out')
      .setStyle(ButtonStyle.Secondary)
  )
}

/** Post or update a meal poll message in the game day's food channel. */
export async function renderMeal(
  client: Client,
  mealId: string
): Promise<void> {
  try {
    const meal = await getMeal(mealId)
    if (!meal) return
    const gameDay = await getGameDay(meal.gameDayId)
    if (!gameDay) return
    const channel = await getGameDayChannel(client, gameDay, 'food')
    if (!channel) return
    const responses = await getMealResponses(mealId)
    const message = await upsertChannelMessage(channel, meal.messageId, {
      embeds: [mealEmbed(meal, gameDay.title, responses)],
      components: meal.status === 'CLOSED' ? [] : [mealButtons(mealId)]
    })
    if (message && (message.id !== meal.messageId || !meal.channelId)) {
      await updateMeal(mealId, {
        messageId: message.id,
        channelId: channel.id
      })
    }
  } catch (err) {
    logger.error('Error rendering meal:', err)
  }
}

/** Create a meal slot on a game day, render its poll, and schedule nudges. */
export async function createMealSlot(
  client: Client,
  gameDayId: string,
  kind: MealKind,
  plan?: string | null,
  dueAt?: string | null
): Promise<ServiceResult<Meal>> {
  const gameDay = await getGameDay(gameDayId)
  if (!gameDay) return fail('Game day not found.', 404)
  const meal = await createMeal({
    gameDayId,
    kind,
    plan: plan ?? null,
    dueAt: dueAt ?? null
  })
  if (!meal) return fail('Failed to create the meal.', 500)

  await renderMeal(client, meal.id)
  // Schedule the first non-responder nudge.
  await enqueueJob(
    MEAL_NUDGE,
    new Date(Date.now() + NUDGE_INTERVAL_MS).toISOString(),
    { mealId: meal.id }
  )
  return ok(meal)
}

/** Record a user's response to a meal poll and re-render. */
export async function respondToMeal(
  client: Client,
  mealId: string,
  userId: string,
  username: string,
  attending: boolean,
  note?: string | null
): Promise<ServiceResult<MealResponse>> {
  const meal = await getMeal(mealId)
  if (!meal) return fail('Meal not found.', 404)
  if (meal.status === 'CLOSED') return fail('This meal poll is closed.', 400)

  await getOrCreateUser(userId, username)
  const response = await upsertMealResponse(mealId, userId, {
    attending: attending ? 1 : 0,
    note: note ?? null
  })
  if (!response) return fail('Failed to record your response.', 500)
  await renderMeal(client, mealId)
  return ok(response)
}

/** Close a meal poll (stops nudges, removes buttons). */
export async function closeMeal(
  client: Client,
  mealId: string
): Promise<ServiceResult<Meal>> {
  const meal = await updateMeal(mealId, { status: 'CLOSED' })
  if (!meal) return fail('Failed to close the meal.', 500)
  await renderMeal(client, mealId)
  return ok(meal)
}

// --- MEAL_NUDGE job: DM non-responders, then reschedule until due/closed ---
registerJobHandler(MEAL_NUDGE, async (client, job) => {
  const payload = job.payload ? JSON.parse(job.payload) : {}
  const mealId: string | undefined = payload.mealId
  if (!mealId) return

  const meal = await getMeal(mealId)
  if (!meal || meal.status === 'CLOSED') return // nothing to do

  // Past due → close it out.
  if (meal.dueAt && Date.now() > new Date(meal.dueAt).getTime()) {
    await updateMeal(mealId, { status: 'CLOSED' })
    await renderMeal(client, mealId)
    return
  }

  const relevant = await relevantUserIds(meal.gameDayId)
  const responses = await getMealResponses(mealId)
  const responded = new Set(responses.map((r) => r.userId))
  const pending = relevant.filter((id) => !responded.has(id))

  if (pending.length > 0) {
    const gameDay = await getGameDay(meal.gameDayId)
    const where = meal.channelId ? `<#${meal.channelId}>` : 'the food channel'
    await dmUsers(
      client,
      pending,
      `🍽️ Meal check for **${gameDay?.title ?? 'your game day'}** (${meal.kind.toLowerCase()}) — are you eating? Let us know in ${where} or on ${config.webOrigin}.`
    )
  }

  // Reschedule the next nudge if still open and before due.
  await enqueueJob(
    MEAL_NUDGE,
    new Date(Date.now() + NUDGE_INTERVAL_MS).toISOString(),
    { mealId }
  )
})
