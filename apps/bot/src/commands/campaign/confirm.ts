import {
  type AutocompleteInteraction,
  type ChatInputCommandInteraction,
  MessageFlags
} from 'discord.js'
import { createCommandConfig } from '~/framework/command'
import { setPlayerStatus } from '~/services/playerService'
import { respondMyCampaignAutocomplete } from '~/utils/autocomplete'
import { logger } from '~/utils/logger'

export const config = createCommandConfig({
  description: 'Confirm your spot in a campaign',
  options: [
    {
      name: 'campaign',
      description: 'The campaign to confirm for',
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
    const result = await setPlayerStatus(
      interaction.client,
      campaignId,
      interaction.user.id,
      'CONFIRMED'
    )
    if (!result.ok) return interaction.editReply(result.error)
    return interaction.editReply("You're **confirmed** for this campaign. 🎲")
  } catch (err) {
    logger.error('/campaign confirm failed:', err)
    return interaction.editReply('Something went wrong confirming your spot.')
  }
}
