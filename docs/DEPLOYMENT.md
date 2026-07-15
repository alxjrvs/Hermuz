# Hermuz Deployment Runbook

Getting Hermuz live: one Render web service (Discord bot + JSON API + SQLite on a
disk) and the Netlify-hosted web console. Steps are ordered by dependency — do
them top to bottom.

**Already done (by the setup agent):** the Netlify site
[`hermuz.netlify.app`](https://app.netlify.com/projects/hermuz) exists with build
env var `VITE_API_ORIGIN=https://hermuz.onrender.com`. Everything else below needs
your credentials.

> Throughout, the Render URL is assumed to be `https://hermuz.onrender.com` (the
> default for a service named `hermuz`). If Render assigns a different URL, update
> the three places that reference it — noted inline as **⚠ URL**.

---

## 1. Discord application

Discord Developer Portal → <https://discord.com/developers/applications> → your app
(create one if needed).

1. **Bot** tab:
   - **Reset/Copy Token** → this is `DISCORD_TOKEN`.
   - Enable **Privileged Gateway Intents**: **Server Members**, **Presence**, and
     **Message Content** (the bot requests all three).
2. **General Information**: copy **Application ID** → `DISCORD_CLIENT_ID`.
3. **OAuth2** tab:
   - Copy **Client Secret** → `DISCORD_OAUTH_CLIENT_SECRET`.
   - Under **Redirects**, add `https://hermuz.onrender.com/auth/callback`. **⚠ URL**
4. **Invite the bot** to your server (OAuth2 → URL Generator): scopes `bot` +
   `applications.commands`; bot permissions **Manage Roles, Manage Channels,
   Manage Events, Send Messages, Read Message History, View Channels** (needed for
   full-parity game-day roles/channels/events/announcements).
5. **Get your server ID** → `GUILD_ID`: Discord → Settings → Advanced → enable
   **Developer Mode**, then right-click your server → **Copy Server ID**.

---

## 2. Merge PR #1

Render and Netlify build from `main`, so the code must land first.

- Merge **PR #1** (squash; branch protection requires CI green + linear history).
- The head branch auto-deletes on merge.

---

## 3. Render web service (bot + API + DB)

1. Render Dashboard → **New** → **Blueprint** → connect **`alxjrvs/Hermuz`**.
   Render reads `render.yaml` and provisions the `hermuz` web service + a 1 GB disk
   at `/var/data`.
2. Set the `sync: false` env vars (Service → **Environment**):

   | Var | Value |
   | --- | --- |
   | `DISCORD_TOKEN` | from step 1 |
   | `DISCORD_CLIENT_ID` | from step 1 |
   | `GUILD_ID` | from step 1 |
   | `DISCORD_OAUTH_CLIENT_SECRET` | from step 1 |
   | `API_ORIGIN` | `https://hermuz.onrender.com` **⚠ URL** |
   | `WEB_ORIGIN` | `https://hermuz.netlify.app` |

   `JWT_SECRET` auto-generates (`generateValue: true`); `DATABASE_PATH` and
   `BUN_VERSION` come from the blueprint — leave them.
3. (Recommended) Service → **Settings** → **Health Check Path** = `/health`.
4. Deploy. Watch the logs for: `Running database migrations…`, `Logged in as
   <bot>#…`, and `API listening on :<port>`.
5. Verify: `curl https://hermuz.onrender.com/health` → `{"ok":true,"bot":true}`. **⚠ URL**

> **If Render's URL isn't `hermuz.onrender.com`:** update `API_ORIGIN` (Render), the
> Discord redirect URI (step 1.3), and `VITE_API_ORIGIN` (step 4) to the real URL.

---

## 4. Netlify web console

The site already exists (`hermuz.netlify.app`). Wire it to the repo so it builds on
every push.

1. Netlify → **hermuz** → **Site configuration → Build & deploy → Link repository**
   → `alxjrvs/Hermuz`. Grant the GitHub authorization when prompted. Netlify picks
   up `apps/web/netlify.toml` (base `apps/web`, build `bun run build`, publish
   `apps/web/dist`).
2. Confirm **Environment variables** contains `VITE_API_ORIGIN` (already set to
   `https://hermuz.onrender.com`). **⚠ URL** — it is baked in at build time, so if you
   change it, trigger a fresh deploy.
3. Trigger a deploy (auto-runs on link / next push to `main`).
4. Open <https://hermuz.netlify.app> → the login page.

---

## 5. End-to-end smoke test

1. **Web login:** `hermuz.netlify.app` → **Log in with Discord** → authorize. You
   land on **Overview** (with write access if you have Administrator in the guild;
   read-only otherwise).
2. **Bot:** in Discord run `/ping` (expect “Pong!”), then `/game_day list`.
3. **Full-parity round-trip:** in the GUI, set the scheduling channel (Settings),
   create a game, then schedule a game day — confirm the Discord **role**,
   **channels**, and **announcement** appear in the server; RSVP from Discord and
   see the count update in the GUI.

---

## 6. Post-launch (open items, optional)

- **Backups:** add [Litestream](https://litestream.io) as a sidecar replicating
  `/var/data/hermuz.db` to Cloudflare R2/S3 (point-in-time restore), or a Render
  cron that snapshots the file. SQLite on one disk is otherwise a single point of
  failure.
- **Custom domain:** `hermuz.app` (SPA) + `api.hermuz.app` (API) is a nicety — auth
  already works cross-origin via a Bearer JWT, so it isn't required.
- **Agent access to Render:** store a Render API key at
  `op://claude-agent/render/credential` so the project's `.mcp.json` Render server
  can manage the service from a future Claude session.
- **Bulk editing** in the GUI (PLAN Phase 3) is not yet built.

---

## Environment variable reference

| Var | Source | Set in |
| --- | --- | --- |
| `DISCORD_TOKEN` | Discord app → Bot → Token | Render |
| `DISCORD_CLIENT_ID` | Discord app → Application ID | Render |
| `GUILD_ID` | Discord server ID (Developer Mode → Copy Server ID) | Render |
| `DISCORD_OAUTH_CLIENT_SECRET` | Discord app → OAuth2 → Client Secret | Render |
| `JWT_SECRET` | auto-generated | Render (automatic) |
| `API_ORIGIN` | the Render service URL | Render |
| `WEB_ORIGIN` | `https://hermuz.netlify.app` | Render |
| `DATABASE_PATH` | `/var/data/hermuz.db` | Render (blueprint) |
| `BUN_VERSION` | `1.3.14` | Render (blueprint) |
| `VITE_API_ORIGIN` | the Render service URL | Netlify (already set) |
