import { and, eq } from 'drizzle-orm'
import { db } from '../client'
import type { Attendance, AttendanceStatus, NewAttendance } from '../index'
import { attendances } from '../schema'

export const getAttendance = async (id: string): Promise<Attendance | null> => {
  try {
    const [row] = await db
      .select()
      .from(attendances)
      .where(eq(attendances.id, id))
      .limit(1)
    return row ?? null
  } catch (err) {
    console.error('Error fetching attendance', err)
    return null
  }
}

export const getUserAttendance = async (
  gameDayId: string,
  userId: string
): Promise<Attendance | null> => {
  try {
    const [row] = await db
      .select()
      .from(attendances)
      .where(
        and(
          eq(attendances.gameDayId, gameDayId),
          eq(attendances.userId, userId)
        )
      )
      .limit(1)
    return row ?? null
  } catch (err) {
    console.error('Error fetching user attendance', err)
    return null
  }
}

export const getGameDayAttendances = async (
  gameDayId: string
): Promise<Attendance[]> => {
  try {
    return await db
      .select()
      .from(attendances)
      .where(eq(attendances.gameDayId, gameDayId))
  } catch (err) {
    console.error('Error fetching game day attendances', err)
    return []
  }
}

export const getAttendancesByUser = async (
  userId: string
): Promise<Attendance[]> => {
  try {
    return await db
      .select()
      .from(attendances)
      .where(eq(attendances.userId, userId))
  } catch (err) {
    console.error('Error fetching attendances by user', err)
    return []
  }
}

export const getAttendancesByStatus = async (
  gameDayId: string,
  status: AttendanceStatus
): Promise<Attendance[]> => {
  try {
    return await db
      .select()
      .from(attendances)
      .where(
        and(
          eq(attendances.gameDayId, gameDayId),
          eq(attendances.status, status)
        )
      )
  } catch (err) {
    console.error(`Error fetching attendances with status ${status}`, err)
    return []
  }
}

export const createAttendance = async (
  attendance: NewAttendance
): Promise<Attendance | null> => {
  try {
    const [row] = await db.insert(attendances).values(attendance).returning()
    return row ?? null
  } catch (err) {
    console.error('Error creating attendance', err)
    return null
  }
}

export const updateAttendance = async (
  id: string,
  updates: Partial<NewAttendance>
): Promise<Attendance | null> => {
  try {
    const [row] = await db
      .update(attendances)
      .set(updates)
      .where(eq(attendances.id, id))
      .returning()
    return row ?? null
  } catch (err) {
    console.error('Error updating attendance', err)
    return null
  }
}

export const updateUserAttendance = async (
  gameDayId: string,
  userId: string,
  status: AttendanceStatus
): Promise<Attendance | null> => {
  const existingAttendance = await getUserAttendance(gameDayId, userId)
  if (existingAttendance) {
    return updateAttendance(existingAttendance.id, { status })
  }
  return createAttendance({ gameDayId, userId, status })
}
