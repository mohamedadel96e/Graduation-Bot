# GradBot — Graduation Project Discord Bot
### Full Project Plan (Node.js + discord.js + Google Sheets)

---

## 1. Overview

GradBot is a Discord bot that manages the entire lifecycle of a graduation project for a student team:

1. **Idea Phase** — collect, discuss, and vote on candidate project ideas.
2. **Decision Phase** — lock in the chosen idea and record the rationale.
3. **Development Phase** — track tasks, milestones, deadlines, and team ownership.
4. **Logging** — every meaningful action in the server (idea added, vote cast, task completed, deadline missed, etc.) is logged to a dedicated channel and to Google Sheets for permanent audit history.

**Stack**
- **Runtime**: Node.js (v20+), TypeScript recommended (you already use TS in `stackgen`)
- **Discord library**: `discord.js` v14 (slash commands, buttons, modals, select menus)
- **Database**: Google Sheets (via `googleapis` npm package, service account auth)
- **Scheduler**: `node-cron` (deadline reminders, daily digest)
- **Hosting**: any always-on Node host (Railway / Render / a VPS / Raspberry Pi). Sheets means no DB hosting cost.

---

## 2. Core Feature Set

### A. Idea Management
- `/idea add` — modal form (title, description, tech stack, difficulty, link/references)
- `/idea list` — paginated embed of all ideas with current vote counts and status
- `/idea view <id>` — full detail card with a thread for discussion
- `/idea vote <id>` — 👍/👎/🤔 reactions or buttons, one vote per user, changeable
- `/idea comment <id> <text>` — adds a comment, also logged
- `/idea archive <id>` — soft-delete (kept in sheet, hidden from active list)
- Auto-thread: every new idea spawns a discussion thread under it

### B. Decision Workflow
- `/decide finalize <id>` — admin/leader-only, locks the chosen idea
  - Posts an announcement embed
  - Freezes voting
  - Creates the Development Phase structure automatically (see C)
- `/decide reasoning <text>` — records *why* this idea was picked (stored in Sheets, useful for your project report later)

### C. Development Phase Tracking
- `/task add` — modal (title, description, assignee(s), due date, priority, milestone)
- `/task list [assignee|milestone|status]` — filtered view
- `/task status <id> <todo|in-progress|blocked|done>` — updates state, logs transition
- `/task assign <id> <@user>` 
- `/milestone add` — name, target date, linked tasks
- `/milestone progress` — auto-computed % complete from linked tasks, posted as an embed with a progress bar
- Daily/weekly **digest** auto-posted (cron): tasks due soon, overdue tasks, blocked tasks, milestone progress
- `/standup` — optional lightweight async standup prompt (what you did / doing / blockers), saved to Sheets

### D. Logging System
A dedicated `#bot-logs` channel + a `Logs` sheet capture **every** state-changing action:
- Idea added/edited/archived/voted/commented
- Decision finalized
- Task created/updated/reassigned/status-changed
- Milestone created/completed
- Member joined/left the project (optional, via Discord events)
- Errors/exceptions (separate `#bot-errors` channel for you as maintainer)

Every log entry includes: timestamp, actor, action type, target (idea/task id), before→after values (if applicable), and a free-text detail field. This doubles as your project's own "project management audit trail" — genuinely nice to show in your grad project documentation.

---

## 3. Discord Server Structure (suggested)

```
📁 INFO
  #welcome
  #rules
📁 IDEAS
  #idea-discussion        (bot posts idea cards + threads here)
  #voting-results
📁 DEVELOPMENT
  #tasks
  #standups
  #milestones
📁 LOGS (visible to leads/admins only)
  #bot-logs
  #bot-errors
```

---

## 4. Roles & Permissions

| Role | Can do |
|---|---|
| `@Member` | add ideas, vote, comment, manage own tasks, run `/standup` |
| `@Team Lead` | finalize decisions, create/assign tasks & milestones, archive ideas |
| `@Bot Admin` (you) | all of the above + `/admin` config commands, sheet resync, error log access |

Permission checks live in a small `permissions.ts` middleware that wraps command handlers — check role before hitting the Sheets layer.

---

## 5. Slash Command Reference

