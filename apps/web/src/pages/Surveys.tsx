import { useState } from 'react'
import { gamesApi, surveysApi } from '../api'
import { type DateSlot, MultiDatePicker } from '../components/MultiDatePicker'
import { Empty, ErrorBanner, Loading, Panel } from '../components/Panel'
import { UserName } from '../components/UserName'
import { useAuth } from '../context/AuthContext'
import { formatDateTime, fromDateTimeLocal } from '../lib/format'
import { toMessage, useAsync } from '../lib/useAsync'
import { useUserNames } from '../lib/useUserNames'
import type { ResolvedUser, Survey } from '../types'

const MAX_DATES = 10

const STATUS_CHIP: Record<Survey['status'], string> = {
  OPEN: 'accent',
  CANONIZED: 'good',
  CANCELLED: 'muted'
}

export function Surveys() {
  const { isAdmin } = useAuth()
  const { data, loading, error, reload } = useAsync(() => surveysApi.list(), [])
  const games = useAsync(() => gamesApi.list(), [])
  const [creating, setCreating] = useState(false)
  const [busy, setBusy] = useState(false)

  const surveys = data ?? []
  const names = useUserNames(
    surveys.flatMap((s) => s.responses.map((r) => r.userId))
  )

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true)
    try {
      await fn()
      reload()
    } catch (err) {
      window.alert(toMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Surveys</h1>
          <p>
            Poll candidate dates for a new game day, then schedule the winner.
          </p>
        </div>
        {isAdmin && (
          <button
            className="btn primary"
            onClick={() => setCreating((v) => !v)}
          >
            {creating ? 'Close' : '+ New survey'}
          </button>
        )}
      </div>

      {isAdmin && creating && (
        <CreateSurvey
          games={games.data ?? []}
          busy={busy}
          onCreate={(input) =>
            run(async () => {
              await surveysApi.create(input)
              setCreating(false)
            })
          }
        />
      )}

      <Panel title="All surveys">
        {loading ? (
          <Loading />
        ) : error ? (
          <div className="panel-body padded">
            <ErrorBanner message={error} />
          </div>
        ) : surveys.length === 0 ? (
          <Empty label="No surveys yet." />
        ) : (
          <div className="panel-body padded stack" style={{ gap: 20 }}>
            {surveys.map((s) => (
              <SurveyCard
                key={s.id}
                survey={s}
                busy={busy}
                names={names}
                onRun={run}
              />
            ))}
          </div>
        )}
      </Panel>
    </>
  )
}

