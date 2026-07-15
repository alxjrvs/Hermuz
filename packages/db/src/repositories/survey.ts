import { and, asc, desc, eq } from 'drizzle-orm'
import { db } from '../client'
import type {
  NewSurvey,
  NewSurveyDate,
  NewSurveyResponse,
  Survey,
  SurveyDate,
  SurveyResponse
} from '../index'
import { surveyDates, surveyResponses, surveys } from '../schema'

// --- surveys ---

export const createSurvey = async (
  survey: NewSurvey
): Promise<Survey | null> => {
  try {
    const [row] = await db.insert(surveys).values(survey).returning()
    return row ?? null
  } catch (err) {
    console.error('Error creating survey', err)
    return null
  }
}

export const getSurvey = async (id: string): Promise<Survey | null> => {
  try {
    const [row] = await db
      .select()
      .from(surveys)
      .where(eq(surveys.id, id))
      .limit(1)
    return row ?? null
  } catch (err) {
    console.error('Error fetching survey', err)
    return null
  }
}

export const getAllSurveys = async (): Promise<Survey[]> => {
  try {
    return await db.select().from(surveys).orderBy(desc(surveys.createdAt))
  } catch (err) {
    console.error('Error fetching surveys', err)
    return []
  }
}

export const getOpenSurveys = async (): Promise<Survey[]> => {
  try {
    return await db
      .select()
      .from(surveys)
      .where(eq(surveys.status, 'OPEN'))
      .orderBy(desc(surveys.createdAt))
  } catch (err) {
    console.error('Error fetching open surveys', err)
    return []
  }
}

export const updateSurvey = async (
  id: string,
  updates: Partial<NewSurvey>
): Promise<Survey | null> => {
  try {
    const [row] = await db
      .update(surveys)
      .set({ ...updates, updatedAt: new Date().toISOString() })
      .where(eq(surveys.id, id))
      .returning()
    return row ?? null
  } catch (err) {
    console.error('Error updating survey', err)
    return null
  }
}

export const deleteSurvey = async (id: string): Promise<boolean> => {
  try {
    await db.delete(surveyResponses).where(eq(surveyResponses.surveyId, id))
    await db.delete(surveyDates).where(eq(surveyDates.surveyId, id))
    await db.delete(surveys).where(eq(surveys.id, id))
    return true
  } catch (err) {
    console.error('Error deleting survey', err)
    return false
  }
}

// --- survey dates ---

export const createSurveyDate = async (
  date: NewSurveyDate
): Promise<SurveyDate | null> => {
  try {
    const [row] = await db.insert(surveyDates).values(date).returning()
    return row ?? null
  } catch (err) {
    console.error('Error creating survey date', err)
    return null
  }
}

export const getSurveyDates = async (
  surveyId: string
): Promise<SurveyDate[]> => {
  try {
    return await db
      .select()
      .from(surveyDates)
      .where(eq(surveyDates.surveyId, surveyId))
      .orderBy(asc(surveyDates.sortOrder), asc(surveyDates.dateTime))
  } catch (err) {
    console.error('Error fetching survey dates', err)
    return []
  }
}

export const getSurveyDate = async (id: string): Promise<SurveyDate | null> => {
  try {
    const [row] = await db
      .select()
      .from(surveyDates)
      .where(eq(surveyDates.id, id))
      .limit(1)
    return row ?? null
  } catch (err) {
    console.error('Error fetching survey date', err)
    return null
  }
}

// --- survey responses ---

export const getSurveyResponses = async (
  surveyId: string
): Promise<SurveyResponse[]> => {
  try {
    return await db
      .select()
      .from(surveyResponses)
      .where(eq(surveyResponses.surveyId, surveyId))
  } catch (err) {
    console.error('Error fetching survey responses', err)
    return []
  }
}

const getSurveyResponse = async (
  surveyDateId: string,
  userId: string
): Promise<SurveyResponse | null> => {
  try {
    const [row] = await db
      .select()
      .from(surveyResponses)
      .where(
        and(
          eq(surveyResponses.surveyDateId, surveyDateId),
          eq(surveyResponses.userId, userId)
        )
      )
      .limit(1)
    return row ?? null
  } catch (err) {
    console.error('Error fetching survey response', err)
    return null
  }
}

/** Insert or update a user's availability (0/1) for one candidate date. */
export const upsertSurveyResponse = async (
  surveyId: string,
  surveyDateId: string,
  userId: string,
  available: NewSurveyResponse['available']
): Promise<SurveyResponse | null> => {
  try {
    const existing = await getSurveyResponse(surveyDateId, userId)
    if (existing) {
      const [row] = await db
        .update(surveyResponses)
        .set({ available, respondedAt: new Date().toISOString() })
        .where(eq(surveyResponses.id, existing.id))
        .returning()
      return row ?? null
    }
    const [row] = await db
      .insert(surveyResponses)
      .values({ surveyId, surveyDateId, userId, available })
      .returning()
    return row ?? null
  } catch (err) {
    console.error('Error upserting survey response', err)
    return null
  }
}
