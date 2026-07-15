import { type ChatInputCommandInteraction, MessageFlags } from 'discord.js'
import { createCommandConfig } from '~/framework/command'
import { config as runtimeConfig } from '~/config'

export const config = createCommandConfig({
  description: 'Get a link to the Hermuz web console'
})

export default async (interaction: ChatInputCommandInteraction) => {
  return interaction.reply({
    content: `🖥️ Open the Hermuz console: ${runtimeConfig.webOrigin}\n\nSign in with Discord — admins get full controls, everyone can view.`,
    flags: MessageFlags.Ephemeral
  })
}
