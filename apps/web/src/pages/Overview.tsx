import { Link } from 'react-router-dom'
import { gameDaysApi, gamesApi } from '../api'
import { Kpi } from '../components/Kpi'
import { Empty, ErrorBanner, Loading, Panel } from '../components/Panel'
import { GameDayStatusChip } from '../components/StatusChip'
import { formatDateTime, isUpcoming } from '../lib/format'
import { useAsync } from '../lib/useAsync'
import type { GameDay } from '../types'

export function Overview() {
  const games = useAsync(() => gamesApi.list(), [])
  const gameDays = useAsync(() => gameDaysApi.list(), [])

  const upcoming: GameDay[] = (gameDays.data ?? [])
    .filter((gd) => gd.status !== 'CANCELLED' && isUpcoming(gd.dateTime))
    .sort((a, b) => a.dateTime.localeCompare(b.dateTime))

  const scheduling = (gameDays.data ?? []).filter(
    (gd) => gd.status === 'SCHEDULING'
  ).length

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Overview</h1>
          <p>At-a-glance status across the deck.</p>
        </div>
      </div>

      <div className="kpi-grid">
        <Kpi
          label="Games"
          value={games.loading ? '—' : (games.data?.length ?? 0)}
          hint="Systems on offer"
        />
        <Kpi
          label="Upcoming game days"
          value={gameDays.loading ? '—' : upcoming.length}
          hint={`${scheduling} scheduling`}
        />
        <Kpi
          label="Total RSVPs"
          value={gameDays.loading ? '—' : (gameDays.data ?? []).length}
          hint="Game days on record"
        />
      </div>

      <Panel title="Upcoming game days">
        {gameDays.loading ? (
          <Loading />
        ) : gameDays.error ? (
          <div className="panel-body padded">
            <ErrorBanner message={gameDays.error} />
          </div>
        ) : upcoming.length === 0 ? (
          <Empty label="No upcoming game days scheduled." />
        ) : (
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>When</th>
                  <th>Location</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {upcoming.map((gd) => (
                  <tr key={gd.id}>
                    <td className="cell-strong">{gd.title}</td>
                    <td className="tnum">{formatDateTime(gd.dateTime)}</td>
                    <td>{gd.location || <span className="muted">—</span>}</td>
                    <td>
                      <GameDayStatusChip status={gd.status} />
                    </td>
                    <td className="row-actions">
                      <Link className="btn sm" to={`/game-days/${gd.id}`}>
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </>
  )
}
