import { EmbedBuilder, Colors } from 'discord.js'
import { Campaign, Player } from '../utils/supabase'
import { formatRegularGameTime, getCampaignDisplayName } from './campaignUtils'

/**
 * Create an embed for a campaign announcement
 *
 * @param campaign The campaign to create an embed for
 * @param players Optional array of players for the campaign
 * @returns An embed for the campaign
 */
export function createCampaignMessageEmbed(
  campaign: Campaign,
  players?: Player[]
): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setTitle(getCampaignDisplayName(campaign))
    .setDescription(campaign.description || 'No description provided')
    .setColor(Colors.Blue)
    .addFields({
      name: 'Regular Game Time',
      value: formatRegularGameTime(campaign.regular_game_time),
      inline: true
    })
    .setFooter({ text: `Campaign ID: ${campaign.id}` })
    .setTimestamp()

  // Add game information if available
  if (campaign.game_name) {
    embed.addFields({
      name: 'Game',
      value: campaign.game_name,
      inline: true
    })
  }

  // Add player information if available
  if (players && players.length > 0) {
    const interestedPlayers = players.filter(
      (player) => player.status === 'INTERESTED'
    )
    const confirmedPlayers = players.filter(
      (player) => player.status === 'CONFIRMED'
    )

    if (interestedPlayers.length > 0) {
      embed.addFields({
        name: 'Interested Players',
        value: `${interestedPlayers.length} player(s)`,
        inline: true
      })
    }

    if (confirmedPlayers.length > 0) {
      embed.addFields({
        name: 'Confirmed Players',
        value: `${confirmedPlayers.length} player(s)`,
        inline: true
      })
    }
  }

  return embed
}
