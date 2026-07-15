import { useEffect, useState } from 'react'
import { gamesApi } from '../api'
import { toMessage } from '../lib/useAsync'
import { ErrorBanner } from './Panel'
import { Modal } from './Modal'

interface Props {
  gameId: string
  gameName: string
  onClose: () => void
}

/**
 * Edit a game's default setup-task template — the checklist every new game day
 * of this game inherits. Just an ordered list of labels; save replaces the set.
 */
export function TaskTemplateEditor({ gameId, gameName, onClose }: Props) {
  const [labels, setLabels] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    gamesApi
      .taskTemplates(gameId)
      .then((rows) => {
        if (cancelled) return
        setLabels(rows.length ? rows.map((r) => r.label) : [''])
        setLoading(false)
      })
      .catch((e) => {
        if (cancelled) return
        setErr(toMessage(e))
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [gameId])

  const setAt = (i: number, v: string) =>
    setLabels((ls) => ls.map((l, j) => (j === i ? v : l)))
  const removeAt = (i: number) =>
    setLabels((ls) => ls.filter((_, j) => j !== i))
  const addRow = () => setLabels((ls) => [...ls, ''])

  const save = async () => {
    setSaving(true)
    setErr(null)
    try {
      const items = labels
        .map((l) => l.trim())
        .filter(Boolean)
        .map((label) => ({ label }))
      await gamesApi.setTaskTemplates(gameId, items)
      onClose()
    } catch (e) {
      setErr(toMessage(e))
      setSaving(false)
    }
  }

  return (
    <Modal
      title={`Setup tasks — ${gameName}`}
      onClose={onClose}
      footer={
        <>
          <button className="btn ghost" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button className="btn primary" onClick={save} disabled={saving}>
            {saving ? 'Saving…' : 'Save default checklist'}
          </button>
        </>
      }
    >
      {err && <ErrorBanner message={err} />}
      <p className="muted" style={{ marginTop: 0 }}>
        New game days of this game start with these tasks. Reorder by editing;
        blanks are dropped on save.
      </p>
      {loading ? (
        <div className="muted">Loading…</div>
      ) : (
        <div className="stack" style={{ gap: 8 }}>
          {labels.map((label, i) => (
            <div key={i} className="row" style={{ gap: 8 }}>
              <input
                className="input"
                value={label}
                placeholder={`Task ${i + 1}`}
                onChange={(e) => setAt(i, e.target.value)}
              />
              <button className="btn sm danger" onClick={() => removeAt(i)}>
                ✕
              </button>
            </div>
          ))}
          <button className="btn sm" onClick={addRow}>
            + Add task
          </button>
        </div>
      )}
    </Modal>
  )
}
