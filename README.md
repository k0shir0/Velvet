# 🍷 Red Velvet

A modular, **locally-hosted** Discord bot managed through a sleek web control panel.

Red Velvet starts completely **barebones** — every feature is strictly opt-in. You toggle
modules on from the dashboard, stage your configuration, and hit **Push Changes** to deploy
it to the live bot.

> **Status:** Core scaffold (Phase 1). Feature modules are layered in over subsequent releases.

---

## Architecture

A single Node.js process runs **both** the Discord bot and the dashboard backend, so the
control panel talks directly to the live bot instance.

```
velvet/
├─ shared/   @velvet/shared — module contract, config schemas, shared types (zod)
├─ server/   @velvet/server — discord.js bot + Express API + Socket.IO + SQLite (Drizzle)
└─ web/      @velvet/web     — React + Vite control panel (Red Velvet theme)
```

| Concern        | Choice                                            |
| -------------- | ------------------------------------------------- |
| Bot            | [discord.js](https://discord.js.org)              |
| Backend / API  | Express + [Socket.IO](https://socket.io)          |
| Frontend       | React + Vite                                      |
| Database       | SQLite via [Drizzle ORM](https://orm.drizzle.team) (`better-sqlite3`) |
| Validation     | [zod](https://zod.dev)                            |
| Logging        | [pino](https://getpino.io)                        |

### The module system

Every feature is a **module** that defaults to **disabled**. A module declares its metadata,
a zod config schema, optional slash commands, and `onEnable` / `onDisable` lifecycle hooks.
The dashboard stages changes locally; **Push Changes** sends the desired state to the server,
which validates it, persists it to SQLite, diffs it against the running bot, and hot-swaps the
affected modules.

---

## Getting started

```bash
# 1. Install all workspaces
npm install

# 2. Configure secrets
cp .env.example .env
#   → fill in TOKEN, CLIENT_ID, GUILD_ID, and a DASHBOARD_PASSWORD

# 3. Run bot + dashboard in dev mode
npm run dev
```

- Control panel (Vite dev server): **http://localhost:5173**
- Backend API + WebSocket: **http://localhost:4317** (configurable via `DASHBOARD_PORT`)

Without a `TOKEN`, the dashboard still runs in offline mode so you can explore the panel.

---

## Roadmap

- [x] **Phase 1 — Core scaffold:** bot bootstrap, module registry, Apply pipeline, Command
      Console, Module Manager, Red Velvet dashboard.
- [ ] **Phase 2 — Moderation Core & Automod:** `/kick` `/ban` `/unban` `/timeout` `/warn`
      `/lockdown`, automod engine, advanced purge.
- [ ] **Phase 3 — Advanced Audit Logging (Overseer):** deleted/edited message retention,
      voice activity, dashboard log viewer.
- [ ] **Phase 4 — Core Utilities & Automation:** server archiver, hardware-synced presence,
      permission auditor.
- [ ] **Phase 5 — Server Engagement:** XP & leaderboard, reaction roles, dynamic server
      stats, role blueprinting.
