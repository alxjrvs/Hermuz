# Hermuz — Board-game scheduling assistant 🎲

Hermuz keeps a tabletop group organized from **both Discord and the web**, over
one shared database. Organizers run games, campaigns, and sessions from a web
console; players RSVP, join campaigns, claim setup tasks, and answer meal polls
from either surface — every action is backed by the same service, so the two
never drift.

## Monorepo layout

A Bun workspace with three packages:

| Package        | What it is                                                            |
| -------------- | --------------------------------------------------------------------- |
| `packages/db`  | SQLite schema + Drizzle repositories, the shared data core            |
| `apps/bot`     | Discord bot (discord.js) **and** the Hono JSON API, one process       |
| `apps/web`     | React + Vite operator/player console (static SPA)                     |

The bot and API run as a single process sharing one SQLite connection; the web
app is a static bundle that talks to the API over HTTP.

## Features

- **Games, campaigns, game days** with associated Discord roles, private
  channels, and scheduled events.
- **Scheduling**: one-off game days or repeating campaigns whose sessions are
  auto-materialized and auto-opened for RSVPs as they approach.
- **RSVPs** (available / interested / not available) from Discord buttons, the
  `/rsvp` command, or the web — all one shared service.
- **Self-service**: `/campaign join|leave|confirm`, `/character set`,
  `/my schedule|campaigns`, `/console`; plus member-level web controls.
- **Setup checklists**: per-game task templates that materialize onto each game
  day, checkable/claimable from Discord (`/task`) or the web, mirrored into the
  game day's `logistics` channel.
- **Meal coordination**: lunch/dinner polls posted to the `food` channel that
  track who's in/out and DM-nudge non-responders on a schedule.
- **Location type**: games/campaigns/game days are typed Virtual or In Person
  (inherited, overridable).
- A background **scheduler** drives reminders, meal nudges, session opening, and
  horizon maintenance.

## Technology stack

- **Runtime & package manager**: [Bun](https://bun.sh/)
- **Bot**: [discord.js](https://discord.js.org/)
- **API**: [Hono](https://hono.dev/)
- **Web**: [React](https://react.dev/) + [Vite](https://vite.dev/)
- **Database**: SQLite via [Drizzle ORM](https://orm.drizzle.team/)
- **Language / typecheck**: TypeScript, checked with the native
  [`tsgo`](https://github.com/microsoft/typescript-go) (TS7) compiler
- **Lint & format**: [Biome](https://biomejs.dev/)

## Getting started

```bash
bun install
bun run db:migrate     # apply migrations to the SQLite database
bun --filter '@hermuz/bot' dev   # run the bot + API
bun --filter '@hermuz/web' dev   # run the web console
```

Root scripts:

```bash
bun run typecheck   # tsgo --noEmit across all packages
bun run lint        # biome check .
bun run format      # biome format --write .
bun run db:generate # regenerate a Drizzle migration after a schema change
bun run db:migrate  # apply pending migrations
```

## Environment

Required for the bot/API (`apps/bot`):

```env
DISCORD_TOKEN=...
DISCORD_CLIENT_ID=...
GUILD_ID=...                     # the single guild Hermuz serves
DISCORD_OAUTH_CLIENT_SECRET=...  # web console login (Discord OAuth2)
JWT_SECRET=...                   # signs the web session token
API_ORIGIN=https://...           # public origin of the API (OAuth redirect)
WEB_ORIGIN=https://...           # the web SPA origin (CORS + post-login redirect)
DATABASE_PATH=/var/data/hermuz.db  # persistent path — see Durability
```

For the web build (`apps/web`), set `VITE_API_ORIGIN` to the API URL.

### Durability

SQLite persists to `DATABASE_PATH`. On a host with an ephemeral filesystem
(e.g. Render without a mounted disk) a default/relative path is **wiped on every
deploy** — always point `DATABASE_PATH` at a mounted persistent disk. The bot
logs a warning at boot if it's unset in production.

## Bot permissions

Hermuz needs: **Manage Roles** (create/manage game & campaign roles),
**Manage Channels** (private game-day/campaign categories), **Manage Events**
(scheduled events), **Send Messages**, **Embed Links**, and **Read Message
History**. The bot's role must sit above the roles it manages in the hierarchy.
