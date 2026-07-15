import { useState } from 'react'
import { Link } from 'react-router-dom'
import { campaignsApi, gamesApi } from '../api'
import { DiscordAction, DiscordLegend } from '../components/DiscordAction'
import { Modal } from '../components/Modal'
import { Empty, ErrorBanner, Loading, Panel } from '../components/Panel'
import { useAuth } from '../context/AuthContext'
import { toMessage, useAsync } from '../lib/useAsync'
import type { Campaign, CampaignInput, Game, SchedulingKind } from '../types'

const SCHEDULING_KINDS: SchedulingKind[] = ['SCHEDULED', 'REPEATING']
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function Campaigns() {
  const { isAdmin } = useAuth()
  const { data, loading, error, reload } = useAsync(
    () => campaignsApi.list(),
    []
  )
  const games = useAsync(() => gamesApi.list(), [])
  const [editing, setEditing] = useState<Campaign | null>(null)
  const [creating, setCreating] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)

  const campaigns = data ?? []

  const onDelete = async (c: Campaign) => {
    if (!window.confirm(`Delete "${c.title}"? This cannot be undone.`)) return
    setBusyId(c.id)
    try {
      await campaignsApi.remove(c.id)
      reload()
    } catch (err) {
      window.alert(toMessage(err))
    } finally {
      setBusyId(null)
    }
  }

  const onAnnounce = async (c: Campaign) => {
    setBusyId(c.id)
    try {
      await campaignsApi.announce(c.id)
      reload()
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
          <h1>Campaigns</h1>
          <p>Ongoing games with a recurring table.</p>
        </div>
        {isAdmin && (
          <button className="btn primary" onClick={() => setCreating(true)}>
            + New campaign
          </button>
        )}
      </div>

      {isAdmin && <DiscordLegend />}

      <Panel title="All campaigns">
        {loading ? (
          <Loading />
        ) : error ? (
          <div className="panel-body padded">
            <ErrorBanner message={error} />
          </div>
        ) : campaigns.length === 0 ? (
          <Empty label="No campaigns yet." />
        ) : (
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Game</th>
                  <th>Regular time</th>
                  {isAdmin && <th />}
                </tr>
              </thead>
              <tbody>
                {campaigns.map((c) => (
                  <tr key={c.id}>
                    <td className="cell-strong">
                      <Link to={`/campaigns/${c.id}`}>{c.title}</Link>
                    </td>
                    <td>{c.gameName || <span className="muted">—</span>}</td>
                    <td>
                      {c.regularGameTime || <span className="muted">—</span>}
                    </td>
                    {isAdmin && (
                      <td className="row-actions">
                        <Link className="btn sm" to={`/campaigns/${c.id}`}>
                          View
                        </Link>
                        <DiscordAction tip="Posts to Discord">
                          <button
                            className="btn sm"
                            disabled={busyId === c.id}
                            onClick={() => onAnnounce(c)}
                          >
                            Announce
                          </button>
                        </DiscordAction>
                        <button
                          className="btn sm"
                          onClick={() => setEditing(c)}
                        >
                          Edit
                        </button>
                        <button
                          className="btn sm danger"
                          disabled={busyId === c.id}
                          onClick={() => onDelete(c)}
                        >
                          Delete
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

      {creating && (
        <CampaignForm
          title="New campaign"
          games={games.data ?? []}
          onClose={() => setCreating(false)}
          onSubmit={async (body) => {
            await campaignsApi.create(body)
            setCreating(false)
            reload()
          }}
        />
      )}
      {editing && (
        <CampaignForm
          title={`Edit ${editing.title}`}
          games={games.data ?? []}
          initial={editing}
          onClose={() => setEditing(null)}
          onSubmit={async (body) => {
            await campaignsApi.update(editing.id, body)
            setEditing(null)
            reload()
          }}
        />
      )}
    </>
  )
}

interface CampaignFormProps {
  title: string
  games: Game[]
  initial?: Campaign
  onClose: () => void
  onSubmit: (body: CampaignInput) => Promise<void>
}

function CampaignForm({
  title,
  games,
  initial,
  onClose,
  onSubmit
}: CampaignFormProps) {
  const [form, setForm] = useState({
    title: initial?.title ?? '',
    description: initial?.description ?? '',
    regularGameTime: initial?.regularGameTime ?? '',
    gameId: initial?.gameId ?? '',
    schedulingKind: initial?.schedulingKind ?? ('SCHEDULED' as SchedulingKind),
    maxSessions: initial?.maxSessions ?? null,
    recurrenceWeekday: initial?.recurrenceWeekday ?? null,
    recurrenceTime: initial?.recurrenceTime ?? '',
    recurrenceIntervalWeeks: (initial?.recurrenceIntervalWeeks ?? 1) as
      | number
      | null
  })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const numOrNull = (v: string) => (v === '' ? null : Number(v))

  // Picking a game default-fills the scheduling kind and session cap from that
  // game; the user can still override before saving.
  const onGameChange = (gameId: string) => {
    const game = games.find((g) => g.id === gameId)
    setForm((f) => ({
      ...f,
      gameId,
      schedulingKind: game?.defaultSchedulingKind ?? f.schedulingKind,
      maxSessions: game ? game.maxSessions : f.maxSessions
    }))
  }

  const repeating = form.schedulingKind === 'REPEATING'

  const submit = async () => {
    setSaving(true)
    setErr(null)
    try {
      await onSubmit({
        title: form.title,
        description: form.description || null,
        regularGameTime: form.regularGameTime || null,
        gameId: form.gameId || null,
        schedulingKind: form.schedulingKind,
        maxSessions: form.maxSessions,
        recurrenceWeekday: repeating ? form.recurrenceWeekday : null,
        recurrenceTime: repeating ? form.recurrenceTime || null : null,
        recurrenceIntervalWeeks: repeating
          ? (form.recurrenceIntervalWeeks ?? 1)
          : null
      })
    } catch (e) {
      setErr(toMessage(e))
      setSaving(false)
    }
  }

  return (
    <Modal
      title={title}
      onClose={onClose}
      footer={
        <>
          <button className="btn ghost" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <DiscordAction tip="Creates a Discord role + channels">
            <button
              className="btn primary"
              onClick={submit}
              disabled={saving || !form.title.trim()}
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </DiscordAction>
        </>
      }
    >
      {err && <ErrorBanner message={err} />}
      <div className="field">
        <label htmlFor="c-title">Title</label>
        <input
          id="c-title"
          className="input"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
        />
      </div>
      <div className="field-row">
        <div className="field">
          <label htmlFor="c-game">Game</label>
          <select
            id="c-game"
            className="select"
            value={form.gameId}
            onChange={(e) => onGameChange(e.target.value)}
          >
            <option value="">— None —</option>
            {games.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="c-time">Regular game time</label>
          <input
            id="c-time"
            className="input"
            placeholder="e.g. Sundays 6pm"
            value={form.regularGameTime}
            onChange={(e) =>
              setForm({ ...form, regularGameTime: e.target.value })
            }
          />
        </div>
      </div>
      <div className="field">
        <label htmlFor="c-desc">Description</label>
        <textarea
          id="c-desc"
          className="textarea"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
      </div>
      <div className="field-row">
        <div className="field">
          <label htmlFor="c-kind">Scheduling</label>
          <select
            id="c-kind"
            className="select"
            value={form.schedulingKind}
            onChange={(e) =>
              setForm({
                ...form,
                schedulingKind: e.target.value as SchedulingKind
              })
            }
          >
            {SCHEDULING_KINDS.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="c-maxsessions">Max sessions</label>
          <input
            id="c-maxsessions"
            className="input tnum"
            type="number"
            min={0}
            value={form.maxSessions ?? ''}
            onChange={(e) =>
              setForm({ ...form, maxSessions: numOrNull(e.target.value) })
            }
          />
        </div>
      </div>
      {repeating && (
        <div
          className="field-row"
          style={{ gridTemplateColumns: '1fr 1fr 1fr' }}
        >
          <div className="field">
            <label htmlFor="c-weekday">Weekday</label>
            <select
              id="c-weekday"
              className="select"
              value={form.recurrenceWeekday ?? ''}
              onChange={(e) =>
                setForm({
                  ...form,
                  recurrenceWeekday: numOrNull(e.target.value)
                })
              }
            >
              <option value="">— Any —</option>
              {WEEKDAYS.map((w, i) => (
                <option key={w} value={i}>
                  {w}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="c-rectime">Time</label>
            <input
              id="c-rectime"
              className="input"
              type="time"
              value={form.recurrenceTime}
              onChange={(e) =>
                setForm({ ...form, recurrenceTime: e.target.value })
              }
            />
          </div>
          <div className="field">
            <label htmlFor="c-interval">Every N weeks</label>
            <input
              id="c-interval"
              className="input tnum"
              type="number"
              min={1}
              value={form.recurrenceIntervalWeeks ?? 1}
              onChange={(e) =>
                setForm({
                  ...form,
                  recurrenceIntervalWeeks: numOrNull(e.target.value)
                })
              }
            />
          </div>
        </div>
      )}
    </Modal>
  )
}
