import {
  type AutocompleteInteraction,
  type ChatInputCommandInteraction,
  MessageFlags
} from 'discord.js'
import { createCommandConfig } from '~/framework/command'
import { setCharacterName } from '~/services/playerService'
import { respondMyCampaignAutocomplete } from '~/utils/autocomplete'
import { logger } from '~/utils/logger'

export const config = createCommandConfig({
  description: 'Set your character name for a campaign',
  options: [
    {
      name: 'campaign',
      description: 'The campaign',
      type: 'string',
      required: true,
      autocomplete: true
    },
    {
      name: 'name',
      description: 'Your character name',
      type: 'string',
      required: true
    }
  ]
})

export const autocomplete = (interaction: AutocompleteInteraction) =>
  respondMyCampaignAutocomplete(interaction)

export default async (interaction: ChatInputCommandInteraction) => {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral })
  const campaignId = interaction.options.getString('campaign', true)
  const name = interaction.options.getString('name', true)
  try {
    const result = await setCharacterName(
      interaction.client,
      campaignId,
      interaction.user.id,
      name
    )
    if (!result.ok) return interaction.editReply(result.error)
    return interaction.editReply(`Character name set to **${name}**.`)
  } catch (err) {
    logger.error('/character set failed:', err)
    return interaction.editReply('Something went wrong setting your character.')
  }
}
