import { useEffect, useState } from 'react'
import { usersApi } from '../api'
import type { ResolvedUser } from '../types'

// Module-level cache: Discord identities rarely change within a session, so we
// resolve each id at most once across the whole app.
const cache = new Map<string, ResolvedUser>()

/**
 * Resolve a set of Discord ids to names/avatars. Returns a map of the ones known
 * so far and fetches any missing in one batched request, re-rendering on arrival.
 */
export function useUserNames(ids: string[]): Map<string, ResolvedUser> {
  const [, setTick] = useState(0)
  const key = Array.from(new Set(ids)).sort().join(',')

  useEffect(() => {
    const missing = Array.from(new Set(ids)).filter(
      (id) => id && !cache.has(id)
    )
    if (missing.length === 0) return
    let cancelled = false
    usersApi
      .resolve(missing)
      .then((rows) => {
        if (cancelled) return
        for (const r of rows) cache.set(r.id, r)
        setTick((t) => t + 1)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  const map = new Map<string, ResolvedUser>()
  for (const id of ids) {
    const r = cache.get(id)
    if (r) map.set(id, r)
  }
  return map
}
