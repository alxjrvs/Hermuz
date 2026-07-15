import { useEffect, useState } from 'react'
import { gameDaysApi } from '../api'
import { AttendanceTable } from '../components/AttendanceTable'
import { ErrorBanner, Loading, Panel } from '../components/Panel'
import { GameDayStatusChip } from '../components/StatusChip'
import { formatDateTime } from '../lib/format'
import { toMessage, useAsync } from '../lib/useAsync'
import type { Attendance as AttendanceRow, GameDay } from '../types'

export function Attendance() {
  const gameDays = useAsync(() => gameDaysApi.list(), [])
  const [selectedId, setSelectedId] = useState<string>('')

  const list: GameDay[] = (gameDays.data ?? [])
    .slice()
    .sort((a, b) => b.dateTime.localeCompare(a.dateTime))

  // Default to the most recent game day once loaded.
  useEffect(() => {
    if (!selectedId && list.length > 0) setSelectedId(list[0].id)
  }, [list, selectedId])

  const selected = list.find((gd) => gd.id === selectedId) ?? null

  const [rows, setRows] = useState<AttendanceRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadAttendances = (gameDayId: string) => {
    if (!gameDayId) return
    setLoading(true)
    setError(null)
    gameDaysApi
      .attendances(gameDayId)
      .then(setRows)
      .catch((err) => setError(toMessage(err)))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    if (selectedId) loadAttendances(selectedId)
  }, [selectedId])

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Attendance</h1>
          <p>Review and override RSVPs for a game day.</p>
        </div>
      </div>

      <Panel
        title="Game day"
        actions={
          <select
            className="select"
            style={{ maxWidth: 320 }}
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            disabled={gameDays.loading || list.length === 0}
          >
            {list.length === 0 && <option value="">No game days</option>}
            {list.map((gd) => (
              <option key={gd.id} value={gd.id}>
                {gd.title} · {formatDateTime(gd.dateTime)}
              </option>
            ))}
          </select>
        }
        padded
      >
        {gameDays.loading ? (
          <Loading />
        ) : gameDays.error ? (
          <ErrorBanner message={gameDays.error} />
        ) : selected ? (
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <div>
              <div className="cell-strong">{selected.title}</div>
              <div className="cell-sub">
                {formatDateTime(selected.dateTime)}
                {selected.location ? ` · ${selected.location}` : ''}
              </div>
            </div>
            <GameDayStatusChip status={selected.status} />
          </div>
        ) : (
          <div className="muted">Select a game day to view attendance.</div>
        )}
      </Panel>

      <Panel title="RSVPs">
        {loading ? (
          <Loading />
        ) : error ? (
          <div className="panel-body padded">
            <ErrorBanner message={error} />
          </div>
        ) : (
          <AttendanceTable
            gameDayId={selectedId}
            attendances={rows}
            onChanged={() => loadAttendances(selectedId)}
          />
        )}
      </Panel>
    </>
  )
}
