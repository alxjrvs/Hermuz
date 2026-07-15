import { getGameByRoleId } from '@hermuz/db'
import { type ChatInputCommandInteraction, MessageFlags } from 'discord.js'
import { createCommandConfig } from '~/framework/command'
import { createSurvey, MAX_SURVEY_DATES } from '~/services/surveyService'
import { logger } from '~/utils/logger'

export const config = createCommandConfig({
  description: 'Survey a new game day: poll candidate dates for a game',
  options: [
    {
      name: 'game',
      description: "The game's role",
      type: 'role',
      required: true
    },
    {
      name: 'dates',
      description: `Candidate dates, one per line or ;-separated (up to ${MAX_SURVEY_DATES}), e.g. 2026-08-01 19:00`,
      type: 'string',
      required: true
    },
    {
      name: 'title',
      description: 'Optional title for the survey',
      type: 'string',
      required: false
    }
  ]
})

export default async (interaction: ChatInputCommandInteraction) => {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral })
  try {
    const role = interaction.options.getRole('game', true)
    const game = await getGameByRoleId(role.id)
    if (!game) {
      return interaction.editReply(
        `No game is set up for ${role}. Use \`/game setup\` first.`
      )
    }
    const dateTimes = interaction.options
      .getString('dates', true)
      .split(/[\n;]+/)
      .map((s) => s.trim())
      .filter(Boolean)
    const title = interaction.options.getString('title', false)

    const result = await createSurvey(interaction.client, {
      gameId: game.id,
      title,
      dateTimes,
      createdByUserId: interaction.user.id,
      createdByUsername: interaction.user.username
    })
    if (!result.ok) return interaction.editReply(result.error)
    return interaction.editReply(
      `📅 Survey posted for **${game.name}** in the scheduling channel — people can now mark their availability.`
    )
  } catch (err) {
    logger.error('/survey create failed:', err)
    return interaction.editReply('Something went wrong creating the survey.')
  }
}
