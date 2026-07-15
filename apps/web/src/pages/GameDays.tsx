import { useState } from 'react'
import { Link } from 'react-router-dom'
import { gameDaysApi, gamesApi } from '../api'
import { DiscordAction, DiscordLegend } from '../components/DiscordAction'
import { Modal } from '../components/Modal'
import { Empty, ErrorBanner, Loading, Panel } from '../components/Panel'
import { GameDayStatusChip, LocationTypeChip } from '../components/StatusChip'
import { useAuth } from '../context/AuthContext'
import {
  formatDateTime,
  fromDateTimeLocal,
  toDateTimeLocal
} from '../lib/format'
import { toMessage, useAsync } from '../lib/useAsync'
import type { Game, GameDay, GameDayInput, LocationType } from '../types'

export function GameDays() {
  const { isAdmin } = useAuth()
  const { data, loading, error, reload } = useAsync(
    () => gameDaysApi.list(),
    []
  )
  const games = useAsync(() => gamesApi.list(), [])
  const [editing, setEditing] = useState<GameDay | null>(null)
  const [creating, setCreating] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)

  const gameDays = (data ?? [])
    .slice()
    .sort((a, b) => b.dateTime.localeCompare(a.dateTime))

  const act = async (id: string, fn: () => Promise<unknown>) => {
    setBusyId(id)
    try {
      await fn()
      reload()
    } catch (err) {
      window.alert(toMessage(err))
    } finally {
      setBusyId(null)
    }
  }

  const gameName = (id: string | null) =>
    games.data?.find((g) => g.id === id)?.name ?? null

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Game Days</h1>
          <p>One-off sessions and their scheduling status.</p>
        </div>
        {isAdmin && (
          <button className="btn primary" onClick={() => setCreating(true)}>
            + Schedule game day
          </button>
        )}
      </div>

      {isAdmin && <DiscordLegend />}

      <Panel title="All game days">
        {loading ? (
          <Loading />
        ) : error ? (
          <div className="panel-body padded">
            <ErrorBanner message={error} />
          </div>
        ) : gameDays.length === 0 ? (
          <Empty label="No game days yet." />
        ) : (
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>When</th>
                  <th>Game</th>
                  <th>Type</th>
                  <th>Location</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {gameDays.map((gd) => (
                  <tr key={gd.id}>
                    <td className="cell-strong">
                      <Link to={`/game-days/${gd.id}`}>{gd.title}</Link>
                    </td>
                    <td className="tnum">{formatDateTime(gd.dateTime)}</td>
                    <td>
                      {gameName(gd.gameId) || <span className="muted">—</span>}
                    </td>
                    <td>
                      <LocationTypeChip type={gd.locationType} />
                    </td>
                    <td>{gd.location || <span className="muted">—</span>}</td>
                    <td>
                      <GameDayStatusChip status={gd.status} />
                    </td>
                    <td className="row-actions">
                      <Link className="btn sm" to={`/game-days/${gd.id}`}>
                        View
                      </Link>
                      {isAdmin && gd.status !== 'CANCELLED' && (
                        <>
                          <DiscordAction tip="Posts to Discord">
                            <button
                              className="btn sm"
                              disabled={busyId === gd.id}
                              onClick={() =>
                                act(gd.id, () => gameDaysApi.announce(gd.id))
                              }
                            >
                              Announce
                            </button>
                          </DiscordAction>
                          <button
                            className="btn sm"
                            onClick={() => setEditing(gd)}
                          >
                            Edit
                          </button>
                          <DiscordAction tip="Deletes Discord channels + event">
                            <button
                              className="btn sm danger"
                              disabled={busyId === gd.id}
                              onClick={() => {
                                if (
                                  window.confirm(
                                    `Cancel "${gd.title}"? Attendees will be notified.`
                                  )
                                )
                                  act(gd.id, () => gameDaysApi.cancel(gd.id))
                              }}
                            >
                              Cancel
                            </button>
                          </DiscordAction>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {creating && (
        <GameDayForm
          title="Schedule game day"
          games={games.data ?? []}
          onClose={() => setCreating(false)}
          onSubmit={async (body) => {
            await gameDaysApi.create(body)
            setCreating(false)
            reload()
          }}
        />
      )}
      {editing && (
        <GameDayForm
          title={`Edit ${editing.title}`}
          games={games.data ?? []}
          initial={editing}
          onClose={() => setEditing(null)}
          onSubmit={async (body) => {
            await gameDaysApi.update(editing.id, body)
            setEditing(null)
            reload()
          }}
        />
      )}
    </>
  )
}

interface GameDayFormProps {
  title: string
  games: Game[]
  initial?: GameDay
  onClose: () => void
  onSubmit: (body: GameDayInput) => Promise<void>
}

function GameDayForm({
  title,
  games,
  initial,
  onClose,
  onSubmit
}: GameDayFormProps) {
  const [form, setForm] = useState({
    title: initial?.title ?? '',
    dateTimeLocal: toDateTimeLocal(initial?.dateTime),
    description: initial?.description ?? '',
    location: initial?.location ?? '',
    gameId: initial?.gameId ?? '',
    // '' = inherit from the game's default.
    locationType: (initial?.locationType ?? '') as LocationType | ''
  })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const submit = async () => {
    setSaving(true)
    setErr(null)
    try {
      await onSubmit({
        title: form.title,
        dateTime: fromDateTimeLocal(form.dateTimeLocal),
        description: form.description || null,
        location: form.location || null,
        locationType: form.locationType || null,
        gameId: form.gameId || null
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
          <DiscordAction tip="Creates a Discord event + channel">
            <button
              className="btn primary"
              onClick={submit}
              disabled={saving || !form.title.trim() || !form.dateTimeLocal}
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </DiscordAction>
        </>
      }
    >
      {err && <ErrorBanner message={err} />}
      <div className="field">
        <label htmlFor="gd-title">Title</label>
        <input
          id="gd-title"
          className="input"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
        />
      </div>
      <div className="field-row">
        <div className="field">
          <label htmlFor="gd-when">Date &amp; time</label>
          <input
            id="gd-when"
            className="input"
            type="datetime-local"
            value={form.dateTimeLocal}
            onChange={(e) =>
              setForm({ ...form, dateTimeLocal: e.target.value })
            }
          />
        </div>
        <div className="field">
          <label htmlFor="gd-game">Game</label>
          <select
            id="gd-game"
            className="select"
            value={form.gameId}
            onChange={(e) => setForm({ ...form, gameId: e.target.value })}
          >
            <option value="">— None —</option>
            {games.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="field-row">
        <div className="field">
          <label htmlFor="gd-loctype">Type</label>
          <select
            id="gd-loctype"
            className="select"
            value={form.locationType}
            onChange={(e) =>
              setForm({
                ...form,
                locationType: e.target.value as LocationType | ''
              })
            }
          >
            <option value="">Inherit from game</option>
            <option value="IN_PERSON">In Person</option>
            <option value="VIRTUAL">Virtual</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="gd-loc">
            {form.locationType === 'VIRTUAL' ? 'Join link' : 'Location'}
          </label>
          <input
            id="gd-loc"
            className="input"
            value={form.location}
            onChange={(e) => setForm({ ...form, location: e.target.value })}
          />
        </div>
      </div>
      <div className="field">
        <label htmlFor="gd-desc">Description</label>
        <textarea
          id="gd-desc"
          className="textarea"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
      </div>
    </Modal>
  )
}
