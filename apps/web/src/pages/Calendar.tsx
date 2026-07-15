import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { gameDaysApi } from '../api'
import { ErrorBanner, Loading, Panel } from '../components/Panel'
import { useAsync } from '../lib/useAsync'
import type { GameDay, GameDayStatus } from '../types'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const STATUS_TONE: Record<GameDayStatus, string> = {
  CLOSED: 'good',
  SCHEDULING: 'warn',
  CANCELLED: 'danger'
}

function ymd(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function firstOfThisMonth(): Date {
  const n = new Date()
  return new Date(n.getFullYear(), n.getMonth(), 1)
}

/**
 * Month calendar of game days — the view Discord can't do well. Each day cell
 * shows its sessions colored by status and links straight to the detail page.
 */
export function Calendar() {
  const { data, loading, error } = useAsync(() => gameDaysApi.list(), [])
  const [cursor, setCursor] = useState(firstOfThisMonth)

  const byDay = useMemo(() => {
    const map = new Map<string, GameDay[]>()
    for (const gd of data ?? []) {
      const d = new Date(gd.dateTime)
      if (Number.isNaN(d.getTime())) continue
      const key = ymd(d)
      const arr = map.get(key) ?? []
      arr.push(gd)
      map.set(key, arr)
    }
    return map
  }, [data])

  const cells = useMemo(() => {
    const year = cursor.getFullYear()
    const month = cursor.getMonth()
    const startOffset = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const total = Math.ceil((startOffset + daysInMonth) / 7) * 7
    const start = new Date(year, month, 1 - startOffset)
    return Array.from(
      { length: total },
      (_, i) =>
        new Date(start.getFullYear(), start.getMonth(), start.getDate() + i)
    )
  }, [cursor])

  const todayKey = ymd(new Date())
  const monthLabel = cursor.toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric'
  })

  const step = (delta: number) =>
    setCursor((c) => new Date(c.getFullYear(), c.getMonth() + delta, 1))

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Calendar</h1>
          <p>Every game day at a glance.</p>
        </div>
      </div>

      <Panel
        title={monthLabel}
        actions={
          <div className="row" style={{ gap: 8 }}>
            <button className="btn ghost sm" onClick={() => step(-1)}>
              ‹ Prev
            </button>
            <button
              className="btn ghost sm"
              onClick={() => setCursor(firstOfThisMonth())}
            >
              Today
            </button>
            <button className="btn ghost sm" onClick={() => step(1)}>
              Next ›
            </button>
          </div>
        }
        padded
      >
        {loading && <Loading />}
        {error && <ErrorBanner message={error} />}
        {!loading && !error && (
          <div className="cal">
            <div className="cal-weekdays">
              {WEEKDAYS.map((w) => (
                <div key={w} className="cal-weekday">
                  {w}
                </div>
              ))}
            </div>
            <div className="cal-grid">
              {cells.map((d) => {
                const key = ymd(d)
                const inMonth = d.getMonth() === cursor.getMonth()
                const events = (byDay.get(key) ?? [])
                  .slice()
                  .sort((a, b) => a.dateTime.localeCompare(b.dateTime))
                return (
                  <div
                    key={key}
                    className={`cal-cell${inMonth ? '' : ' out'}${
                      key === todayKey ? ' today' : ''
                    }`}
                  >
                    <div className="cal-daynum">{d.getDate()}</div>
                    <div className="cal-events">
                      {events.map((gd) => (
                        <Link
                          key={gd.id}
                          to={`/game-days/${gd.id}`}
                          className={`cal-event ${STATUS_TONE[gd.status] ?? 'muted'}`}
                          title={`${gd.title} — ${gd.status}`}
                        >
                          <span className="cal-event-time">
                            {new Date(gd.dateTime).toLocaleTimeString(
                              undefined,
                              {
                                hour: 'numeric',
                                minute: '2-digit'
                              }
                            )}
                          </span>
                          <span className="cal-event-title">{gd.title}</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </Panel>
    </>
  )
}
