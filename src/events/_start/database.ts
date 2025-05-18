import { logger } from 'robo.js'
import { initSupabase } from '../../utils/supabase'

export default async () => {
  logger.info('Initializing Supabase connection...')

  const connected = await initSupabase()

  if (connected) {
    logger.info('Successfully connected to Supabase')
  } else {
    logger.error(
      'Failed to connect to Supabase. Some features may not work correctly.'
    )
  }
}