function CreateSurvey({
  games,
  busy,
  onCreate
}: {
  games: { id: string; name: string }[]
  busy: boolean
  onCreate: (input: {
    gameId: string
    title?: string | null
    dateTimes: string[]
  }) => void
}) {
  const [gameId, setGameId] = useState('')
  const [title, setTitle] = useState('')
  const [slots, setSlots] = useState<DateSlot[]>([])

  const submit = () => {
    const dateTimes = slots
      .filter((s) => s.date && s.time)
      .map((s) => fromDateTimeLocal(`${s.date}T${s.time}`))
    if (!gameId) return window.alert('Pick a game.')
    if (dateTimes.length === 0) return window.alert('Pick at least one date.')
    onCreate({ gameId, title: title.trim() || null, dateTimes })
  }

  return (
    <Panel title="New survey">
      <div className="panel-body padded stack" style={{ gap: 12 }}>
        <div className="field">
          <label htmlFor="sv-game">Game</label>
          <select
            id="sv-game"
            className="select"
            value={gameId}
            onChange={(e) => setGameId(e.target.value)}
          >
            <option value="">Select a game…</option>
            {games.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="sv-title">Title (optional)</label>
          <input
            id="sv-title"
            className="input"
            placeholder="e.g. August one-shot"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
        <div className="field">
          <span className="field-label">
            Candidate dates (up to {MAX_DATES})
          </span>
          <MultiDatePicker slots={slots} onChange={setSlots} max={MAX_DATES} />
        </div>
        <div className="row">
          <button className="btn primary" disabled={busy} onClick={submit}>
            Create survey
          </button>
        </div>
      </div>
    </Panel>
  )
}

function SurveyCard({
  survey,
  busy,
  names,
  onRun
}: {
  survey: Survey
  busy: boolean
  names: Map<string, ResolvedUser>
  onRun: (fn: () => Promise<unknown>) => Promise<void>
}) {
  const { isAdmin, user } = useAuth()
  const open = survey.status === 'OPEN'

  const mineAvailable = new Set(
    survey.responses
      .filter((r) => r.userId === user?.id && r.available)
      .map((r) => r.surveyDateId)
  )
  const [selected, setSelected] = useState<Set<string>>(mineAvailable)

  const toggle = (dateId: string) =>
    setSelected((s) => {
      const next = new Set(s)
      if (next.has(dateId)) next.delete(dateId)
      else next.add(dateId)
      return next
    })

  const availableFor = (dateId: string) =>
    survey.responses.filter((r) => r.surveyDateId === dateId && r.available)

  const label =
    survey.title?.trim() || `Planning a ${survey.gameName ?? 'game'} day`

  return (
    <div className="stack" style={{ gap: 10 }}>
      <div className="row" style={{ gap: 10, alignItems: 'center' }}>
        <strong>{label}</strong>
        {survey.gameName && <span className="muted">· {survey.gameName}</span>}
        <span
          className={`chip ${STATUS_CHIP[survey.status]}`}
          style={{ marginLeft: 'auto' }}
        >
          {survey.status.toLowerCase()}
        </span>
        {isAdmin && open && (
          <button
            className="btn sm danger"
            disabled={busy}
            onClick={() =>
              window.confirm('Cancel this survey?') &&
              onRun(() => surveysApi.cancel(survey.id))
            }
          >
            Cancel
          </button>
        )}
      </div>

      <div className="table-wrap">
        <table className="data">
          <thead>
            <tr>
              {open && <th style={{ width: 40 }}>Me</th>}
              <th>Date</th>
              <th className="tnum">Available</th>
              <th>Who</th>
              {isAdmin && open && <th />}
            </tr>
          </thead>
          <tbody>
            {survey.dates.map((d) => {
              const avail = availableFor(d.id)
              const won = survey.canonizedSurveyDateId === d.id
              return (
                <tr key={d.id}>
                  {open && (
                    <td>
                      <input
                        type="checkbox"
                        checked={selected.has(d.id)}
                        onChange={() => toggle(d.id)}
                      />
                    </td>
                  )}
                  <td className="cell-strong">
                    {won ? '⭐ ' : ''}
                    {formatDateTime(d.dateTime)}
                  </td>
                  <td className="tnum">{avail.length}</td>
                  <td>
                    <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
                      {avail.length ? (
                        avail.map((r) => (
                          <span key={r.id} className="chip good">
                            <UserName
                              id={r.userId}
                              user={names.get(r.userId)}
                            />
                          </span>
                        ))
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </div>
                  </td>
                  {isAdmin && open && (
                    <td className="row-actions">
                      <button
                        className="btn sm primary"
                        disabled={busy}
                        onClick={() =>
                          window.confirm(
                            `Schedule ${formatDateTime(d.dateTime)} as a game day? The ${avail.length} available player(s) will be added.`
                          ) && onRun(() => surveysApi.canonize(survey.id, d.id))
                        }
                      >
                        Schedule this
                      </button>
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {open && (
        <div className="row">
          <button
            className="btn sm primary"
            disabled={busy}
            onClick={() =>
              onRun(() => surveysApi.respond(survey.id, [...selected]))
            }
          >
            Save my availability
          </button>
          <span className="muted" style={{ fontSize: 12 }}>
            Check every date you can make, then save.
          </span>
        </div>
      )}
    </div>
  )
}
