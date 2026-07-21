#!/usr/bin/env bun
/**
 * hermuz — operator CLI for the live Hermuz deployment.
 *
 * Self-authenticating: it reads the Render API key from 1Password
 * (`op-agent secret op://claude-agent/render/credential`), pulls JWT_SECRET /
 * DISCORD_TOKEN / GUILD_ID from the Render service's env, and mints a short-lived
 * admin JWT for the API — so there's nothing to configure.
 *
 * Usage:
 *   bun scripts/hermuz.ts <command> [args]
 *
 * Commands:
 *   games                              list games
 *   campaigns                          list campaigns (kind, sessions, recurrence)
 *   campaign <id>                      show a campaign + its sessions
 *   campaign <id> schedule [opts]      make it REPEATING + set recurrence, generate sessions
 *       --anchor <ISO>                   explicit first-session datetime, OR:
 *       --weekday <sun..sat> --time <HH:MM> --tz <ET|CT|MT|PT|UTC|IANA> --start <past|next|YYYY-MM-DD>
 *       --every <n>                      interval in weeks (default 1)
 *       --max <n>                        session cap (optional)
 *   campaign <id> generate             materialize / extend the session series
 *   campaign <id> cancel <sessionNo>   cancel one session
 *   campaign <id> announce             (re)post the campaign to the scheduling channel
 *   sessions <id>                      list a campaign's sessions
 *   deploy [--wait]                    trigger a Render deploy (of main), optionally poll to live
 *   logs [n]                           last n runtime log lines (default 40)
 *   discord roles|channels             list the guild's roles / channels (find ids)
 *   whoami                             verify auth (mint token, GET /api/me shape)
 */

const RENDER_SERVICE =
  process.env.HERMUZ_RENDER_SERVICE ?? 'srv-d9bhc2ucjfls738cfd70'
const RENDER_OWNER =
  process.env.HERMUZ_RENDER_OWNER ?? 'tea-cspvcb0gph6c739fv6s0'
const RENDER = 'https://api.render.com/v1'
const DISCORD = 'https://discord.com/api/v10'

const TZ_ALIAS: Record<string, string> = {
  ET: 'America/New_York',
  EST: 'America/New_York',
  EDT: 'America/New_York',
  CT: 'America/Chicago',
  MT: 'America/Denver',
  PT: 'America/Los_Angeles',
  PST: 'America/Los_Angeles',
  PDT: 'America/Los_Angeles',
  UTC: 'UTC'
}
const WEEKDAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']

// ---- secrets & auth -----------------------------------------------------

let _renderKey: string | null = null
async function renderKey(): Promise<string> {
  if (_renderKey) return _renderKey
  const proc = Bun.spawn(
    ['op-agent', 'secret', 'op://claude-agent/render/credential'],
    { stdout: 'pipe', stderr: 'pipe' }
  )
  const out = (await new Response(proc.stdout).text()).trim()
  if (!out)
    throw new Error(
      'Could not read Render key from op://claude-agent/render/credential'
    )
  _renderKey = out
  return out
}

let _env: Record<string, string> | null = null
async function renderEnv(): Promise<Record<string, string>> {
  if (_env) return _env
  const key = await renderKey()
  const res = await fetch(`${RENDER}/services/${RENDER_SERVICE}/env-vars`, {
    headers: { Authorization: `Bearer ${key}` }
  })
  if (!res.ok) throw new Error(`Render env-vars fetch failed: ${res.status}`)
  const rows = (await res.json()) as {
    envVar: { key: string; value: string }
  }[]
  _env = Object.fromEntries(rows.map((r) => [r.envVar.key, r.envVar.value]))
  return _env
}

