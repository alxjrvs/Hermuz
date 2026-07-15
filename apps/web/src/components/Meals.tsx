import { useState } from 'react'
import { gameDaysApi } from '../api'
import { useAuth } from '../context/AuthContext'
import { toMessage, useAsync } from '../lib/useAsync'
import { useUserNames } from '../lib/useUserNames'
import type { Meal, MealKind, ResolvedUser } from '../types'
import { Empty, ErrorBanner, Loading, Panel } from './Panel'
import { UserName } from './UserName'

const KINDS: MealKind[] = ['LUNCH', 'DINNER']
const kindLabel = (k: MealKind) => (k === 'LUNCH' ? '🥪 Lunch' : '🍽️ Dinner')

interface Props {
  gameDayId: string
}

/**
 * Meal coordination for a game day: admins open lunch/dinner slots, every member
 * marks themselves in/out (with an optional note), and the counts roll up here.
 */
export function Meals({ gameDayId }: Props) {
  const { isAdmin } = useAuth()
  const meals = useAsync(() => gameDaysApi.meals(gameDayId), [gameDayId])
  const [busy, setBusy] = useState(false)
  const [newKind, setNewKind] = useState<MealKind>('DINNER')
  const [newPlan, setNewPlan] = useState('')

  const rows = meals.data ?? []
  const allUserIds = rows.flatMap((m) => m.responses.map((r) => r.userId))
  const names = useUserNames(allUserIds)

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true)
    try {
      await fn()
      meals.reload()
    } catch (err) {
      window.alert(toMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Panel
      title="Meals"
      actions={
        isAdmin ? (
          <div className="row" style={{ gap: 6 }}>
            <select
              className="select"
              style={{ maxWidth: 130 }}
              value={newKind}
              onChange={(e) => setNewKind(e.target.value as MealKind)}
            >
              {KINDS.map((k) => (
                <option key={k} value={k}>
                  {k === 'LUNCH' ? 'Lunch' : 'Dinner'}
                </option>
              ))}
            </select>
            <input
              className="input"
              style={{ maxWidth: 160 }}
              placeholder="Plan (optional)"
              value={newPlan}
              onChange={(e) => setNewPlan(e.target.value)}
            />
            <button
              className="btn sm primary"
              disabled={busy}
              onClick={() =>
                run(async () => {
                  await gameDaysApi.addMeal(
                    gameDayId,
                    newKind,
                    newPlan.trim() || null
                  )
                  setNewPlan('')
                })
              }
            >
              Open meal
            </button>
          </div>
        ) : undefined
      }
    >
      {meals.loading ? (
        <Loading />
      ) : meals.error ? (
        <div className="panel-body padded">
          <ErrorBanner message={meals.error} />
        </div>
      ) : rows.length === 0 ? (
        <Empty label="No meals set up for this game day." />
      ) : (
        <div className="panel-body padded stack" style={{ gap: 16 }}>
          {rows.map((m) => (
            <MealCard
              key={m.id}
              meal={m}
              gameDayId={gameDayId}
              busy={busy}
              names={names}
              onRun={run}
            />
          ))}
        </div>
      )}
    </Panel>
  )
}

function MealCard({
  meal,
  gameDayId,
  busy,
  names,
  onRun
}: {
  meal: Meal
  gameDayId: string
  busy: boolean
  names: Map<string, ResolvedUser>
  onRun: (fn: () => Promise<unknown>) => Promise<void>
}) {
  const { isAdmin, user } = useAuth()
  const [note, setNote] = useState('')
  const inList = meal.responses.filter((r) => r.attending)
  const out = meal.responses.filter((r) => !r.attending)
  const mine = meal.responses.find((r) => r.userId === user?.id)
  const closed = meal.status === 'CLOSED'

  const respond = (attending: boolean) =>
    onRun(() =>
      gameDaysApi.respondMeal(
        gameDayId,
        meal.id,
        attending,
        note.trim() || null
      )
    )

  return (
    <div className="stack" style={{ gap: 8 }}>
      <div className="row" style={{ gap: 10, alignItems: 'center' }}>
        <strong>{kindLabel(meal.kind)}</strong>
        {meal.plan && <span className="muted">— {meal.plan}</span>}
        {closed && <span className="chip muted">closed</span>}
        <span className="muted" style={{ marginLeft: 'auto' }}>
          {inList.length} in · {out.length} out
        </span>
        {isAdmin && !closed && (
          <button
            className="btn sm"
            disabled={busy}
            onClick={() =>
              onRun(() => gameDaysApi.closeMeal(gameDayId, meal.id))
            }
          >
            Close
          </button>
        )}
      </div>

      {inList.length > 0 && (
        <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
          {inList.map((r) => (
            <span key={r.id} className="chip good">
              <UserName id={r.userId} user={names.get(r.userId)} />
              {r.note ? ` · ${r.note}` : ''}
            </span>
          ))}
        </div>
      )}

      {!closed && (
        <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
          <input
            className="input"
            style={{ maxWidth: 200 }}
            placeholder={mine?.note ?? 'What are you having? (optional)'}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <button
            className={`btn sm ${mine?.attending ? 'primary' : ''}`}
            disabled={busy}
            onClick={() => respond(true)}
          >
            ✅ I'm in
          </button>
          <button
            className={`btn sm ${mine && !mine.attending ? 'primary' : ''}`}
            disabled={busy}
            onClick={() => respond(false)}
          >
            🚫 Out
          </button>
        </div>
      )}
    </div>
  )
}
