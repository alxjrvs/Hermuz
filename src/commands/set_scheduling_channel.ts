import { createCommandConfig, logger } from 'robo.js'
import { type ChatInputCommandInteraction, PermissionFlagsBits, ChannelType } from 'discord.js'
import { getOrCreateDiscordServer, updateDiscordServer } from '../models/discordServer'

export const config = createCommandConfig({
	description: 'Set the channel for game day scheduling',
	defaultMemberPermissions: PermissionFlagsBits.Administrator, // Requires Administrator permission
	options: [
		{
			name: 'channel',
			description: 'The channel to use for game day scheduling',
			type: 'channel',
			required: true,
			channelTypes: [ChannelType.GuildText]
		}
	]
} as const)

export default async (interaction: ChatInputCommandInteraction) => {
	try {
		await interaction.deferReply({ ephemeral: true })

		// Check if the user is the server owner
		if (interaction.guild?.ownerId !== interaction.user.id) {
			return interaction.editReply('Only the server owner can use this command.')
		}

		// Get the scheduling channel from the command options
		const schedulingChannel = interaction.options.getChannel('channel', true)

		// Validate the channel type
		if (schedulingChannel.type !== ChannelType.GuildText) {
			return interaction.editReply('The scheduling channel must be a text channel.')
		}

		// Get or create the Discord server record
		const server = await getOrCreateDiscordServer(interaction.guildId!)
		if (!server) {
			return interaction.editReply('Failed to retrieve server record. Please try again later.')
		}

		// Update the scheduling channel ID
		const updatedServer = await updateDiscordServer(server.id, {
			scheduling_channel_id: schedulingChannel.id
		})

		if (!updatedServer) {
			return interaction.editReply('Failed to update server settings. Please try again later.')
		}

		// Success message
		return interaction.editReply(
			`Channel set successfully! <#${schedulingChannel.id}> will now be used for game day scheduling.`
		)
	} catch (error) {
		logger.error('Error in set_scheduling_channel command:', error)
		if (interaction.deferred || interaction.replied) {
			await interaction.editReply('An error occurred while setting up the scheduling channel. Please try again later.')
		} else {
			await interaction.reply({
				content: 'An error occurred while setting up the scheduling channel. Please try again later.',
				ephemeral: true
			})
		}
	}
}
