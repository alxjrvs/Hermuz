import { getAttendancesByUser, getGameDay } from '@hermuz/db'
import {
  type ChatInputCommandInteraction,
  Colors,
  EmbedBuilder,
  MessageFlags
} from 'discord.js'
import { createCommandConfig } from '~/framework/command'
import { logger } from '~/utils/logger'

export const config = createCommandConfig({
  description: 'Show your upcoming game days'
})

export default async (interaction: ChatInputCommandInteraction) => {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral })
  try {
    const attendances = await getAttendancesByUser(interaction.user.id)
    const byGameDay = new Map(attendances.map((a) => [a.gameDayId, a.status]))
    const now = Date.now()

    const rows: { when: number; line: string }[] = []
    for (const [gameDayId, status] of byGameDay) {
      if (!gameDayId || status === 'NOT_AVAILABLE') continue
      const gd = await getGameDay(gameDayId)
      if (!gd || gd.status === 'CANCELLED') continue
      const when = new Date(gd.dateTime).getTime()
      if (when < now) continue
      const icon = status === 'AVAILABLE' ? '✅' : '🤔'
      rows.push({
        when,
        line: `${icon} **${gd.title}** — <t:${Math.floor(when / 1000)}:F>`
      })
    }
    rows.sort((a, b) => a.when - b.when)

    const embed = new EmbedBuilder()
      .setTitle('Your upcoming game days')
      .setColor(Colors.Green)
      .setDescription(
        rows.length > 0
          ? rows.map((r) => r.line).join('\n')
          : "You're not RSVP'd to any upcoming game days. Use `/rsvp` to sign up."
      )
    return interaction.editReply({ embeds: [embed] })
  } catch (err) {
    logger.error('/my schedule failed:', err)
    return interaction.editReply('Something went wrong loading your schedule.')
  }
}
