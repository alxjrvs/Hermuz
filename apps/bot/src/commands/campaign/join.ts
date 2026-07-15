import {
  type ChatInputCommandInteraction,
  type AutocompleteInteraction,
  MessageFlags
} from 'discord.js'
import { createCommandConfig } from '~/framework/command'
import { joinCampaign } from '~/services/playerService'
import { respondCampaignAutocomplete } from '~/utils/autocomplete'
import { logger } from '~/utils/logger'

export const config = createCommandConfig({
  description: 'Join a campaign as an interested player',
  options: [
    {
      name: 'campaign',
      description: 'The campaign to join',
      type: 'string',
      required: true,
      autocomplete: true
    }
  ]
})

export const autocomplete = (interaction: AutocompleteInteraction) =>
  respondCampaignAutocomplete(interaction)

export default async (interaction: ChatInputCommandInteraction) => {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral })
  const campaignId = interaction.options.getString('campaign', true)
  try {
    const result = await joinCampaign(
      interaction.client,
      campaignId,
      interaction.user.id,
      interaction.user.username
    )
    if (!result.ok) return interaction.editReply(result.error)
    return interaction.editReply(
      "You're in — marked **interested**. Use `/campaign confirm` once you're locked in."
    )
  } catch (err) {
    logger.error('/campaign join failed:', err)
    return interaction.editReply('Something went wrong joining the campaign.')
  }
}
