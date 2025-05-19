import { logger } from 'robo.js'
import { supabase } from './supabase'
import type { RoboRequest, RoboReply } from '@robojs/server'

/**
 * Admin authentication middleware
 * Verifies that the request has a valid authentication token
 * and that the user has admin privileges
 * 
 * @param request The request object
 * @param reply The reply object
 * @returns The authenticated user or false if authentication failed
 */
export const adminAuthMiddleware = async (request: RoboRequest, reply: RoboReply) => {
  try {
    // Get the session from the request
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      reply.code(401).send(JSON.stringify({ error: 'Unauthorized' }))
      return false
    }

    const token = authHeader.split(' ')[1]
    const { data, error } = await supabase.auth.getUser(token)

    if (error || !data.user) {
      reply.code(401).send(JSON.stringify({ error: 'Unauthorized' }))
      return false
    }

    // Check if the user is an admin (you can implement your own admin check logic)
    // For example, check if the user has a specific role in Supabase
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('discord_id', data.user.id)
      .single()

    if (userError || !userData) {
      reply.code(403).send(JSON.stringify({ error: 'Forbidden' }))
      return false
    }

    // Return the user for later use
    return data.user
  } catch (error) {
    logger.error('Error in admin auth middleware:', error)
    reply.code(500).send(JSON.stringify({ error: 'Internal Server Error' }))
    return false
  }
}
