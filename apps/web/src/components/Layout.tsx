import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { OrreryMark } from './OrreryMark'

interface NavItem {
  to: string
  label: string
}

const NAV: NavItem[] = [
  { to: '/', label: 'Overview' },
  { to: '/calendar', label: 'Calendar' },
  { to: '/games', label: 'Games' },
  { to: '/game-days', label: 'Game Days' },
  { to: '/surveys', label: 'Surveys' },
  { to: '/campaigns', label: 'Campaigns' },
  { to: '/attendance', label: 'Attendance' },
  { to: '/settings', label: 'Settings' }
]

// Build breadcrumb segments from the current path, using the nav labels for
// the first segment where possible.
function useBreadcrumb(): string[] {
  const { pathname } = useLocation()
  if (pathname === '/') return ['Overview']
  const parts = pathname.split('/').filter(Boolean)
  const first = NAV.find((n) => n.to === `/${parts[0]}`)
  const crumbs = [first?.label ?? titleCase(parts[0])]
  if (parts.length > 1) crumbs.push('Detail')
  return crumbs
}

function titleCase(s: string): string {
  return s
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

function Breadcrumb() {
  const crumbs = useBreadcrumb()
  return (
    <nav className="breadcrumb" aria-label="Breadcrumb">
      <span>Hermuz</span>
      {crumbs.map((c, i) => (
        <span key={i} className="row" style={{ gap: 8 }}>
          <span className="sep">/</span>
          <span className={i === crumbs.length - 1 ? 'current' : ''}>{c}</span>
        </span>
      ))}
    </nav>
  )
}

export function Layout() {
  const { user, isAdmin, logout } = useAuth()

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <OrreryMark size={22} />
          Herm<span className="accent">uz</span>
        </div>
        <nav className="nav">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `nav-link${isActive ? ' active' : ''}`
              }
            >
              <span className="nav-icon" />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="username">{user?.username ?? '—'}</div>
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <span>{isAdmin ? 'Admin' : 'Member'}</span>
            <button className="btn ghost sm" onClick={logout}>
              Log out
            </button>
          </div>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <Breadcrumb />
          {!isAdmin && (
            <span className="readonly-note">Read-only · member access</span>
          )}
        </header>
        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
