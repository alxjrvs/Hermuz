import { useEffect, useState } from 'react'
import { settingsApi } from '../api'
import { ErrorBanner, Loading, Panel } from '../components/Panel'
import { useAuth } from '../context/AuthContext'
import { toMessage, useAsync } from '../lib/useAsync'

export function Settings() {
  const { isAdmin } = useAuth()
  const { data, loading, error, reload } = useAsync(() => settingsApi.get(), [])

  const [channelId, setChannelId] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (data) setChannelId(data.schedulingChannelId ?? '')
  }, [data])

  const save = async () => {
    setSaving(true)
    setSaveError(null)
    setSaved(false)
    try {
      await settingsApi.setSchedulingChannel(channelId.trim())
      setSaved(true)
      reload()
    } catch (err) {
      setSaveError(toMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Settings</h1>
          <p>Server-wide configuration.</p>
        </div>
      </div>

      <Panel title="Scheduling channel" padded>
        {loading ? (
          <Loading />
        ) : error ? (
          <ErrorBanner message={error} />
        ) : (
          <div className="stack" style={{ maxWidth: 460 }}>
            <p className="muted" style={{ margin: 0 }}>
              The Discord channel where game-day scheduling announcements are
              posted.
            </p>
            {saveError && <ErrorBanner message={saveError} />}
            {saved && (
              <div className="banner info">Scheduling channel saved.</div>
            )}
            <div className="field" style={{ margin: 0 }}>
              <label htmlFor="channel">Channel ID</label>
              <input
                id="channel"
                className="input tnum"
                value={channelId}
                placeholder="e.g. 123456789012345678"
                disabled={!isAdmin || saving}
                onChange={(e) => {
                  setChannelId(e.target.value)
                  setSaved(false)
                }}
              />
            </div>
            {isAdmin ? (
              <div className="row">
                <button
                  className="btn primary"
                  onClick={save}
                  disabled={saving}
                >
                  {saving ? 'Saving…' : 'Save'}
                </button>
              </div>
            ) : (
              <div className="readonly-note">
                Only admins can change settings.
              </div>
            )}
          </div>
        )}
      </Panel>
    </>
  )
}
