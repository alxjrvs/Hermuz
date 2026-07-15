import {
  type ChatInputCommandInteraction,
  type AutocompleteInteraction,
  MessageFlags
} from 'discord.js'
import { createCommandConfig } from '~/framework/command'
import { getGameDayTasks, updateGameDayTask } from '@hermuz/db'
import { renderChecklist } from '~/services/taskService'
import { respondTaskAutocomplete } from '~/utils/autocomplete'
import { logger } from '~/utils/logger'

export const config = createCommandConfig({
  description: 'Claim a setup task (assign it to yourself)',
  options: [
    {
      name: 'game_day',
      description: 'The game day',
      type: 'string',
      required: true,
      autocomplete: true
    },
    {
      name: 'task',
      description: 'The task to claim',
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
  const taskId = interaction.options.getString('task', true)
  try {
    const tasks = await getGameDayTasks(gameDayId)
    const task = tasks.find((t) => t.id === taskId)
    if (!task) return interaction.editReply('Task not found on that game day.')
    await updateGameDayTask(taskId, { assigneeUserId: interaction.user.id })
    await renderChecklist(interaction.client, gameDayId)
    return interaction.editReply(`🙋 You claimed **${task.label}**.`)
  } catch (err) {
    logger.error('/task claim failed:', err)
    return interaction.editReply('Something went wrong claiming the task.')
  }
}
