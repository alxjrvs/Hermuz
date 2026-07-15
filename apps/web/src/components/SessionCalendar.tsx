import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
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

function firstOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}

// Self-contained month grid of a campaign's sessions — a compact reuse of the
// Calendar page's visual style, driven by a passed-in list rather than its own
// fetch. Starts on the month of the earliest session (or today if none).
export function SessionCalendar({ sessions }: { sessions: GameDay[] }) {
  const initial = useMemo(() => {
    const dated = sessions
      .map((s) => new Date(s.dateTime))
      .filter((d) => !Number.isNaN(d.getTime()))
      .sort((a, b) => a.getTime() - b.getTime())
    return firstOfMonth(dated[0] ?? new Date())
  }, [sessions])

  const [cursor, setCursor] = useState(initial)

  const byDay = useMemo(() => {
    const map = new Map<string, GameDay[]>()
    for (const gd of sessions) {
      const d = new Date(gd.dateTime)
      if (Number.isNaN(d.getTime())) continue
      const key = ymd(d)
      const arr = map.get(key) ?? []
      arr.push(gd)
      map.set(key, arr)
    }
    return map
  }, [sessions])

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
    <div className="cal">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <div className="cell-strong">{monthLabel}</div>
        <div className="row" style={{ gap: 8 }}>
          <button className="btn ghost sm" onClick={() => step(-1)}>
            ‹ Prev
          </button>
          <button
            className="btn ghost sm"
            onClick={() => setCursor(firstOfMonth(new Date()))}
          >
            Today
          </button>
          <button className="btn ghost sm" onClick={() => step(1)}>
            Next ›
          </button>
        </div>
      </div>
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
                      {gd.sessionNumber != null ? `#${gd.sessionNumber}` : ''}
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
  )
}
