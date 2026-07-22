import { useState } from 'react'

export interface DateSlot {
  /** Local calendar day, YYYY-MM-DD. */
  date: string
  /** Local time, HH:MM. */
  time: string
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function ymd(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function firstOfThisMonth(): Date {
  const n = new Date()
  return new Date(n.getFullYear(), n.getMonth(), 1)
}

function dayLabel(date: string, time: string): string {
  return new Date(`${date}T${time || '00:00'}`).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  })
}

interface Props {
  slots: DateSlot[]
  onChange: (slots: DateSlot[]) => void
  max?: number
}

/**
 * Pick several candidate dates at once: click days on a month calendar to
 * toggle them, set a default time for new picks, and fine-tune each pick's time
 * below. Past days are disabled; selection is capped at `max`.
 */
export function MultiDatePicker({ slots, onChange, max = 10 }: Props) {
  const [cursor, setCursor] = useState(firstOfThisMonth)
  const [defaultTime, setDefaultTime] = useState('19:00')

  const picked = new Map(slots.map((s) => [s.date, s.time]))
  const todayKey = ymd(new Date())

  const year = cursor.getFullYear()
  const month = cursor.getMonth()
  const startOffset = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const total = Math.ceil((startOffset + daysInMonth) / 7) * 7
  const start = new Date(year, month, 1 - startOffset)
  const cells = Array.from(
    { length: total },
    (_, i) =>
      new Date(start.getFullYear(), start.getMonth(), start.getDate() + i)
  )

  const monthLabel = cursor.toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric'
  })
  const step = (delta: number) =>
    setCursor((c) => new Date(c.getFullYear(), c.getMonth() + delta, 1))

  const emit = (map: Map<string, string>) =>
    onChange(
      [...map.entries()]
        .map(([date, time]) => ({ date, time }))
        .sort((a, b) =>
          `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`)
        )
    )

  const toggle = (key: string) => {
    const next = new Map(picked)
    if (next.has(key)) next.delete(key)
    else if (next.size < max) next.set(key, defaultTime)
    emit(next)
  }
  const setTime = (key: string, time: string) => {
    const next = new Map(picked)
    if (next.has(key)) next.set(key, time)
    emit(next)
  }
  const remove = (key: string) => {
    const next = new Map(picked)
    next.delete(key)
    emit(next)
  }

  const sorted = [...picked.entries()].sort((a, b) => a[0].localeCompare(b[0]))

  return (
    <div className="datepick">
      <div
        className="row"
        style={{ justifyContent: 'space-between', marginBottom: 8 }}
      >
        <strong style={{ fontSize: 14 }}>{monthLabel}</strong>
        <div className="row" style={{ gap: 6 }}>
          <button
            type="button"
            className="btn ghost sm"
            onClick={() => step(-1)}
          >
            ‹
          </button>
          <button
            type="button"
            className="btn ghost sm"
            onClick={() => setCursor(firstOfThisMonth())}
          >
            Today
          </button>
          <button
            type="button"
            className="btn ghost sm"
            onClick={() => step(1)}
          >
            ›
          </button>
        </div>
      </div>

      <div className="cal compact">
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
            const inMonth = d.getMonth() === month
            const isPicked = picked.has(key)
            const disabled = key < todayKey || (!isPicked && picked.size >= max)
            return (
              <button
                type="button"
                key={key}
                disabled={disabled}
                onClick={() => toggle(key)}
                className={`cal-cell pickable${inMonth ? '' : ' out'}${
                  key === todayKey ? ' today' : ''
                }${isPicked ? ' picked' : ''}${disabled ? ' disabled' : ''}`}
              >
                <span className="cal-daynum">{d.getDate()}</span>
              </button>
            )
          })}
        </div>
      </div>

      <div
        className="row"
        style={{ gap: 8, marginTop: 10, alignItems: 'center' }}
      >
        <label htmlFor="dp-deftime" className="muted" style={{ fontSize: 12 }}>
          Default time
        </label>
        <input
          id="dp-deftime"
          type="time"
          className="input"
          style={{ maxWidth: 130 }}
          value={defaultTime}
          onChange={(e) => setDefaultTime(e.target.value)}
        />
        <span className="muted" style={{ fontSize: 12 }}>
          {picked.size}/{max} selected · click days to add
        </span>
      </div>

      {sorted.length > 0 && (
        <div className="datepick-slots">
          {sorted.map(([date, time]) => (
            <div key={date} className="datepick-slot">
              <span className="d">{dayLabel(date, time)}</span>
              <input
                type="time"
                className="input"
                style={{ maxWidth: 120 }}
                value={time}
                onChange={(e) => setTime(date, e.target.value)}
              />
              <button
                type="button"
                className="btn ghost sm"
                onClick={() => remove(date)}
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
