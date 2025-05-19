import { logger } from 'robo.js'
import { initSupabase, supabase } from '../../utils/supabase'

export default async () => {
  logger.info('Initializing Supabase connection...')
  const connected = await initSupabase()

  if (connected) {
    // Log RLS status
    try {
      const { data, error } = await supabase
        .from('pg_tables')
        .select('tablename, rowsecurity')
        .eq('schemaname', 'public')

      if (!error && data) {
        const tablesWithRLS = data.filter((table) => table.rowsecurity).length
        const totalTables = data.length

        logger.info(
          `Row Level Security (RLS) is enabled on ${tablesWithRLS}/${totalTables} tables`
        )
      }
    } catch (error) {
      // Just log and continue if this fails
      logger.warn('Could not check RLS status:', error)
    }
  } else {
    logger.error(
      'Failed to connect to Supabase. Some features may not work correctly.'
    )
  }
}