function b64url(bytes: Uint8Array): string {
  let s = ''
  for (const b of bytes) s += String.fromCharCode(b)
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
async function mintToken(): Promise<string> {
  const secret = (await renderEnv()).JWT_SECRET
  if (!secret) throw new Error('JWT_SECRET not set on the Render service')
  const enc = (o: object) => b64url(new TextEncoder().encode(JSON.stringify(o)))
  const payload = {
    sub: 'hermuz-cli',
    username: 'hermuz-cli',
    isAdmin: true,
    exp: Math.floor(Date.now() / 1000) + 600
  }
  const data = `${enc({ alg: 'HS256', typ: 'JWT' })}.${enc(payload)}`
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const sig = new Uint8Array(
    await crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(data))
  )
  return `${data}.${b64url(sig)}`
}

async function apiBase(): Promise<string> {
  return (
    process.env.HERMUZ_API_ORIGIN ??
    (await renderEnv()).API_ORIGIN ??
    'https://hermuz-5ar1.onrender.com'
  )
}

let _token: string | null = null
async function api<T = unknown>(
  path: string,
  init: { method?: string; body?: unknown } = {}
): Promise<T> {
  _token ??= await mintToken()
  const res = await fetch(`${await apiBase()}${path}`, {
    method: init.method ?? 'GET',
    headers: {
      Authorization: `Bearer ${_token}`,
      'Content-Type': 'application/json'
    },
    body: init.body ? JSON.stringify(init.body) : undefined
  })
  const text = await res.text()
  const json = text ? JSON.parse(text) : null
  if (!res.ok) throw new Error(`${res.status} ${path}: ${text}`)
  return json as T
}

async function discord<T = unknown>(path: string, method = 'GET'): Promise<T> {
  const token = (await renderEnv()).DISCORD_TOKEN
  const res = await fetch(`${DISCORD}${path}`, {
    method,
    headers: { Authorization: `Bot ${token}` }
  })
  if (!res.ok) throw new Error(`discord ${res.status} ${path}`)
  // DELETE returns 204 No Content.
  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}

// ---- recurrence anchor math (DST-aware) --------------------------------

function tzOffsetMs(tz: string, at: Date): number {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  })
  const p: Record<string, string> = {}
  for (const part of dtf.formatToParts(at)) p[part.type] = part.value
  const asUTC = Date.UTC(
    +p.year,
    +p.month - 1,
    +p.day,
    +(p.hour === '24' ? '0' : p.hour),
    +p.minute,
    +p.second
  )
  return asUTC - at.getTime()
}
/** Wall-clock time in a named zone → the corresponding UTC Date. */
function zonedToUtc(
  y: number,
  mo: number,
  d: number,
  h: number,
  mi: number,
  tz: string
): Date {
  const guess = Date.UTC(y, mo - 1, d, h, mi)
  const off = tzOffsetMs(tz, new Date(guess))
  return new Date(guess - off)
}

/** Compute an ISO anchor from --weekday/--time/--tz/--start. */
function computeAnchor(opts: Record<string, string>): string {
  const wd = WEEKDAYS.indexOf((opts.weekday ?? '').slice(0, 3).toLowerCase())
  if (wd < 0) throw new Error('--weekday must be sun..sat')
  const [h, mi] = (opts.time ?? '').split(':').map((n) => parseInt(n, 10))
  if (Number.isNaN(h)) throw new Error('--time must be HH:MM (24h)')
  const tz = TZ_ALIAS[(opts.tz ?? 'UTC').toUpperCase()] ?? opts.tz ?? 'UTC'
  const start = opts.start ?? 'next'

  let base: Date
  if (/^\d{4}-\d{2}-\d{2}$/.test(start)) {
    const [yy, mm, dd] = start.split('-').map(Number)
    base = new Date(Date.UTC(yy, mm - 1, dd))
  } else {
    const now = new Date()
    base = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
    )
    const cur = base.getUTCDay()
    if (start === 'past') {
      base.setUTCDate(base.getUTCDate() - ((cur - wd + 7) % 7))
    } else {
      const fwd = (wd - cur + 7) % 7
      base.setUTCDate(base.getUTCDate() + (fwd === 0 ? 7 : fwd))
    }
  }
  return zonedToUtc(
    base.getUTCFullYear(),
    base.getUTCMonth() + 1,
    base.getUTCDate(),
    h,
    mi,
    tz
  ).toISOString()
}

