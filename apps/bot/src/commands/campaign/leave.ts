import {
  type AutocompleteInteraction,
  type ChatInputCommandInteraction,
  MessageFlags
} from 'discord.js'
import { createCommandConfig } from '~/framework/command'
import { leaveCampaign } from '~/services/playerService'
import { respondMyCampaignAutocomplete } from '~/utils/autocomplete'
import { logger } from '~/utils/logger'

export const config = createCommandConfig({
  description: 'Leave a campaign you are in',
  options: [
    {
      name: 'campaign',
      description: 'The campaign to leave',
      type: 'string',
      required: true,
      autocomplete: true
    }
  ]
})

export const autocomplete = (interaction: AutocompleteInteraction) =>
  respondMyCampaignAutocomplete(interaction)

export default async (interaction: ChatInputCommandInteraction) => {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral })
  const campaignId = interaction.options.getString('campaign', true)
  try {
    const result = await leaveCampaign(
      interaction.client,
      campaignId,
      interaction.user.id
    )
    if (!result.ok) return interaction.editReply(result.error)
    return interaction.editReply('You have left the campaign.')
  } catch (err) {
    logger.error('/campaign leave failed:', err)
    return interaction.editReply('Something went wrong leaving the campaign.')
  }
}
