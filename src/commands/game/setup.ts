import { createCommandConfig, logger } from 'robo.js'
import {
	type ChatInputCommandInteraction,
	PermissionFlagsBits,
	ModalBuilder,
	TextInputBuilder,
	TextInputStyle,
	ActionRowBuilder,
	type ModalSubmitInteraction,
	MessageFlags
} from 'discord.js'
import { createGame } from '../../models/game'
import { getDiscordServerByDiscordId } from '../../models/discordServer'

export const config = createCommandConfig({
	description: 'Set up a new game with associated role',
	defaultMemberPermissions: PermissionFlagsBits.Administrator, // Requires Administrator permission
	options: [
		{
			name: 'role',
			description: 'The Discord role associated with this game',
			type: 'role',
			required: true
		}
	]
} as const)

export default async (interaction: ChatInputCommandInteraction) => {
	try {
		// Get the role from the command options
		const role = interaction.options.getRole('role', true)

		// Create a unique ID for the modal
		const modalId = `game_setup_modal_${Date.now()}`

		// Create the modal
		const modal = new ModalBuilder().setCustomId(modalId).setTitle('Game Setup')

		// Create the text inputs
		const nameInput = new TextInputBuilder()
			.setCustomId('name')
			.setLabel('Game Name')
			.setStyle(TextInputStyle.Short)
			.setPlaceholder('Enter the name of the game')
			.setRequired(true)
			.setMaxLength(100)

		const descriptionInput = new TextInputBuilder()
			.setCustomId('description')
			.setLabel('Game Description')
			.setStyle(TextInputStyle.Paragraph)
			.setPlaceholder('Enter a description of the game')
			.setRequired(true)
			.setMaxLength(1000)

		const minPlayersInput = new TextInputBuilder()
			.setCustomId('min_players')
			.setLabel('Minimum Players')
			.setStyle(TextInputStyle.Short)
			.setPlaceholder('Enter the minimum number of players')
			.setRequired(true)
			.setValue('2')

		const maxPlayersInput = new TextInputBuilder()
			.setCustomId('max_players')
			.setLabel('Maximum Players')
			.setStyle(TextInputStyle.Short)
			.setPlaceholder('Enter the maximum number of players')
			.setRequired(true)
			.setValue('4')

		const durationInput = new TextInputBuilder()
			.setCustomId('duration')
			.setLabel('Duration (minutes)')
			.setStyle(TextInputStyle.Short)
			.setPlaceholder('Enter the estimated duration in minutes')
			.setRequired(true)
			.setValue('60')

		// Add inputs to action rows (max 5 inputs per modal, 1 input per action row)
		const nameActionRow = new ActionRowBuilder<TextInputBuilder>().addComponents(nameInput)
		const descriptionActionRow = new ActionRowBuilder<TextInputBuilder>().addComponents(descriptionInput)
		const minPlayersActionRow = new ActionRowBuilder<TextInputBuilder>().addComponents(minPlayersInput)
		const maxPlayersActionRow = new ActionRowBuilder<TextInputBuilder>().addComponents(maxPlayersInput)
		const durationActionRow = new ActionRowBuilder<TextInputBuilder>().addComponents(durationInput)

		// Add action rows to the modal
		modal.addComponents(
			nameActionRow,
			descriptionActionRow,
			minPlayersActionRow,
			maxPlayersActionRow,
			durationActionRow
		)

		// Store the role ID in a collection for later use
		// We need to do this because the modal submission is a separate interaction
		interaction.client.once(`modalSubmit_${modalId}`, async (modalInteraction: ModalSubmitInteraction) => {
			await handleModalSubmit(modalInteraction, role.id, interaction.guildId!)
		})

		// Show the modal to the user
		await interaction.showModal(modal)

		// Set up a collector for the modal submit
		const filter = (i: ModalSubmitInteraction) => i.customId === modalId

		try {
			logger.error('bar')
			const modalInteraction = await interaction.awaitModalSubmit({
				filter,
				time: 300000 // 5 minutes
			})

			// Emit the event for our listener
			interaction.client.emit(`modalSubmit_${modalId}`, modalInteraction)
			logger.error('Foo')
		} catch (error) {
			logger.error('Modal submission timed out or failed:', error)
		}
	} catch (error) {
		logger.error('Error in game setup command:', error)
		if (!interaction.replied) {
			logger.error('Foo Bar')
			await interaction.reply({
				content: 'An error occurred while setting up the game. Please try again later.',
				flags: MessageFlags.Ephemeral
			})
		}
	}
}

async function handleModalSubmit(interaction: ModalSubmitInteraction, roleId: string, guildId: string) {
	try {
		// Get the values from the modal
		await interaction.deferReply({ flags: MessageFlags.Ephemeral })
		const name = interaction.fields.getTextInputValue('name')
		const description = interaction.fields.getTextInputValue('description')
		const minPlayersStr = interaction.fields.getTextInputValue('min_players')
		const maxPlayersStr = interaction.fields.getTextInputValue('max_players')
		const durationStr = interaction.fields.getTextInputValue('duration')

		// Validate numeric inputs
		const minPlayers = parseInt(minPlayersStr, 10)
		const maxPlayers = parseInt(maxPlayersStr, 10)
		const duration = parseInt(durationStr, 10)

		if (isNaN(minPlayers) || isNaN(maxPlayers) || isNaN(duration)) {
			return interaction.editReply('Please enter valid numbers for players and duration.')
		}

		if (minPlayers <= 0 || maxPlayers <= 0 || duration <= 0) {
			return interaction.editReply('Player counts and duration must be positive numbers.')
		}

		if (minPlayers > maxPlayers) {
			return interaction.editReply('Minimum players cannot be greater than maximum players.')
		}

		// Get the server record
		const server = await getDiscordServerByDiscordId(guildId)
		if (!server) {
			return interaction.editReply('Failed to retrieve server record. Please try again later.')
		}

		// Create the game
		const game = await createGame({
			name,
			description,
			discord_role_id: roleId,
			min_players: minPlayers,
			max_players: maxPlayers,
			duration,
			complexity_rating: 1, // Default value
			server_id: server.id
		})

		if (!game) {
			return interaction.editReply('Failed to create the game. Please try again later.')
		}

		// Success message
		await interaction.editReply({
			content: `Game "${name}" has been successfully set up with the <@&${roleId}> role!`
		})
	} catch (error) {
		logger.error('Error handling modal submission:', error)

		if (interaction.deferred || interaction.replied) {
			await interaction.editReply('An error occurred while processing your submission. Please try again later.')
		} else {
			await interaction.reply({
				content: 'An error occurred while processing your submission. Please try again later.',
				flags: MessageFlags.Ephemeral
			})
		}
	}
}