// ---- arg parsing --------------------------------------------------------

function parseFlags(args: string[]): [string[], Record<string, string>] {
  const pos: string[] = []
  const flags: Record<string, string> = {}
  for (let i = 0; i < args.length; i++) {
    const a = args[i]
    if (a.startsWith('--')) {
      const k = a.slice(2)
      const v =
        args[i + 1] && !args[i + 1].startsWith('--') ? args[++i] : 'true'
      flags[k] = v
    } else pos.push(a)
  }
  return [pos, flags]
}

const fmt = (d: string | null) => (d ? new Date(d).toISOString() : '—')

// ---- commands -----------------------------------------------------------

async function cmdGames() {
  const games = await api<any[]>('/api/games')
  for (const g of games)
    console.log(
      `${g.shortName.padEnd(6)} ${g.name.padEnd(22)} ${g.defaultSchedulingKind}  max=${g.maxSessions ?? '∞'}  ${g.id}`
    )
}

async function cmdCampaigns() {
  const cs = await api<any[]>('/api/campaigns')
  for (const c of cs) {
    const sessions = await api<any[]>(`/api/campaigns/${c.id}/sessions`)
    const active = sessions.filter((s) => s.status !== 'CANCELLED').length
    console.log(
      `${c.title.slice(0, 26).padEnd(26)} ${c.schedulingKind.padEnd(9)} sessions=${active}${c.maxSessions ? `/${c.maxSessions}` : ''}  anchor=${fmt(c.recurrenceAnchor)}  ${c.id}`
    )
  }
}

async function cmdCampaign(id: string, rest: string[]) {
  const [pos, flags] = parseFlags(rest)
  const sub = pos[0]
  if (!sub) {
    const c = await api<any>(`/api/campaigns/${id}`)
    console.log(JSON.stringify(c, null, 2))
    await cmdSessions(id)
    return
  }
  if (sub === 'schedule') {
    const anchor = flags.anchor ?? computeAnchor(flags)
    const body: Record<string, unknown> = {
      schedulingKind: 'REPEATING',
      recurrenceAnchor: anchor,
      recurrenceIntervalWeeks: flags.every ? Number(flags.every) : 1
    }
    if (flags.max) body.maxSessions = Number(flags.max)
    await api(`/api/campaigns/${id}`, { method: 'PATCH', body })
    console.log(
      `scheduled → anchor ${anchor}, every ${body.recurrenceIntervalWeeks}wk`
    )
    await cmdSessions(id)
  } else if (sub === 'generate') {
    const s = await api<any[]>(`/api/campaigns/${id}/generate`, {
      method: 'POST'
    })
    console.log(`sessions now: ${s.length}`)
  } else if (sub === 'cancel') {
    const sessions = await api<any[]>(`/api/campaigns/${id}/sessions`)
    const target = sessions.find((s) => s.sessionNumber === Number(pos[1]))
    if (!target) throw new Error(`no session #${pos[1]}`)
    await api(`/api/campaigns/${id}/sessions/${target.id}/cancel`, {
      method: 'POST'
    })
    console.log(`cancelled session #${pos[1]}`)
  } else if (sub === 'announce') {
    await api(`/api/campaigns/${id}/announce`, { method: 'POST' })
    console.log('announced to the scheduling channel')
  } else if (sub === 'channel') {
    const channelId = pos[1]
    if (!channelId) throw new Error('usage: campaign <id> channel <channelId>')
    await api(`/api/campaigns/${id}`, {
      method: 'PATCH',
      body: { discordChannelId: channelId }
    })
    console.log(`campaign channel → ${channelId}`)
  } else if (sub === 'reset') {
    // Reset a session back to CLOSED and clear its announcement, so the
    // scheduler re-announces it (e.g. after moving it off scheduling-global).
    const sessions = await api<any[]>(`/api/campaigns/${id}/sessions`)
    const target = sessions.find((s) => s.sessionNumber === Number(pos[1]))
    if (!target) throw new Error(`no session #${pos[1]}`)
    await api(`/api/game-days/${target.id}`, {
      method: 'PATCH',
      body: { status: 'CLOSED', announcementMessageId: null }
    })
    console.log(`reset session #${pos[1]} → CLOSED (announcement cleared)`)
  } else throw new Error(`unknown campaign subcommand: ${sub}`)
}