```
/idea add
/idea list [status]
/idea view <id>
/idea vote <id> <up|down|unsure>
/idea comment <id> <text>
/idea archive <id>

/decide finalize <id>
/decide reasoning <text>
/decide status

/task add
/task list [assignee] [milestone] [status]
/task status <id> <state>
/task assign <id> <user>
/task delete <id>

/milestone add
/milestone list
/milestone progress <id>

/standup
/digest now            (force-trigger today's digest, admin only)

/admin resync-sheets    (re-pull cache from Sheets)
/admin config <key> <value>
/log search <filter>    (query past logs without opening the sheet)
```

---

## 6. Architecture & Project Structure

```
gradbot/
├── src/
│   ├── index.ts                 # client bootstrap, command/event loader
│   ├── commands/
│   │   ├── idea/
│   │   │   ├── add.ts
│   │   │   ├── list.ts
│   │   │   ├── vote.ts
│   │   │   ├── comment.ts
│   │   │   └── archive.ts
│   │   ├── decide/
│   │   ├── task/
│   │   ├── milestone/
│   │   ├── standup.ts
│   │   └── admin/
│   ├── events/
│   │   ├── ready.ts
│   │   ├── interactionCreate.ts
│   │   └── guildMemberRemove.ts
│   ├── sheets/
│   │   ├── client.ts             # googleapis auth + sheets instance (singleton)
│   │   ├── ideas.repo.ts
│   │   ├── votes.repo.ts
│   │   ├── tasks.repo.ts
│   │   ├── milestones.repo.ts
│   │   ├── members.repo.ts
│   │   └── logs.repo.ts
│   ├── services/
│   │   ├── logger.ts             # writes to #bot-logs AND Logs sheet
│   │   ├── digest.ts             # cron job: daily/weekly summaries
│   │   └── reminders.ts          # cron job: due-date pings
│   ├── ui/
│   │   ├── embeds/                # embed builders (idea card, task card, etc.)
│   │   ├── modals/
│   │   └── components/            # buttons, select menus
│   ├── permissions.ts
│   ├── config.ts                  # env-driven config, channel/role IDs
│   └── types.ts
├── .env
├── package.json
├── tsconfig.json
└── README.md
```

**Why a repo-per-sheet pattern**: same idea you used in Mizan's backend — each `*.repo.ts` wraps raw `googleapis` calls (range reads/writes) behind a clean interface (`IdeasRepo.create()`, `.findAll()`, `.archive(id)`) so commands never touch raw Sheets ranges directly. Makes swapping Sheets → a real DB later (Postgres/Supabase) trivial if the bot outgrows Sheets.

**Caching**: Sheets API has rate limits (300 req/min/project read, 60/min write per default quota). Keep an in-memory cache (`Map`) per sheet, refreshed on write and resynced every few minutes via `/admin resync-sheets` or a cron tick, so `/idea list` doesn't hit the API every single call.

---

## 7. Google Sheets Database Design

One Google Sheet (spreadsheet) named **`GradBot DB`**, with these tabs:

### Tab: `Ideas`
| Column | Type | Notes |
|---|---|---|
| `id` | string (uuid short) | primary key |
| `title` | string | |
| `description` | string | |
| `tech_stack` | string | comma-separated |
| `difficulty` | enum | Easy / Medium / Hard |
| `submitted_by` | string | Discord user ID |
| `submitted_by_name` | string | display name (denormalized for readability) |
| `status` | enum | Active / Finalized / Archived |
| `thread_id` | string | Discord thread ID for discussion |
| `created_at` | datetime | |
| `updated_at` | datetime | |

### Tab: `Votes`
| Column | Type | Notes |
|---|---|---|
| `id` | string | |
| `idea_id` | string | FK → Ideas.id |
| `user_id` | string | Discord user ID |
| `vote` | enum | up / down / unsure |
| `created_at` | datetime | |

> One row per (idea_id, user_id) — bot upserts (finds & overwrites existing row) so a user can change their vote.

### Tab: `Decision`
| Column | Type | Notes |
|---|---|---|
| `idea_id` | string | the finalized idea |
| `reasoning` | string | why it was chosen |
| `decided_by` | string | Discord user ID |
| `decided_at` | datetime | |

### Tab: `Tasks`
| Column | Type | Notes |
|---|---|---|
| `id` | string | |
| `title` | string | |
| `description` | string | |
| `milestone_id` | string | FK → Milestones.id (nullable) |
| `assignees` | string | comma-separated Discord user IDs |
| `priority` | enum | Low / Medium / High / Critical |
| `status` | enum | Todo / In-Progress / Blocked / Done |
| `due_date` | date | |
| `created_at` | datetime | |
| `updated_at` | datetime | |
| `completed_at` | datetime | nullable |

