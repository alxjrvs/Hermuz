import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { campaignsApi, playersApi } from '../api'
import { Kpi } from '../components/Kpi'
import { Empty, ErrorBanner, Loading, Panel } from '../components/Panel'
import { PlayerStatusChip } from '../components/StatusChip'
import { useAuth } from '../context/AuthContext'
import { toMessage, useAsync } from '../lib/useAsync'
import type { Player, PlayerStatus } from '../types'

const PLAYER_STATUSES: PlayerStatus[] = ['INTERESTED', 'CONFIRMED']

export function CampaignDetail() {
  const { id = '' } = useParams()
  const { isAdmin } = useAuth()
  const campaign = useAsync(() => campaignsApi.get(id), [id])
  const players = useAsync(() => campaignsApi.players(id), [id])
  const [busyId, setBusyId] = useState<string | null>(null)

  if (campaign.loading) return <Loading label="Loading campaign…" />
  if (campaign.error) return <ErrorBanner message={campaign.error} />
  if (!campaign.data) return <ErrorBanner message="Campaign not found." />

  const rows = players.data ?? []
  const confirmed = rows.filter((p) => p.status === 'CONFIRMED').length

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

  return (
    <>
      <div className="page-head">
        <div>
          <h1>{campaign.data.title}</h1>
          <p>
            {campaign.data.gameName ?? 'No game'}
            {campaign.data.regularGameTime
              ? ` · ${campaign.data.regularGameTime}`
              : ''}
          </p>
        </div>
        <Link className="btn" to="/campaigns">
          Back
        </Link>
      </div>

      <div className="kpi-grid">
        <Kpi label="Players" value={rows.length} />
        <Kpi label="Confirmed" value={confirmed} />
        <Kpi label="Interested" value={rows.length - confirmed} />
      </div>

      {campaign.data.description && (
        <Panel title="Description" padded>
          <div className="muted">{campaign.data.description}</div>
        </Panel>
      )}

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
    </>
  )
}
