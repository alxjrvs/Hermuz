interface KpiProps {
  label: string
  value: string | number
  hint?: string
}

export function Kpi({ label, value, hint }: KpiProps) {
  return (
    <div className="kpi">
      <div className="kpi-label">{label}</div>
      <div className="kpi-value tnum">{value}</div>
      {hint && <div className="kpi-hint">{hint}</div>}
    </div>
  )
}
