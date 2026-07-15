import { useState } from 'react'
import { gamesApi } from '../api'
import { DiscordAction, DiscordLegend } from '../components/DiscordAction'
import { Modal } from '../components/Modal'
import { Empty, ErrorBanner, Loading, Panel } from '../components/Panel'
import { LocationTypeChip } from '../components/StatusChip'
import { TaskTemplateEditor } from '../components/TaskTemplateEditor'
import { useAuth } from '../context/AuthContext'
import { toMessage, useAsync } from '../lib/useAsync'
import type { Game, GameInput, LocationType, SchedulingKind } from '../types'

const SCHEDULING_KINDS: SchedulingKind[] = ['SCHEDULED', 'REPEATING']
const LOCATION_TYPES: LocationType[] = ['IN_PERSON', 'VIRTUAL']

const EMPTY_FORM: GameInput = {
  name: '',
  shortName: '',
  description: '',
  discordRoleId: '',
  minPlayers: null,
  maxPlayers: null,
  defaultSchedulingKind: 'SCHEDULED',
  maxSessions: null,
  defaultLocationType: 'IN_PERSON'
}

export function Games() {
  const { isAdmin } = useAuth()
  const { data, loading, error, reload } = useAsync(() => gamesApi.list(), [])
  const [editing, setEditing] = useState<Game | null>(null)
  const [creating, setCreating] = useState(false)
  const [tasksFor, setTasksFor] = useState<Game | null>(null)

  const games = data ?? []

  const onDelete = async (game: Game) => {
    if (!window.confirm(`Delete "${game.name}"? This cannot be undone.`)) return
    try {
      await gamesApi.remove(game.id)
      reload()
    } catch (err) {
      window.alert(toMessage(err))
    }
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Games</h1>
          <p>Systems the group runs.</p>
        </div>
        {isAdmin && (
          <button className="btn primary" onClick={() => setCreating(true)}>
            + New game
          </button>
        )}
      </div>

      {isAdmin && <DiscordLegend />}

      <Panel title="All games">
        {loading ? (
          <Loading />
        ) : error ? (
          <div className="panel-body padded">
            <ErrorBanner message={error} />
          </div>
        ) : games.length === 0 ? (
          <Empty label="No games defined yet." />
        ) : (
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Short</th>
                  <th>Players</th>
                  <th>Default type</th>
                  <th>Description</th>
                  {isAdmin && <th />}
                </tr>
              </thead>
              <tbody>
                {games.map((g) => (
                  <tr key={g.id}>
                    <td className="cell-strong">{g.name}</td>
                    <td className="tnum">{g.shortName}</td>
                    <td className="tnum">
                      {g.minPlayers ?? '—'}–{g.maxPlayers ?? '—'}
                    </td>
                    <td>
                      <LocationTypeChip type={g.defaultLocationType} />
                    </td>
                    <td className="cell-sub">
                      {g.description || <span className="muted">—</span>}
                    </td>
                    {isAdmin && (
                      <td className="row-actions">
                        <button
                          className="btn sm"
                          onClick={() => setEditing(g)}
                        >
                          Edit
                        </button>
                        <button
                          className="btn sm"
                          onClick={() => setTasksFor(g)}
                        >
                          Tasks
                        </button>
                        <button
                          className="btn sm danger"
                          onClick={() => onDelete(g)}
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
        <GameForm
          title="New game"
          initial={EMPTY_FORM}
          onClose={() => setCreating(false)}
          onSubmit={async (body) => {
            await gamesApi.create(body)
            setCreating(false)
            reload()
          }}
        />
      )}
      {editing && (
        <GameForm
          title={`Edit ${editing.name}`}
          initial={editing}
          onClose={() => setEditing(null)}
          onSubmit={async (body) => {
            await gamesApi.update(editing.id, body)
            setEditing(null)
            reload()
          }}
        />
      )}
      {tasksFor && (
        <TaskTemplateEditor
          gameId={tasksFor.id}
          gameName={tasksFor.name}
          onClose={() => setTasksFor(null)}
        />
      )}
    </>
  )
}

interface GameFormProps {
  title: string
  initial: GameInput | Game
  onClose: () => void
  onSubmit: (body: GameInput) => Promise<void>
}

function GameForm({ title, initial, onClose, onSubmit }: GameFormProps) {
  const [form, setForm] = useState<GameInput>({
    name: initial.name,
    shortName: initial.shortName,
    description: initial.description ?? '',
    discordRoleId: initial.discordRoleId ?? '',
    minPlayers: initial.minPlayers ?? null,
    maxPlayers: initial.maxPlayers ?? null,
    defaultSchedulingKind: initial.defaultSchedulingKind ?? 'SCHEDULED',
    maxSessions: initial.maxSessions ?? null,
    defaultLocationType: initial.defaultLocationType ?? 'IN_PERSON'
  })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const submit = async () => {
    setSaving(true)
    setErr(null)
    try {
      await onSubmit({
        ...form,
        description: form.description || null,
        discordRoleId: form.discordRoleId || null
      })
    } catch (e) {
      setErr(toMessage(e))
      setSaving(false)
    }
  }

  const numOrNull = (v: string) => (v === '' ? null : Number(v))

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
              disabled={saving || !form.name.trim() || !form.shortName.trim()}
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </DiscordAction>
        </>
      }
    >
      {err && <ErrorBanner message={err} />}
      <div className="field">
        <label htmlFor="g-name">Name</label>
        <input
          id="g-name"
          className="input"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
      </div>
      <div className="field">
        <label htmlFor="g-short">Short name</label>
        <input
          id="g-short"
          className="input"
          value={form.shortName}
          onChange={(e) => setForm({ ...form, shortName: e.target.value })}
        />
      </div>
      <div className="field">
        <label htmlFor="g-desc">Description</label>
        <textarea
          id="g-desc"
          className="textarea"
          value={form.description ?? ''}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
      </div>
      <div className="field-row">
        <div className="field">
          <label htmlFor="g-min">Min players</label>
          <input
            id="g-min"
            className="input tnum"
            type="number"
            min={0}
            value={form.minPlayers ?? ''}
            onChange={(e) =>
              setForm({ ...form, minPlayers: numOrNull(e.target.value) })
            }
          />
        </div>
        <div className="field">
          <label htmlFor="g-max">Max players</label>
          <input
            id="g-max"
            className="input tnum"
            type="number"
            min={0}
            value={form.maxPlayers ?? ''}
            onChange={(e) =>
              setForm({ ...form, maxPlayers: numOrNull(e.target.value) })
            }
          />
        </div>
      </div>
      <div className="field-row">
        <div className="field">
          <label htmlFor="g-kind">Default scheduling</label>
          <select
            id="g-kind"
            className="select"
            value={form.defaultSchedulingKind}
            onChange={(e) =>
              setForm({
                ...form,
                defaultSchedulingKind: e.target.value as SchedulingKind
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
          <label htmlFor="g-maxsessions">Max sessions</label>
          <input
            id="g-maxsessions"
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
      <div className="field">
        <label htmlFor="g-loctype">Default location type</label>
        <select
          id="g-loctype"
          className="select"
          value={form.defaultLocationType}
          onChange={(e) =>
            setForm({
              ...form,
              defaultLocationType: e.target.value as LocationType
            })
          }
        >
          {LOCATION_TYPES.map((t) => (
            <option key={t} value={t}>
              {t === 'VIRTUAL' ? 'Virtual' : 'In Person'}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor="g-role">Discord role ID</label>
        <input
          id="g-role"
          className="input tnum"
          value={form.discordRoleId ?? ''}
          onChange={(e) => setForm({ ...form, discordRoleId: e.target.value })}
        />
      </div>
    </Modal>
  )
}