### Tab: `Milestones`
| Column | Type | Notes |
|---|---|---|
| `id` | string | |
| `name` | string | |
| `target_date` | date | |
| `status` | enum | Upcoming / In-Progress / Completed / Missed |
| `created_at` | datetime | |

### Tab: `Standups`
| Column | Type | Notes |
|---|---|---|
| `id` | string | |
| `user_id` | string | |
| `did` | string | |
| `doing` | string | |
| `blockers` | string | |
| `created_at` | datetime | |

### Tab: `Members`
| Column | Type | Notes |
|---|---|---|
| `user_id` | string | |
| `display_name` | string | |
| `role` | enum | Member / Lead / Admin |
| `joined_at` | datetime | |
| `left_at` | datetime | nullable |

### Tab: `Logs`
| Column | Type | Notes |
|---|---|---|
| `id` | string | |
| `timestamp` | datetime | |
| `actor_id` | string | Discord user ID |
| `actor_name` | string | |
| `action_type` | string | e.g. `idea.create`, `task.status_change` |
| `target_id` | string | id of idea/task/milestone affected |
| `before` | string | JSON snapshot or short text, nullable |
| `after` | string | JSON snapshot or short text |
| `detail` | string | free-text note |

### Tab: `Config` (optional, lets you tweak behavior without redeploying)
| Column | Type | Notes |
|---|---|---|
| `key` | string | e.g. `digest_hour`, `reminder_days_before` |
| `value` | string | |

**Sheet setup steps:**
1. Create a new Google Sheet, name it `GradBot DB`, add the 9 tabs above with header rows exactly as listed (the repo layer will read by header name, not column letter, so order doesn't matter as long as headers match).
2. Create a Google Cloud project → enable **Google Sheets API**.
3. Create a **Service Account**, generate a JSON key.
4. Share the Sheet with the service account's email (`...@...iam.gserviceaccount.com`) as **Editor**.
5. Put the spreadsheet ID and service account credentials in `.env` (see §9).

---

## 8. Development Roadmap

**Phase 1 — Foundation (Week 1)**
- Bot scaffold, slash command registration, event loader
- Google Sheets auth + base repo classes (Ideas, Logs)
- `/idea add`, `/idea list`, logging pipeline working end-to-end

**Phase 2 — Ideas & Voting (Week 2)**
- Voting buttons, vote tallying, idea detail embeds, threads
- `/decide finalize` + `/decide reasoning`
- Idea archive flow

**Phase 3 — Development Tracking (Week 3–4)**
- Tasks: full CRUD, assignment, status transitions
- Milestones + progress calculation
- `/standup` command + Standups sheet

**Phase 4 — Automation (Week 5)**
- Cron-based daily/weekly digest
- Deadline reminder pings (DM or channel mention)
- `/log search` for quick audit lookups

**Phase 5 — Polish & Docs (Week 6)**
- Permission hardening, error-channel reporting, rate-limit-safe caching
- README + setup guide (good to include as an appendix in your grad project documentation)
- Optional: export-to-PDF/report command summarizing the whole project history from the Logs sheet (nice closing feature for your defense)

---

## 9. Environment Variables

```env
DISCORD_TOKEN=
DISCORD_CLIENT_ID=
DISCORD_GUILD_ID=

GOOGLE_SERVICE_ACCOUNT_EMAIL=
GOOGLE_PRIVATE_KEY=
GOOGLE_SHEET_ID=

LOG_CHANNEL_ID=
ERROR_CHANNEL_ID=
DIGEST_CHANNEL_ID=

LEAD_ROLE_ID=
ADMIN_ROLE_ID=
```

---

## 10. Key npm Packages

```json
{
  "dependencies": {
    "discord.js": "^14.x",
    "googleapis": "^140.x",
    "node-cron": "^3.x",
    "dotenv": "^16.x",
    "uuid": "^9.x"
  },
  "devDependencies": {
    "typescript": "^5.x",
    "@types/node": "^20.x",
    "tsx": "^4.x"
  }
}
```

---

## 11. Nice-to-have extensions (later)

- Export the `Logs` sheet to a timeline chart for your final report/presentation
- `/idea compare <id1> <id2>` — side-by-side embed
- Auto-tag ideas by tech stack and let members filter (`/idea list tech:NestJS`)
- Webhook bridge: GitHub repo pushes/PRs logged into the same `#bot-logs` + `Logs` sheet, unifying code activity with project-management activity
