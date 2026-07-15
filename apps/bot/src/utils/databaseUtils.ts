import { logger } from 'robo.js'
import { PostgrestError } from '@supabase/supabase-js'
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
