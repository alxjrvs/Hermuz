import { useState } from 'react'
import { attendancesApi } from '../api'
import { useAuth } from '../context/AuthContext'
import { toMessage } from '../lib/useAsync'
import { useUserNames } from '../lib/useUserNames'
import type { Attendance, AttendanceStatus } from '../types'
import { Empty } from './Panel'
import { AttendanceStatusChip } from './StatusChip'
import { UserName } from './UserName'

const STATUSES: AttendanceStatus[] = [
  'AVAILABLE',
  'INTERESTED',
  'NOT_AVAILABLE'
]

interface Props {
  gameDayId: string
  attendances: Attendance[]
  onChanged: () => void
}

// Renders attendances for a game day with resolved names/avatars. Every member
// gets a self-RSVP control for their own row; admins can additionally override
// anyone's status.
export function AttendanceTable({ gameDayId, attendances, onChanged }: Props) {
  const { isAdmin, user } = useAuth()
  const [busyId, setBusyId] = useState<string | null>(null)
  const [selfBusy, setSelfBusy] = useState(false)
  const names = useUserNames(
    attendances.map((a) => a.userId).filter((id): id is string => !!id)
  )

  const override = async (a: Attendance, status: AttendanceStatus) => {
    if (status === a.status) return
    setBusyId(a.id)
    try {
      await attendancesApi.update(a.id, status)
      onChanged()
    } catch (err) {
      window.alert(toMessage(err))
    } finally {
      setBusyId(null)
    }
  }

  const rsvpSelf = async (status: AttendanceStatus) => {
    setSelfBusy(true)
    try {
      await attendancesApi.setMine(gameDayId, status)
      onChanged()
    } catch (err) {
      window.alert(toMessage(err))
    } finally {
      setSelfBusy(false)
    }
  }

  const mine = attendances.find((a) => a.userId === user?.id)

  return (
    <>
      <div className="self-rsvp">
        <span className="muted">Your RSVP{mine ? ':' : ''}</span>
        {mine && <AttendanceStatusChip status={mine.status} />}
        <div className="row">
          {STATUSES.map((s) => (
            <button
              key={s}
              className={`btn sm ${mine?.status === s ? 'primary' : ''}`}
              disabled={selfBusy}
              onClick={() => rsvpSelf(s)}
            >
              {s === 'AVAILABLE'
                ? "✅ I'm in"
                : s === 'INTERESTED'
                  ? '🤔 Interested'
                  : '❌ Out'}
            </button>
          ))}
        </div>
      </div>

      {attendances.length === 0 ? (
        <Empty label="No RSVPs recorded for this game day." />
      ) : (
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>User</th>
                <th>Status</th>
                {isAdmin && <th>Override</th>}
              </tr>
            </thead>
            <tbody>
              {attendances.map((a) => (
                <tr key={a.id}>
                  <td>
                    <UserName
                      id={a.userId ?? '—'}
                      user={a.userId ? names.get(a.userId) : undefined}
                    />
                  </td>
                  <td>
                    <AttendanceStatusChip status={a.status} />
                  </td>
                  {isAdmin && (
                    <td>
                      <select
                        className="select"
                        style={{ maxWidth: 180 }}
                        value={a.status}
                        disabled={busyId === a.id}
                        onChange={(e) =>
                          override(a, e.target.value as AttendanceStatus)
                        }
                      >
                        {STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {s.replace(/_/g, ' ')}
                          </option>
                        ))}
                      </select>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