async function cmdSessions(id: string) {
  const s = await api<any[]>(`/api/campaigns/${id}/sessions`)
  for (const x of s)
    console.log(
      `  #${x.sessionNumber ?? '?'} ${fmt(x.dateTime)} ${x.status} msg=${x.announcementMessageId ?? '-'}`
    )
}

async function cmdDeploy(flags: Record<string, string>) {
  const key = await renderKey()
  const res = await fetch(`${RENDER}/services/${RENDER_SERVICE}/deploys`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json'
    },
    body: '{}'
  })
  const dep = (await res.json()) as { id: string; commit: { id: string } }
  console.log(`deploy ${dep.id} (${dep.commit.id.slice(0, 8)}) triggered`)
  if (!flags.wait) return
  for (let i = 0; i < 60; i++) {
    const s = await fetch(
      `${RENDER}/services/${RENDER_SERVICE}/deploys/${dep.id}`,
      {
        headers: { Authorization: `Bearer ${key}` }
      }
    )
    const status = ((await s.json()) as { status: string }).status
    console.log(`  ${new Date().toISOString().slice(11, 19)} ${status}`)
    if (status === 'live') break
    if (/failed|canceled|deactivated/.test(status)) break
    await Bun.sleep(15000)
  }
}

async function cmdLogs(n: number) {
  const key = await renderKey()
  const res = await fetch(
    `${RENDER}/logs?ownerId=${RENDER_OWNER}&resource=${RENDER_SERVICE}&limit=${n}&direction=backward`,
    { headers: { Authorization: `Bearer ${key}` } }
  )
  const data = (await res.json()) as { logs: { message: string }[] }
  for (const l of data.logs.reverse()) console.log(l.message)
}

async function cmdDiscord(pos: string[]) {
  const what = pos[0]
  const guild = (await renderEnv()).GUILD_ID
  if (what === 'roles') {
    const roles = await discord<any[]>(`/guilds/${guild}/roles`)
    for (const r of roles) console.log(`${r.id}  @${r.name}`)
  } else if (what === 'channels') {
    const chans = await discord<any[]>(`/guilds/${guild}/channels`)
    for (const c of chans) console.log(`type=${c.type}  ${c.id}  #${c.name}`)
  } else if (what === 'delete-message') {
    const channelId = pos[1]
    const messageId = pos[2]
    if (!channelId || !messageId)
      throw new Error('discord delete-message <channelId> <messageId>')
    await discord(`/channels/${channelId}/messages/${messageId}`, 'DELETE')
    console.log(`deleted message ${messageId} from channel ${channelId}`)
  } else throw new Error('discord <roles|channels|delete-message>')
}

// ---- main ---------------------------------------------------------------

async function main() {
  const [cmd, ...args] = Bun.argv.slice(2)
  const [pos, flags] = parseFlags(args)
  switch (cmd) {
    case 'games':
      return cmdGames()
    case 'campaigns':
      return cmdCampaigns()
    case 'campaign':
      return cmdCampaign(pos[0], args.slice(1))
    case 'sessions':
      return cmdSessions(pos[0])
    case 'deploy':
      return cmdDeploy(flags)
    case 'logs':
      return cmdLogs(pos[0] ? Number(pos[0]) : 40)
    case 'discord':
      return cmdDiscord(pos)
    case 'whoami':
      return console.log(await api('/api/me'))
    default:
      console.log(
        'hermuz <games|campaigns|campaign <id> [schedule|generate|cancel <n>|reset <n>|channel <channelId>|announce]|sessions <id>|deploy [--wait]|logs [n]|discord <roles|channels|delete-message <channelId> <messageId>>|whoami>'
      )
  }
}

main().catch((err) => {
  console.error('error:', err instanceof Error ? err.message : err)
  process.exit(1)
})
