import { asc, eq } from 'drizzle-orm'
import { db } from '../client'
import { taskTemplates, gameDayTasks } from '../schema'
import type {
  TaskTemplate,
  NewTaskTemplate,
  GameDayTask,
  NewGameDayTask
} from '../index'

// --- task templates (per game) ---

export const getTaskTemplatesByGame = async (
  gameId: string
): Promise<TaskTemplate[]> => {
  try {
    return await db
      .select()
      .from(taskTemplates)
      .where(eq(taskTemplates.gameId, gameId))
      .orderBy(asc(taskTemplates.sortOrder))
  } catch (err) {
    console.error('Error fetching task templates', err)
    return []
  }
}

export const createTaskTemplate = async (
  template: NewTaskTemplate
): Promise<TaskTemplate | null> => {
  try {
    const [row] = await db.insert(taskTemplates).values(template).returning()
    return row ?? null
  } catch (err) {
    console.error('Error creating task template', err)
    return null
  }
}

export const updateTaskTemplate = async (
  id: string,
  updates: Partial<NewTaskTemplate>
): Promise<TaskTemplate | null> => {
  try {
    const [row] = await db
      .update(taskTemplates)
      .set(updates)
      .where(eq(taskTemplates.id, id))
      .returning()
    return row ?? null
  } catch (err) {
    console.error('Error updating task template', err)
    return null
  }
}

export const deleteTaskTemplate = async (id: string): Promise<boolean> => {
  try {
    await db.delete(taskTemplates).where(eq(taskTemplates.id, id))
    return true
  } catch (err) {
    console.error('Error deleting task template', err)
    return false
  }
}

/**
 * Replace a game's entire template set with `labels` (used by "save this game
 * day's checklist as the game default"). Order is preserved via sortOrder.
 */
export const replaceTaskTemplatesForGame = async (
  gameId: string,
  items: { label: string; description?: string | null }[]
): Promise<TaskTemplate[]> => {
  try {
    await db.delete(taskTemplates).where(eq(taskTemplates.gameId, gameId))
    if (items.length === 0) return []
    return await db
      .insert(taskTemplates)
      .values(
        items.map((it, i) => ({
          gameId,
          label: it.label,
          description: it.description ?? null,
          sortOrder: i
        }))
      )
      .returning()
  } catch (err) {
    console.error('Error replacing task templates', err)
    return []
  }
}

// --- game day tasks (checklist instances) ---

export const getGameDayTasks = async (
  gameDayId: string
): Promise<GameDayTask[]> => {
  try {
    return await db
      .select()
      .from(gameDayTasks)
      .where(eq(gameDayTasks.gameDayId, gameDayId))
      .orderBy(asc(gameDayTasks.sortOrder))
  } catch (err) {
    console.error('Error fetching game day tasks', err)
    return []
  }
}

export const createGameDayTask = async (
  task: NewGameDayTask
): Promise<GameDayTask | null> => {
  try {
    const [row] = await db.insert(gameDayTasks).values(task).returning()
    return row ?? null
  } catch (err) {
    console.error('Error creating game day task', err)
    return null
  }
}

/** Bulk-materialize checklist items (e.g. from a game's templates). */
export const createGameDayTasks = async (
  tasks: NewGameDayTask[]
): Promise<GameDayTask[]> => {
  try {
    if (tasks.length === 0) return []
    return await db.insert(gameDayTasks).values(tasks).returning()
  } catch (err) {
    console.error('Error bulk-creating game day tasks', err)
    return []
  }
}

export const updateGameDayTask = async (
  id: string,
  updates: Partial<NewGameDayTask>
): Promise<GameDayTask | null> => {
  try {
    const [row] = await db
      .update(gameDayTasks)
      .set(updates)
      .where(eq(gameDayTasks.id, id))
      .returning()
    return row ?? null
  } catch (err) {
    console.error('Error updating game day task', err)
    return null
  }
}

export const deleteGameDayTask = async (id: string): Promise<boolean> => {
  try {
    await db.delete(gameDayTasks).where(eq(gameDayTasks.id, id))
    return true
  } catch (err) {
    console.error('Error deleting game day task', err)
    return false
  }
}
