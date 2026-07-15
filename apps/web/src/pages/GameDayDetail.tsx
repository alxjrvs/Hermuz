import { Link, useParams } from 'react-router-dom'
import { gameDaysApi } from '../api'
import { AttendanceTable } from '../components/AttendanceTable'
import { Checklist } from '../components/Checklist'
import { Kpi } from '../components/Kpi'
import { ErrorBanner, Loading, Panel } from '../components/Panel'
import { GameDayStatusChip, LocationTypeChip } from '../components/StatusChip'
import { formatDateTime } from '../lib/format'
import { useAsync } from '../lib/useAsync'

export function GameDayDetail() {
  const { id = '' } = useParams()
  const gd = useAsync(() => gameDaysApi.get(id), [id])
  const attendances = useAsync(() => gameDaysApi.attendances(id), [id])

  if (gd.loading) return <Loading label="Loading game day…" />
  if (gd.error) return <ErrorBanner message={gd.error} />
  if (!gd.data) return <ErrorBanner message="Game day not found." />

  const rows = attendances.data ?? []
  const available = rows.filter((a) => a.status === 'AVAILABLE').length
  const interested = rows.filter((a) => a.status === 'INTERESTED').length

  return (
    <>
      <div className="page-head">
        <div>
          <h1>{gd.data.title}</h1>
          <p>{formatDateTime(gd.data.dateTime)}</p>
        </div>
        <div className="row">
          <LocationTypeChip type={gd.data.locationType} />
          <GameDayStatusChip status={gd.data.status} />
          <Link className="btn" to="/game-days">
            Back
          </Link>
        </div>
      </div>

      <div className="kpi-grid">
        <Kpi label="Available" value={available} />
        <Kpi label="Interested" value={interested} />
        <Kpi label="Total RSVPs" value={rows.length} />
      </div>

      {(gd.data.location || gd.data.description) && (
        <Panel title="Details" padded>
          <div className="stack">
            {gd.data.location && (
              <div>
                <div className="kpi-label">Location</div>
                <div>{gd.data.location}</div>
              </div>
            )}
            {gd.data.description && (
              <div>
                <div className="kpi-label">Description</div>
                <div className="muted">{gd.data.description}</div>
              </div>
            )}
          </div>
        </Panel>
      )}

      <Panel title="Attendances">
        {attendances.loading ? (
          <Loading />
        ) : attendances.error ? (
          <div className="panel-body padded">
            <ErrorBanner message={attendances.error} />
          </div>
        ) : (
          <AttendanceTable
            gameDayId={gd.data.id}
            attendances={rows}
            onChanged={attendances.reload}
          />
        )}
      </Panel>

      <Checklist gameDayId={gd.data.id} hasGame={!!gd.data.gameId} />
    </>
  )
}
