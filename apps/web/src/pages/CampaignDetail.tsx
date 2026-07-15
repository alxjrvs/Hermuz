import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { campaignsApi, playersApi } from '../api'
import { DiscordAction, DiscordLegend } from '../components/DiscordAction'
import { Kpi } from '../components/Kpi'
import { Empty, ErrorBanner, Loading, Panel } from '../components/Panel'
import { SessionCalendar } from '../components/SessionCalendar'
import {
  GameDayStatusChip,
  PlayerStatusChip,
  SchedulingKindChip
} from '../components/StatusChip'
import { useAuth } from '../context/AuthContext'
import { formatDateTime, isUpcoming } from '../lib/format'
import { toMessage, useAsync } from '../lib/useAsync'
import type { Campaign, Player, PlayerStatus } from '../types'

const PLAYER_STATUSES: PlayerStatus[] = ['INTERESTED', 'CONFIRMED']
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

// Human recurrence summary, e.g. "Every Tue 19:00, weekly".
function recurrenceSummary(c: Campaign): string | null {
  if (c.schedulingKind !== 'REPEATING') return null
  const day = c.recurrenceWeekday != null ? WEEKDAYS[c.recurrenceWeekday] : null
  const iv = c.recurrenceIntervalWeeks ?? 1
  const cadence = iv === 1 ? 'weekly' : `every ${iv} weeks`
  const head = [day, c.recurrenceTime].filter(Boolean).join(' ')
  return head ? `Every ${head}, ${cadence}` : `Repeats ${cadence}`
}

