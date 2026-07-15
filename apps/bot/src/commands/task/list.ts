import { getGameDay, getGameDayTasks } from '@hermuz/db'
import {
  type AutocompleteInteraction,
  type ChatInputCommandInteraction,
  Colors,
  EmbedBuilder,
  MessageFlags
} from 'discord.js'
import { createCommandConfig } from '~/framework/command'
import { respondTaskAutocomplete } from '~/utils/autocomplete'
import { logger } from '~/utils/logger'

export const config = createCommandConfig({
  description: 'Show the setup checklist for a game day',
  options: [
    {
      name: 'game_day',
      description: 'The game day',
      type: 'string',
      required: true,
      autocomplete: true
    }
  ]
})

export const autocomplete = (interaction: AutocompleteInteraction) =>
  respondTaskAutocomplete(interaction)

export default async (interaction: ChatInputCommandInteraction) => {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral })
  const gameDayId = interaction.options.getString('game_day', true)
  try {
    const gameDay = await getGameDay(gameDayId)
    if (!gameDay) return interaction.editReply('Game day not found.')
    const tasks = await getGameDayTasks(gameDayId)
    const done = tasks.filter((t) => t.done).length
    const embed = new EmbedBuilder()
      .setTitle(`🧰 Setup checklist — ${gameDay.title}`)
      .setColor(Colors.Yellow)
      .setDescription(
        tasks.length
          ? tasks
              .map(
                (t) =>
                  `${t.done ? '✅' : '⬜'} ${t.label}${t.assigneeUserId ? ` — <@${t.assigneeUserId}>` : ''}`
              )
              .join('\n')
          : 'No setup tasks for this game day.'
      )
      .setFooter({ text: `${done}/${tasks.length} done` })
    return interaction.editReply({ embeds: [embed] })
  } catch (err) {
    logger.error('/task list failed:', err)
    return interaction.editReply('Something went wrong loading the checklist.')
  }
}
