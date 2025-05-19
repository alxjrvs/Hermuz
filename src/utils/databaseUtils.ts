import { logger } from 'robo.js'
import { PostgrestError } from '@supabase/supabase-js'

/**
 * Generic database operation wrapper that handles common error patterns
 *
 * @param operation Function that returns a Supabase query result
 * @param errorMessage Message to log if the operation fails
 * @param functionName Name of the calling function for error context
 * @returns The data from the operation or null if it failed
 */
export async function executeDbOperation<T>(
  operation: () => Promise<{ data: T | null; error: PostgrestError | null }>,
  errorMessage: string,
  functionName: string
): Promise<T | null> {
  try {
    const { data, error } = await operation()

    if (error) {
      logger.error(`${errorMessage}:`, error)
      return null
    }

    return data
  } catch (error) {
    logger.error(`Error in ${functionName}:`, error)
    return null
  }
}

/**
 * Generic database operation wrapper for operations that return arrays
 *
 * @param operation Function that returns a Supabase query result with an array
 * @param errorMessage Message to log if the operation fails
 * @param functionName Name of the calling function for error context
 * @returns The array of data from the operation or an empty array if it failed
 */
export async function executeDbArrayOperation<T>(
  operation: () => Promise<{ data: T[] | null; error: PostgrestError | null }>,
  errorMessage: string,
  functionName: string
): Promise<T[]> {
  try {
    const { data, error } = await operation()

    if (error) {
      logger.error(`${errorMessage}:`, error)
      return []
    }

    return data || []
  } catch (error) {
    logger.error(`Error in ${functionName}:`, error)
    return []
  }
}

/**
 * Generic database operation wrapper for operations that modify data (insert, update, delete)
 *
 * @param operation Function that returns a Supabase query result
 * @param errorMessage Message to log if the operation fails
 * @param functionName Name of the calling function for error context
 * @returns True if the operation succeeded, false otherwise
 */
export async function executeDbModifyOperation(
  operation: () => Promise<{ error: PostgrestError | null }>,
  errorMessage: string,
  functionName: string
): Promise<boolean> {
  try {
    const { error } = await operation()

    if (error) {
      logger.error(`${errorMessage}:`, error)
      return false
    }

    return true
  } catch (error) {
    logger.error(`Error in ${functionName}:`, error)
    return false
  }
}
