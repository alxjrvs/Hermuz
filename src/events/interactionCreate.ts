import { logger } from 'robo.js'
import type { Interaction, ModalSubmitInteraction } from 'discord.js'
import { ChannelType } from 'discord.js'
import { getOrCreateDiscordServer, updateDiscordServer } from '../models/discordServer'

/**
 * This event is triggered when a user interacts with the bot
 * We'll use it to handle different types of interactions
 */
export default async (interaction: Interaction) => {
	try {
		// Handle modal submissions
		if (interaction.isModalSubmit()) {
			// Handle the setup modal
			if (interaction.customId === 'setup-modal') {
				await handleSetupModal(interaction)
			}
		}
	} catch (error) {
		logger.error('Error in interactionCreate event:', error)
	}
}

/**
 * Handle the setup modal submission
 */
async function handleSetupModal(interaction: ModalSubmitInteraction) {
	// Check if the user is the server owner
	if (interaction.guild?.ownerId !== interaction.user.id) {
		return interaction.reply({
			content: 'Only the server owner can use this command.',
			ephemeral: true
		})
	}

	await interaction.deferReply({ ephemeral: true })

	try {
		// Get the scheduling channel ID from the modal
		const schedulingChannelId = interaction.fields.getTextInputValue('scheduling-channel').replace(/[<#>]/g, '') // Remove <#> if the user entered a channel mention

		// Validate the channel ID
		const channel = interaction.guild?.channels.cache.get(schedulingChannelId)
		if (!channel) {
			return interaction.editReply(
				'Invalid channel ID. Please make sure you entered a valid channel ID from this server.'
			)
		}

		// Check if the channel is a text channel
		if (channel.type !== ChannelType.GuildText) {
			return interaction.editReply('The scheduling channel must be a text channel.')
		}

		// Get or create the Discord server record
		const server = await getOrCreateDiscordServer(interaction.guildId!)
		if (!server) {
			return interaction.editReply('Failed to retrieve server record. Please try again later.')
		}

		// Update the scheduling channel ID
		const updatedServer = await updateDiscordServer(server.id, {
			scheduling_channel_id: schedulingChannelId
		})

		if (!updatedServer) {
			return interaction.editReply('Failed to update server settings. Please try again later.')
		}

		// Success message
		return interaction.editReply(
			`Channel set successfully! <#${schedulingChannelId}> will now be used for game day scheduling.`
		)
	} catch (error) {
		logger.error('Error handling setup modal:', error)
		return interaction.editReply('An error occurred while processing your submission. Please try again later.')
	}
}
