import { useState } from 'react'
import { attendancesApi } from '../api'
import { useAuth } from '../context/AuthContext'
import { toMessage } from '../lib/useAsync'
import type { Attendance, AttendanceStatus } from '../types'
import { Empty } from './Panel'
import { AttendanceStatusChip } from './StatusChip'

const STATUSES: AttendanceStatus[] = [
  'AVAILABLE',
  'INTERESTED',
  'NOT_AVAILABLE'
]

interface Props {
  attendances: Attendance[]
  onChanged: () => void
}

// Renders attendances for a game day. Admins can override a user's status
// inline via a select; members see read-only chips.
export function AttendanceTable({ attendances, onChanged }: Props) {
  const { isAdmin } = useAuth()
  const [busyId, setBusyId] = useState<string | null>(null)

  if (attendances.length === 0) {
    return <Empty label="No RSVPs recorded for this game day." />
  }

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

  return (
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
              <td className="tnum">{a.userId}</td>
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
  )
}
