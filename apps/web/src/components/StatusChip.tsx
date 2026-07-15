import type {
  AttendanceStatus,
  GameDayStatus,
  PlayerStatus,
  SchedulingKind
} from '../types'

type ChipTone = 'good' | 'warn' | 'danger' | 'muted' | 'accent'

function Chip({ tone, label }: { tone: ChipTone; label: string }) {
  return <span className={`chip ${tone}`}>{label}</span>
}

const GAME_DAY_TONE: Record<GameDayStatus, ChipTone> = {
  CLOSED: 'good',
  SCHEDULING: 'warn',
  CANCELLED: 'danger'
}

export function GameDayStatusChip({ status }: { status: GameDayStatus }) {
  return <Chip tone={GAME_DAY_TONE[status] ?? 'muted'} label={status} />
}

const ATTENDANCE_TONE: Record<AttendanceStatus, ChipTone> = {
  AVAILABLE: 'good',
  INTERESTED: 'accent',
  NOT_AVAILABLE: 'muted'
}

export function AttendanceStatusChip({ status }: { status: AttendanceStatus }) {
  return (
    <Chip
      tone={ATTENDANCE_TONE[status] ?? 'muted'}
      label={status.replace(/_/g, ' ')}
    />
  )
}

const PLAYER_TONE: Record<PlayerStatus, ChipTone> = {
  CONFIRMED: 'good',
  INTERESTED: 'accent'
}

export function PlayerStatusChip({ status }: { status: PlayerStatus }) {
  return <Chip tone={PLAYER_TONE[status] ?? 'muted'} label={status} />
}

const SCHEDULING_TONE: Record<SchedulingKind, ChipTone> = {
  SCHEDULED: 'accent',
  REPEATING: 'good'
}

export function SchedulingKindChip({ kind }: { kind: SchedulingKind }) {
  return <Chip tone={SCHEDULING_TONE[kind] ?? 'muted'} label={kind} />
}
