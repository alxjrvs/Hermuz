import {
  type ChatInputCommandInteraction,
  EmbedBuilder,
  Colors,
  MessageFlags
} from 'discord.js'
import { createCommandConfig } from '~/framework/command'
import { getPlayersByUser, getCampaign } from '@hermuz/db'
import { logger } from '~/utils/logger'

export const config = createCommandConfig({
  description: 'Show the campaigns you are in'
})

export default async (interaction: ChatInputCommandInteraction) => {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral })
  try {
    const players = await getPlayersByUser(interaction.user.id)
    const lines: string[] = []
    for (const p of players) {
      const c = await getCampaign(p.campaignId)
      if (!c) continue
      const icon = p.status === 'CONFIRMED' ? '🎲' : '🤔'
      const char = p.characterName ? ` — *${p.characterName}*` : ''
      lines.push(`${icon} **${c.title}**${char} (${p.status.toLowerCase()})`)
    }

    const embed = new EmbedBuilder()
      .setTitle('Your campaigns')
      .setColor(Colors.Blue)
      .setDescription(
        lines.length > 0
          ? lines.join('\n')
          : "You're not in any campaigns yet. Use `/campaign join` to sign up."
      )
    return interaction.editReply({ embeds: [embed] })
  } catch (err) {
    logger.error('/my campaigns failed:', err)
    return interaction.editReply('Something went wrong loading your campaigns.')
  }
}
