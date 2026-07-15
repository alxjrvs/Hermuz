import type { ReactNode } from 'react'

interface PanelProps {
  title: string
  actions?: ReactNode
  children: ReactNode
  padded?: boolean
}

export function Panel({ title, actions, children, padded }: PanelProps) {
  return (
    <section className="panel">
      <div className="panel-head">
        <h2>{title}</h2>
        {actions && <div className="row">{actions}</div>}
      </div>
      <div className={`panel-body${padded ? ' padded' : ''}`}>{children}</div>
    </section>
  )
}

export function ErrorBanner({ message }: { message: string }) {
  return <div className="banner error">{message}</div>
}

export function Loading({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="loading">
      <span className="spinner" />
      {label}
    </div>
  )
}

export function Empty({ label = 'Nothing here yet.' }: { label?: string }) {
  return <div className="empty">{label}</div>
}