export function CampaignDetail() {
  const { id = '' } = useParams()
  const { isAdmin } = useAuth()
  const campaign = useAsync(() => campaignsApi.get(id), [id])
  const players = useAsync(() => campaignsApi.players(id), [id])
  const sessions = useAsync(() => campaignsApi.sessions(id), [id])
  const [busyId, setBusyId] = useState<string | null>(null)
  const [actionBusy, setActionBusy] = useState(false)
  const [actionErr, setActionErr] = useState<string | null>(null)

  if (campaign.loading) return <Loading label="Loading campaign…" />
  if (campaign.error) return <ErrorBanner message={campaign.error} />
  if (!campaign.data) return <ErrorBanner message="Campaign not found." />

  const c = campaign.data
  const rows = players.data ?? []
  const confirmed = rows.filter((p) => p.status === 'CONFIRMED').length

  const sessionRows = (sessions.data ?? [])
    .slice()
    .sort((a, b) => a.dateTime.localeCompare(b.dateTime))
  const active = sessionRows.filter((s) => s.status !== 'CANCELLED').length
  const cap = c.maxSessions
  const repeating = c.schedulingKind === 'REPEATING'
  const summary = recurrenceSummary(c)

  const setStatus = async (p: Player, status: PlayerStatus) => {
    if (status === p.status) return
    setBusyId(p.id)
    try {
      await playersApi.update(p.id, { status })
      players.reload()
    } catch (err) {
      window.alert(toMessage(err))
    } finally {
      setBusyId(null)
    }
  }

  const removePlayer = async (p: Player) => {
    if (!window.confirm('Remove this player from the campaign?')) return
    setBusyId(p.id)
    try {
      await playersApi.remove(p.id)
      players.reload()
    } catch (err) {
      window.alert(toMessage(err))
    } finally {
      setBusyId(null)
    }
  }

  // Shared runner for the write actions that create/remove Discord state; a
  // 409 (session cap reached) surfaces inline via `actionErr`.
  const runAction = async (fn: () => Promise<unknown>) => {
    setActionBusy(true)
    setActionErr(null)
    try {
      await fn()
      sessions.reload()
      campaign.reload()
    } catch (err) {
      setActionErr(toMessage(err))
    } finally {
      setActionBusy(false)
    }
  }

  const cancelSession = async (gameDayId: string) => {
    if (!window.confirm('Cancel this session? Attendees will be notified.'))
      return
    setBusyId(gameDayId)
    setActionErr(null)
    try {
      await campaignsApi.cancelSession(id, gameDayId)
      sessions.reload()
      campaign.reload()
    } catch (err) {
      setActionErr(toMessage(err))
    } finally {
      setBusyId(null)
    }
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1>{c.title}</h1>
          <p>
            {c.gameName ?? 'No game'}
            {c.regularGameTime ? ` · ${c.regularGameTime}` : ''}
          </p>
        </div>
        <Link className="btn" to="/campaigns">
          Back
        </Link>
      </div>

      <div className="row" style={{ gap: 10, flexWrap: 'wrap' }}>
        <SchedulingKindChip kind={c.schedulingKind} />
        {summary && <span className="muted">{summary}</span>}
        <span className="muted">
          Sessions {active} of {cap ?? '∞'}
        </span>
      </div>

      <div className="kpi-grid">
        <Kpi label="Players" value={rows.length} />
        <Kpi label="Confirmed" value={confirmed} />
        <Kpi label="Interested" value={rows.length - confirmed} />
      </div>

      {c.description && (
        <Panel title="Description" padded>
          <div className="muted">{c.description}</div>
        </Panel>
      )}

      {isAdmin && <DiscordLegend />}
      {actionErr && <div className="banner warn">{actionErr}</div>}

      <Panel title="Players">
        {players.loading ? (
          <Loading />
        ) : players.error ? (
          <div className="panel-body padded">
            <ErrorBanner message={players.error} />
          </div>
        ) : rows.length === 0 ? (
          <Empty label="No players have joined yet." />
        ) : (
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Character</th>
                  <th>Status</th>
                  {isAdmin && <th />}
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => (
                  <tr key={p.id}>
                    <td className="tnum">{p.userId}</td>
                    <td>
                      {p.characterName || <span className="muted">—</span>}
                    </td>
                    <td>
                      <PlayerStatusChip status={p.status} />
                    </td>
                    {isAdmin && (
                      <td className="row-actions">
                        <select
                          className="select"
                          style={{ maxWidth: 150 }}
                          value={p.status}
                          disabled={busyId === p.id}
                          onChange={(e) =>
                            setStatus(p, e.target.value as PlayerStatus)
                          }
                        >
                          {PLAYER_STATUSES.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                        <button
                          className="btn sm danger"
                          disabled={busyId === p.id}
                          onClick={() => removePlayer(p)}
                        >
                          Remove
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <Panel
        title="Sessions"
        actions={
          isAdmin ? (
            repeating ? (
              <DiscordAction tip="Creates Discord events + channels">
                <button
                  className="btn sm"
                  disabled={actionBusy}
                  onClick={() => runAction(() => campaignsApi.generate(id))}
                >
                  Generate / extend series
                </button>
              </DiscordAction>
            ) : (
              <DiscordAction tip="Creates a Discord event + channel">
                <button
                  className="btn sm"
                  disabled={actionBusy}
                  onClick={() => runAction(() => campaignsApi.scheduleNext(id))}
                >
                  Schedule next session
                </button>
              </DiscordAction>
            )
          ) : undefined
        }
      >
        {sessions.loading ? (
          <Loading />
        ) : sessions.error ? (
          <div className="panel-body padded">
            <ErrorBanner message={sessions.error} />
          </div>
        ) : sessionRows.length === 0 ? (
          <Empty label="No sessions scheduled yet." />
        ) : (
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Title</th>
                  <th>When</th>
                  <th>Status</th>
                  {isAdmin && <th />}
                </tr>
              </thead>
              <tbody>
                {sessionRows.map((gd) => {
                  const cancellable =
                    gd.status !== 'CANCELLED' && isUpcoming(gd.dateTime)
                  return (
                    <tr key={gd.id}>
                      <td className="tnum">{gd.sessionNumber ?? '—'}</td>
                      <td className="cell-strong">
                        <Link to={`/game-days/${gd.id}`}>{gd.title}</Link>
                      </td>
                      <td className="tnum">{formatDateTime(gd.dateTime)}</td>
                      <td>
                        <GameDayStatusChip status={gd.status} />
                      </td>
                      {isAdmin && (
                        <td className="row-actions">
                          {cancellable && (
                            <DiscordAction tip="Deletes Discord channels + event">
                              <button
                                className="btn sm danger"
                                disabled={busyId === gd.id}
                                onClick={() => cancelSession(gd.id)}
                              >
                                Cancel
                              </button>
                            </DiscordAction>
                          )}
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {repeating && sessionRows.length > 0 && (
        <Panel title="Session calendar" padded>
          <SessionCalendar sessions={sessionRows} />
        </Panel>
      )}
    </>
  )
}
