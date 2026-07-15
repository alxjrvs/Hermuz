import {
  type ChatInputCommandInteraction,
  type AutocompleteInteraction,
  MessageFlags
} from 'discord.js'
import { createCommandConfig } from '~/framework/command'
import { setUserAttendance } from '~/services/attendanceService'
import { respondGameDayAutocomplete } from '~/utils/autocomplete'
import { isAttendanceStatus } from '~/utils/typeGuards'
import { logger } from '~/utils/logger'

export const config = createCommandConfig({
  description: 'RSVP to a game day',
  options: [
    {
      name: 'game_day',
      description: 'The game day to RSVP for',
      type: 'string',
      required: true,
      autocomplete: true
    },
    {
      name: 'status',
      description: 'Your availability',
      type: 'string',
      required: true,
      choices: [
        { name: "✅ I'm in", value: 'AVAILABLE' },
        { name: '🤔 Interested', value: 'INTERESTED' },
        { name: '❌ Not available', value: 'NOT_AVAILABLE' }
      ]
    }
  ]
})

export const autocomplete = (interaction: AutocompleteInteraction) =>
  respondGameDayAutocomplete(interaction)

export default async (interaction: ChatInputCommandInteraction) => {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral })
  const gameDayId = interaction.options.getString('game_day', true)
  const status = interaction.options.getString('status', true)
  if (!isAttendanceStatus(status)) {
    return interaction.editReply('Invalid status.')
  }
  try {
    const result = await setUserAttendance(
      interaction.client,
      gameDayId,
      interaction.user.id,
      interaction.user.username,
      status
    )
    if (!result.ok) return interaction.editReply(result.error)
    return interaction.editReply(`RSVP saved: **${status.replace(/_/g, ' ')}**.`)
  } catch (err) {
    logger.error('/rsvp failed:', err)
    return interaction.editReply('Something went wrong saving your RSVP.')
  }
}
