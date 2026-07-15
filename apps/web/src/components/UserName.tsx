import type { ResolvedUser } from '../types'

/**
 * Render a Discord user as avatar + display name, falling back to the raw id
 * while it resolves (or if it can't be resolved).
 */
export function UserName({ id, user }: { id: string; user?: ResolvedUser }) {
  const label = user?.displayName ?? id
  return (
    <span className="user-name">
      {user?.avatarUrl && (
        <img
          className="user-avatar"
          src={user.avatarUrl}
          alt=""
          width={20}
          height={20}
        />
      )}
      <span>{label}</span>
    </span>
  )
}
