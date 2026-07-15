import { and, asc, eq } from 'drizzle-orm'
import { db } from '../client'
import { meals, mealResponses } from '../schema'
import type {
  Meal,
  NewMeal,
  MealResponse,
  NewMealResponse
} from '../index'

// --- meals ---

export const createMeal = async (meal: NewMeal): Promise<Meal | null> => {
  try {
    const [row] = await db.insert(meals).values(meal).returning()
    return row ?? null
  } catch (err) {
    console.error('Error creating meal', err)
    return null
  }
}

export const getMeal = async (id: string): Promise<Meal | null> => {
  try {
    const [row] = await db.select().from(meals).where(eq(meals.id, id)).limit(1)
    return row ?? null
  } catch (err) {
    console.error('Error fetching meal', err)
    return null
  }
}

export const getMealsByGameDay = async (
  gameDayId: string
): Promise<Meal[]> => {
  try {
    return await db
      .select()
      .from(meals)
      .where(eq(meals.gameDayId, gameDayId))
      .orderBy(asc(meals.kind))
  } catch (err) {
    console.error('Error fetching meals by game day', err)
    return []
  }
}

export const updateMeal = async (
  id: string,
  updates: Partial<NewMeal>
): Promise<Meal | null> => {
  try {
    const [row] = await db
      .update(meals)
      .set(updates)
      .where(eq(meals.id, id))
      .returning()
    return row ?? null
  } catch (err) {
    console.error('Error updating meal', err)
    return null
  }
}

export const deleteMeal = async (id: string): Promise<boolean> => {
  try {
    await db.delete(mealResponses).where(eq(mealResponses.mealId, id))
    await db.delete(meals).where(eq(meals.id, id))
    return true
  } catch (err) {
    console.error('Error deleting meal', err)
    return false
  }
}

// --- meal responses ---

export const getMealResponses = async (
  mealId: string
): Promise<MealResponse[]> => {
  try {
    return await db
      .select()
      .from(mealResponses)
      .where(eq(mealResponses.mealId, mealId))
  } catch (err) {
    console.error('Error fetching meal responses', err)
    return []
  }
}

export const getMealResponse = async (
  mealId: string,
  userId: string
): Promise<MealResponse | null> => {
  try {
    const [row] = await db
      .select()
      .from(mealResponses)
      .where(
        and(eq(mealResponses.mealId, mealId), eq(mealResponses.userId, userId))
      )
      .limit(1)
    return row ?? null
  } catch (err) {
    console.error('Error fetching meal response', err)
    return null
  }
}

/** Insert or update a user's response to a meal poll. */
export const upsertMealResponse = async (
  mealId: string,
  userId: string,
  updates: Pick<NewMealResponse, 'attending' | 'note'>
): Promise<MealResponse | null> => {
  try {
    const existing = await getMealResponse(mealId, userId)
    if (existing) {
      const [row] = await db
        .update(mealResponses)
        .set({ ...updates, respondedAt: new Date().toISOString() })
        .where(eq(mealResponses.id, existing.id))
        .returning()
      return row ?? null
    }
    const [row] = await db
      .insert(mealResponses)
      .values({ mealId, userId, ...updates })
      .returning()
    return row ?? null
  } catch (err) {
    console.error('Error upserting meal response', err)
    return null
  }
}
