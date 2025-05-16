import { supabase } from '../utils/supabase'
import type { Server, ServerInsert, ServerUpdate } from '../utils/supabase'
import { logger } from 'robo.js'

/**
 * Get a server by its Discord ID
 */
export const getServerByDiscordId = async (discordId: string): Promise<Server | null> => {
	try {
		const { data, error } = await supabase
			.from('servers')
			.select('*')
			.eq('discord_id', discordId)
			.single()

		if (error) {
			logger.error('Error fetching server by Discord ID:', error)
			return null
		}

		return data
	} catch (error) {
		logger.error('Error in getServerByDiscordId:', error)
		return null
	}
}

/**
 * Get a server by its ID
 */
export const getServer = async (id: string): Promise<Server | null> => {
	try {
		const { data, error } = await supabase.from('servers').select('*').eq('id', id).single()

		if (error) {
			logger.error('Error fetching server:', error)
			return null
		}

		return data
	} catch (error) {
		logger.error('Error in getServer:', error)
		return null
	}
}

/**
 * Create a new server
 */
export const createServer = async (server: ServerInsert): Promise<Server | null> => {
	try {
		const { data, error } = await supabase.from('servers').insert(server).select().single()

		if (error) {
			logger.error('Error creating server:', error)
			return null
		}

		return data
	} catch (error) {
		logger.error('Error in createServer:', error)
		return null
	}
}

/**
 * Update a server
 */
export const updateServer = async (id: string, updates: ServerUpdate): Promise<Server | null> => {
	try {
		const { data, error } = await supabase
			.from('servers')
			.update({
				...updates,
				updated_at: new Date().toISOString()
			})
			.eq('id', id)
			.select()
			.single()

		if (error) {
			logger.error('Error updating server:', error)
			return null
		}

		return data
	} catch (error) {
		logger.error('Error in updateServer:', error)
		return null
	}
}

/**
 * Get or create a server by its Discord ID
 */
export const getOrCreateServer = async (
	discordId: string,
	schedulingChannelId?: string
): Promise<Server | null> => {
	const server = await getServerByDiscordId(discordId)

	if (server) {
		return server
	}

	return createServer({
		discord_id: discordId,
		scheduling_channel_id: schedulingChannelId
	})
}
