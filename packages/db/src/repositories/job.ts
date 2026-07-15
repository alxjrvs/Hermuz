import { and, asc, eq, lte } from 'drizzle-orm'
import { db } from '../client'
import { jobs } from '../schema'
import type { Job, NewJob } from '../index'

export const createJob = async (job: NewJob): Promise<Job | null> => {
  try {
    const [row] = await db.insert(jobs).values(job).returning()
    return row ?? null
  } catch (err) {
    console.error('Error creating job', err)
    return null
  }
}

/** PENDING jobs whose `runAt` is at or before `nowIso`, oldest first. */
export const getDueJobs = async (nowIso: string): Promise<Job[]> => {
  try {
    return await db
      .select()
      .from(jobs)
      .where(and(eq(jobs.status, 'PENDING'), lte(jobs.runAt, nowIso)))
      .orderBy(asc(jobs.runAt))
  } catch (err) {
    console.error('Error fetching due jobs', err)
    return []
  }
}

/** PENDING jobs of a given kind (used to avoid scheduling duplicates). */
export const getPendingJobsByKind = async (kind: string): Promise<Job[]> => {
  try {
    return await db
      .select()
      .from(jobs)
      .where(and(eq(jobs.status, 'PENDING'), eq(jobs.kind, kind)))
  } catch (err) {
    console.error('Error fetching pending jobs by kind', err)
    return []
  }
}

export const updateJob = async (
  id: string,
  updates: Partial<NewJob>
): Promise<Job | null> => {
  try {
    const [row] = await db
      .update(jobs)
      .set({ ...updates, updatedAt: new Date().toISOString() })
      .where(eq(jobs.id, id))
      .returning()
    return row ?? null
  } catch (err) {
    console.error('Error updating job', err)
    return null
  }
}

export const deleteJob = async (id: string): Promise<boolean> => {
  try {
    await db.delete(jobs).where(eq(jobs.id, id))
    return true
  } catch (err) {
    console.error('Error deleting job', err)
    return false
  }
}
