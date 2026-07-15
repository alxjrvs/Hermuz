import type { Campaign, Player } from '@hermuz/db'
import { EmbedBuilder } from 'discord.js'
import { BRAND, BRAND_AUTHOR } from './brand'
import { formatRegularGameTime, getCampaignDisplayName } from './campaignUtils'
import { locationTypeLabel } from './locationUtils'
export function createCampaignMessageEmbed(
  campaign: Campaign,
  players?: Player[]
): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setAuthor(BRAND_AUTHOR)
    .setTitle(getCampaignDisplayName(campaign))
    .setDescription(campaign.description || 'No description provided')
    .setColor(BRAND.accent)
    .addFields(
      {
        name: 'Regular Game Time',
        value: formatRegularGameTime(campaign.regularGameTime),
        inline: true
      },
      {
        name: 'Type',
        value: locationTypeLabel(campaign.locationType),
        inline: true
      }
    )
    .setFooter({ text: `Campaign ID: ${campaign.id}` })
    .setTimestamp()
  if (campaign.gameName) {
    embed.addFields({
      name: 'Game',
      value: campaign.gameName,
      inline: true
    })
  }
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
