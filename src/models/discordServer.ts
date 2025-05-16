import { supabase } from '../utils/supabase'
import type { DiscordServer, DiscordServerInsert, DiscordServerUpdate } from '../utils/supabase'
import { logger, client } from 'robo.js'
import { ChannelType, type TextChannel } from 'discord.js'

/**
 * Get a Discord server by its Discord ID
 */
export const getDiscordServerByDiscordId = async (discordId: string): Promise<DiscordServer | null> => {
	try {
		const { data, error } = await supabase.from('discord_servers').select('*').eq('discord_id', discordId).single()

		if (error) {
			logger.error('Error fetching Discord server by Discord ID:', error)
			return null
		}

		return data
	} catch (error) {
		logger.error('Error in getDiscordServerByDiscordId:', error)
		return null
	}
}

/**
 * Get a Discord server by its ID
 */
export const getDiscordServer = async (id: string): Promise<DiscordServer | null> => {
	try {
		const { data, error } = await supabase.from('discord_servers').select('*').eq('id', id).single()

		if (error) {
			logger.error('Error fetching Discord server:', error)
			return null
		}

		return data
	} catch (error) {
		logger.error('Error in getDiscordServer:', error)
		return null
	}
}

/**
 * Create a new Discord server
 */
export const createDiscordServer = async (server: DiscordServerInsert): Promise<DiscordServer | null> => {
	try {
		const { data, error } = await supabase.from('discord_servers').insert(server).select().single()

		if (error) {
			logger.error('Error creating Discord server:', error)
			return null
		}

		return data
	} catch (error) {
		logger.error('Error in createDiscordServer:', error)
		return null
	}
}

/**
 * Update a Discord server
 */
export const updateDiscordServer = async (id: string, updates: DiscordServerUpdate): Promise<DiscordServer | null> => {
	try {
		const { data, error } = await supabase
			.from('discord_servers')
			.update({
				...updates,
				updated_at: new Date().toISOString()
			})
			.eq('id', id)
			.select()
			.single()

		if (error) {
			logger.error('Error updating Discord server:', error)
			return null
		}

		return data
	} catch (error) {
		logger.error('Error in updateDiscordServer:', error)
		return null
	}
}

/**
 * Get or create a Discord server by its Discord ID
 */
export const getOrCreateDiscordServer = async (
	discordId: string,
	schedulingChannelId?: string
): Promise<DiscordServer | null> => {
	const server = await getDiscordServerByDiscordId(discordId)

	if (server) {
		return server
	}

	return createDiscordServer({
		discord_id: discordId,
		scheduling_channel_id: schedulingChannelId
	})
}

/**
 * Get the scheduling channel for a Discord server
 */
export const getSchedulingChannel = async (discordId: string): Promise<TextChannel | null> => {
	try {
		// Get the server record
		const server = await getDiscordServerByDiscordId(discordId)
		if (!server || !server.scheduling_channel_id) {
			return null
		}

		// Get the channel from Discord
		const channel = client.channels.cache.get(server.scheduling_channel_id)
		if (!channel || channel.type !== ChannelType.GuildText) {
			return null
		}

		return channel as TextChannel
	} catch (error) {
		logger.error('Error in getSchedulingChannel:', error)
		return null
	}
}
