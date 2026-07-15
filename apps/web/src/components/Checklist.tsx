import { useState } from 'react'
import { gameDaysApi } from '../api'
import { useAuth } from '../context/AuthContext'
import { toMessage, useAsync } from '../lib/useAsync'
import { useUserNames } from '../lib/useUserNames'
import { Empty, ErrorBanner, Loading, Panel } from './Panel'
import { UserName } from './UserName'

interface Props {
  gameDayId: string
  hasGame: boolean
}

/**
 * The game day's pre-game setup checklist. Any member can check items off or
 * claim them; admins can add/remove items and save the list as the game's
 * default template.
 */
export function Checklist({ gameDayId, hasGame }: Props) {
  const { isAdmin, user } = useAuth()
  const tasks = useAsync(() => gameDaysApi.tasks(gameDayId), [gameDayId])
  const [busyId, setBusyId] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [adding, setAdding] = useState(false)

  const rows = tasks.data ?? []
  const names = useUserNames(
    rows.map((t) => t.assigneeUserId).filter((id): id is string => !!id)
  )
  const done = rows.filter((t) => t.done).length

  const run = async (id: string, fn: () => Promise<unknown>) => {
    setBusyId(id)
    try {
      await fn()
      tasks.reload()
    } catch (err) {
      window.alert(toMessage(err))
    } finally {
      setBusyId(null)
    }
  }

  const add = async () => {
    if (!draft.trim()) return
    setAdding(true)
    try {
      await gameDaysApi.addTask(gameDayId, draft.trim())
      setDraft('')
      tasks.reload()
    } catch (err) {
      window.alert(toMessage(err))
    } finally {
      setAdding(false)
    }
  }

  return (
    <Panel
      title={`Setup checklist${rows.length ? ` (${done}/${rows.length})` : ''}`}
      actions={
        isAdmin && hasGame && rows.length > 0 ? (
          <button
            className="btn sm"
            onClick={() =>
              run('save-default', async () => {
                await gameDaysApi.saveTasksAsDefault(gameDayId)
                window.alert('Saved as this game’s default checklist.')
              })
            }
          >
            Save as game default
          </button>
        ) : undefined
      }
    >
      {tasks.loading ? (
        <Loading />
      ) : tasks.error ? (
        <div className="panel-body padded">
          <ErrorBanner message={tasks.error} />
        </div>
      ) : (
        <div className="panel-body padded stack" style={{ gap: 10 }}>
          {rows.length === 0 ? (
            <Empty label="No setup tasks yet." />
          ) : (
            rows.map((t) => {
              const mine = t.assigneeUserId === user?.id
              return (
                <div
                  key={t.id}
                  className="row"
                  style={{ gap: 10, alignItems: 'center' }}
                >
                  <input
                    type="checkbox"
                    checked={!!t.done}
                    disabled={busyId === t.id}
                    onChange={(e) =>
                      run(t.id, () =>
                        gameDaysApi.updateTask(gameDayId, t.id, {
                          done: e.target.checked
                        })
                      )
                    }
                  />
                  <span
                    style={{
                      textDecoration: t.done ? 'line-through' : 'none',
                      opacity: t.done ? 0.6 : 1,
                      flex: 1
                    }}
                  >
                    {t.label}
                  </span>
                  {t.assigneeUserId ? (
                    <UserName
                      id={t.assigneeUserId}
                      user={names.get(t.assigneeUserId)}
                    />
                  ) : (
                    <button
                      className="btn sm"
                      disabled={busyId === t.id}
                      onClick={() =>
                        run(t.id, () =>
                          gameDaysApi.updateTask(gameDayId, t.id, {
                            assigneeUserId: user?.id ?? null
                          })
                        )
                      }
                    >
                      Claim
                    </button>
                  )}
                  {mine && (
                    <button
                      className="btn sm ghost"
                      disabled={busyId === t.id}
                      onClick={() =>
                        run(t.id, () =>
                          gameDaysApi.updateTask(gameDayId, t.id, {
                            assigneeUserId: null
                          })
                        )
                      }
                    >
                      Unclaim
                    </button>
                  )}
                  {isAdmin && (
                    <button
                      className="btn sm danger"
                      disabled={busyId === t.id}
                      onClick={() =>
                        run(t.id, () => gameDaysApi.deleteTask(gameDayId, t.id))
                      }
                    >
                      ✕
                    </button>
                  )}
                </div>
              )
            })
          )}
          {isAdmin && (
            <div className="row" style={{ gap: 8 }}>
              <input
                className="input"
                placeholder="Add a setup task…"
                value={draft}
                disabled={adding}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && add()}
              />
              <button
                className="btn sm primary"
                disabled={adding || !draft.trim()}
                onClick={add}
              >
                Add
              </button>
            </div>
          )}
        </div>
      )}
    </Panel>
  )
}
