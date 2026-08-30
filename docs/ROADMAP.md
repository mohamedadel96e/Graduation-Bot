# GradBot — 6-Month Production & Open-Source Roadmap

> **Timeline**: September 2026 → February 2027
> **Goal**: Transform GradBot from a graduation project into a production-grade, community-ready open-source Discord bot that any graduation team can adopt for project management.
> **Scope**: Graduation project management (not general-purpose PM tooling).

---

## Table of Contents

- [Current State Assessment](#current-state-assessment)
- [Design Decisions](#design-decisions)
- [Month 1 — Architecture Hardening & Code Quality](#month-1--architecture-hardening--code-quality-sep-2026)
- [Month 2 — Complete Core Features & Test Coverage](#month-2--complete-core-features--test-coverage-oct-2026)
- [Month 3 — Open-Source Infrastructure](#month-3--open-source-infrastructure-nov-2026)
- [Month 4 — Extensibility & Database Abstraction](#month-4--extensibility--database-abstraction-dec-2026)
- [Month 5 — Advanced Features & Observability](#month-5--advanced-features--observability-jan-2027)
- [Month 6 — Community, Performance & v1.0 Release](#month-6--community-performance--v10-release-feb-2027)
- [Learning Roadmap Summary](#learning-roadmap-summary)
- [Technology Additions by Month](#technology-additions-by-month)
- [Verification Plan](#verification-plan)

---

## Current State Assessment

### What's Working Well

- **Clean service architecture** — services depend on `TableStore<T>` interfaces, enabling zero-dependency unit testing via `MemoryTable`
- **Audit trail** — every action logged to both Google Sheets (`Logs` tab) and Discord `#bot-logs`
- **Unified design system** — centralized palette (`#778873`, `#A1BC98`, `#DCCFC0`, `#FDF6ED`), Unicode progress bars, consistent embeds
- **23 passing unit tests** covering all 5 service modules (`IdeaService`, `DecisionService`, `TaskService`, `MilestoneService`, `StandupService`)
- **Phases 1–3 implemented** — ideas, multi-criteria grading, decisions, tasks, milestones, standups

### Critical Issues to Address

| Issue | Risk | Impact |
|---|---|---|
| No caching for Google Sheets API | **HIGH** | Will hit 300 req/min limit with >3 concurrent users |
| Monolithic `bot.ts` (661 lines) | **HIGH** | Unmaintainable; blocks contributions |
| No retry/backoff on API failures | **HIGH** | Single network hiccup crashes operations |
| No env validation at startup | **MEDIUM** | Fails at runtime with cryptic errors |
| Permissions default to open if roles unconfigured | **MEDIUM** | Security hole — any user can finalize/delete |
| `dist/` out of sync with source | **MEDIUM** | `npm start` runs stale Phase 1/2 code |
| No CI/CD pipeline | **MEDIUM** | No automated quality gates |
| No LICENSE file | **HIGH** | Legally not open-source without one |
| 0% test coverage on commands, sheets layer, UI | **MEDIUM** | Regressions go undetected |
| No graceful shutdown handlers | **LOW** | Data loss possible on restart |

### Architecture Snapshot (Before)

```
src/
├── bot.ts                 # 661 lines — startup, events, modals, buttons, cron
├── index.ts               # Entry point + HTTP keep-alive
├── config.ts              # Raw process.env reads, no validation
├── permissions.ts         # Role check, defaults to ALLOW if unconfigured
├── types.ts               # All types, column mappings, interfaces
├── commands/
│   ├── idea.ts            # /idea add|list|view|archive|comment|leaderboard
│   ├── decide.ts          # /decide finalize|reasoning|status
│   ├── task.ts            # /task add|list|status|assign|delete
│   ├── milestone.ts       # /milestone add|list|progress
│   ├── standup.ts         # /standup (shows modal)
│   ├── index.ts           # Command aggregator
│   └── types.ts           # CommandContext, BotCommand interfaces
├── discord/
│   └── registerCommands.ts
├── events/                # EMPTY — all events inline in bot.ts
├── services/
│   ├── logger.ts          # DiscordLogger (channel embeds)
│   ├── idea-service.ts    # Idea business logic (fully tested)
│   ├── decision-service.ts
│   ├── task-service.ts
│   ├── milestone-service.ts
│   └── standup-service.ts
├── sheets/
│   ├── client.ts          # Google JWT auth
│   ├── sheet-table.ts     # Generic CRUD — NO caching, NO retries
│   ├── memory-table.ts    # In-memory test double
│   ├── ideas.repo.ts
│   ├── grades.repo.ts
│   ├── logs.repo.ts
│   ├── decision.repo.ts
│   ├── tasks.repo.ts
│   ├── milestones.repo.ts
│   └── standups.repo.ts
├── ui/
│   ├── design.ts          # Palette, progress bars, status helpers
│   ├── components/        # Button builders
│   ├── embeds/            # Embed builders (idea, decision, task, milestone)
│   └── modals/            # Modal builders (idea-add, grade, comment, task, milestone, standup)
└── tests/                 # 23 unit tests (services only)
```

---

## Design Decisions

These decisions were finalized before execution began and guide all implementation work:

| Decision | Choice | Rationale |
|---|---|---|
| **Database Strategy** | Sheets as default + SQLite as optional adapter, config toggle | Sheets is the unique selling point (zero-cost, no DB hosting). SQLite enables scale for larger teams. Both supported equally via `DATABASE_ADAPTER` env var. |
| **Package Distribution** | CLI scaffolder (`npx create-gradbot`) + standalone repo | Scaffolder maximizes adoption for new users. Standalone repo serves contributors and advanced users. |
| **Project Scope** | Graduation project management only | Focused on the unique needs of student teams: idea brainstorming, grading, decision tracking, milestones, standups, and academic reporting. |

---

## Month 1 — Architecture Hardening & Code Quality (Sep 2026)

> **Theme**: Make the codebase professional, maintainable, and safe to extend.
>
> **Skills you'll learn**: Event-driven architecture, separation of concerns, the mediator pattern, caching strategies, exponential backoff, the decorator pattern, runtime type validation, fail-fast patterns, process signal handling, security-by-default thinking, linting, git hooks, DX engineering.

---

### 1.1 Refactor Monolithic `bot.ts`

Break the 661-line monolith into focused modules:

| New Module | Responsibility | Est. Lines |
|---|---|---|
| `src/events/interactionCreate.ts` | Route slash commands, modals, buttons to handlers | ~80 |
| `src/events/ready.ts` | `ClientReady` handler, log bot online status | ~15 |
| `src/handlers/modal-handler.ts` | All modal submission handlers (idea add, grade, comment, task, milestone, standup) | ~200 |
| `src/handlers/button-handler.ts` | All button click handlers (grade, add comment, view comments) | ~60 |
| `src/cron/standup-digest.ts` | Daily standup cron job, extracted from bot.ts | ~40 |
| `src/bot.ts` | Slim orchestrator: create client, wire events, export `createGradBot()` | ~100 |

**Files to modify:**
- `src/bot.ts` — extract all handlers and event logic
- `src/events/interactionCreate.ts` — **NEW**
- `src/events/ready.ts` — **NEW**
- `src/handlers/modal-handler.ts` — **NEW**
- `src/handlers/button-handler.ts` — **NEW**
- `src/cron/standup-digest.ts` — **NEW**

**Acceptance criteria:**
- `bot.ts` is under 120 lines
- All existing functionality preserved
- `src/events/` directory is no longer empty
- Each handler file has a single responsibility

---

### 1.2 Environment Validation with Zod

**Files:**
- `src/config/schema.ts` — **NEW**: Zod schema defining all env vars with types, defaults, and descriptions
- `src/config.ts` — **MODIFY**: Replace raw `process.env` reads with Zod-parsed config

**Implementation details:**
- Define required vs optional env vars in the Zod schema
- Parse `GOOGLE_PRIVATE_KEY` newline escapes in a Zod `.transform()`
- Coerce channel/role IDs to strings with validation
- On validation failure: print a human-readable table of all missing/invalid vars, then `process.exit(1)`
- Export a strongly-typed `Config` object (not `Record<string, string>`)

**Example schema structure:**
```typescript
const envSchema = z.object({
  DISCORD_TOKEN: z.string().min(1, 'Discord bot token is required'),
  DISCORD_CLIENT_ID: z.string().min(1),
  DISCORD_GUILD_ID: z.string().min(1),
  GOOGLE_SERVICE_ACCOUNT_EMAIL: z.string().email().optional(),
  GOOGLE_PRIVATE_KEY: z.string().optional().transform(k => k?.replace(/\\n/g, '\n')),
  GOOGLE_SHEET_ID: z.string().optional(),
  DATABASE_ADAPTER: z.enum(['sheets', 'sqlite']).default('sheets'),
  LOG_CHANNEL_ID: z.string().optional(),
  ERROR_CHANNEL_ID: z.string().optional(),
  // ... etc
});
```

**Acceptance criteria:**
- App starts with intentionally missing `DISCORD_TOKEN` → clear error listing all missing vars
- App starts with all vars → typed `Config` object available everywhere
- `GOOGLE_*` vars only required when `DATABASE_ADAPTER=sheets`

---

### 1.3 Google Sheets Caching Layer

**Files:**
- `src/sheets/cached-table.ts` — **NEW**: `CachedTable<T>` decorator wrapping `GoogleSheetsTable<T>`
- `src/sheets/retry.ts` — **NEW**: Exponential backoff wrapper

**CachedTable implementation:**
- In-memory `Map<string, T[]>` cache per table
- Configurable TTL (default: 60 seconds)
- Write-through: on `append()`, `updateById()`, `deleteById()` — update cache immediately, then write to Sheets
- Background refresh: `setInterval` re-fetches from Sheets every TTL period
- Cache invalidation: manual `invalidate()` method for `/admin resync-sheets`
- Metrics: `cacheHits`, `cacheMisses`, `apiCalls` counters

**Retry implementation:**
- Wrap all `googleapis` calls with retry logic
- Handle: HTTP 429 (rate limit), 503 (service unavailable), `ECONNRESET`, `ETIMEDOUT`
- Exponential backoff: `baseDelay * 2^attempt` with jitter (±25%)
- Configurable: `maxRetries` (default 3), `baseDelay` (default 1000ms)
- Log each retry attempt with delay duration

**Acceptance criteria:**
- `/idea list` called 10x in 5 seconds → only 1 Sheets API call (9 cache hits)
- Simulated 429 error → retries 3 times with increasing delays → succeeds
- Cache stats accessible via a method call (for future `/admin stats`)

---

### 1.4 Fix Security & Correctness Issues

**Files to modify:**

**`src/permissions.ts`:**
- If no role IDs configured in `.env` → default to **DENY** (not allow)
- Add check for Discord native `Administrator` permission as fallback
- Add `isOwner()` check: guild owner always has access
- Add descriptive error message when permission is denied

**`src/ui/embeds/milestone.ts`:**
- Remove `⚠️` emoji on lines 52 and 84
- Replace with text label `(Past Due)` per the design system's "no emojis" rule

**`src/utils/graceful-shutdown.ts`** — **NEW:**
- Register handlers for `SIGTERM`, `SIGINT`, `uncaughtException`, `unhandledRejection`
- On shutdown signal:
  1. Log shutdown reason
  2. Stop cron jobs
  3. Flush pending cache writes to Sheets
  4. Destroy Discord client connection
  5. `process.exit(0)`
- On uncaught exception: log full stack trace, attempt graceful shutdown, then `process.exit(1)`

**Acceptance criteria:**
- No role IDs in `.env` → admin commands return "Permission denied" (not silently allowed)
- Guild owner can always use admin commands
- Kill process with `SIGTERM` → clean shutdown logged, no data loss
- Milestone embeds show no emojis

---

### 1.5 Developer Tooling Setup

**Files:**
- `.eslintrc.json` — **NEW**: ESLint config with `@typescript-eslint/recommended`, `no-explicit-any` as error
- `.prettierrc` — **NEW**: Prettier config (single quotes, trailing commas, 100 char line width)
- `.husky/pre-commit` — **NEW**: Run lint-staged on commit
- `.lintstagedrc` — **NEW**: Run ESLint + Prettier on staged `.ts` files
- `Makefile` — **NEW**: Unified development commands

**Makefile targets:**
```makefile
dev:        tsx watch src/index.ts
build:      tsc
test:       tsc -p tsconfig.test.json && node --test ...
lint:       eslint src/ --ext .ts
format:     prettier --write "src/**/*.ts"
typecheck:  tsc --noEmit
all:        lint typecheck build test
```

**`package.json` script updates:**
- Add `lint`, `format`, `lint:fix` scripts
- Add `prepare` script for Husky installation

**Acceptance criteria:**
- `npm run lint` passes with zero warnings on current codebase (after fixing `any` types)
- Committing a file with a `let x: any` → pre-commit hook blocks the commit
- `make all` runs the full quality pipeline in one command

---

### Month 1 Verification Checklist

- [ ] `bot.ts` is under 120 lines
- [ ] `src/events/` contains `interactionCreate.ts` and `ready.ts`
- [ ] `src/handlers/` contains `modal-handler.ts` and `button-handler.ts`
- [ ] `npm run lint` passes with zero warnings
- [ ] App starts with missing env var → clear, human-readable error message
- [ ] `/idea list` called 10x rapidly → only 1–2 Sheets API calls (cache hits)
- [ ] Process killed with `SIGTERM` → clean shutdown logged
- [ ] Milestone embeds show no emojis
- [ ] Permission denied when no role IDs configured
- [ ] All 23 existing tests still pass
- [ ] `make all` runs lint → typecheck → build → test successfully

---

## Month 2 — Complete Core Features & Test Coverage (Oct 2026)

> **Theme**: Finish the feature set and build confidence through comprehensive testing.
>
> **Skills you'll learn**: Cron scheduling patterns, notification systems, admin tooling, Discord pagination with components, test doubles (mocks, stubs, fakes), integration testing, snapshot testing, code coverage analysis, TDD, error hierarchies, operational vs programmer errors.

---

### 2.1 Complete Phase 4: Automation & Admin

#### Digest Service

**Files:**
- `src/services/digest-service.ts` — **NEW**
- `src/cron/digest.ts` — **NEW**: Cron job wiring

**Features:**
- Configurable daily/weekly digest posted to `DIGEST_CHANNEL_ID`
- Digest embed includes:
  - **Tasks due in next 3 days** (with assignee mentions)
  - **Overdue tasks** (past due date, not done)
  - **Blocked tasks** (status = `Blocked`)
  - **Milestone progress overview** (progress bars for each active milestone)
  - **Standup participation rate** (X of Y team members submitted yesterday)
- Schedule configurable via `Config` sheet tab or `DIGEST_HOUR` env var (default: `09:00` server time)
- Weekly digest adds: task completion rate, top contributors, milestone timeline

#### Reminder Service

**Files:**
- `src/services/reminder-service.ts` — **NEW**
- `src/cron/reminders.ts` — **NEW**: Cron job wiring

**Features:**
- Check tasks approaching due dates (configurable: 1 day, 3 days before)
- Mention assignee in `DIGEST_CHANNEL_ID` or send DM (configurable)
- Skip completed tasks
- Don't re-remind for the same task within 24 hours (deduplication)

#### Admin Commands

**Files:**
- `src/commands/admin.ts` — **NEW**

**Subcommands:**
- `/admin resync-sheets` — force cache invalidation and re-fetch all tables
- `/admin config <key> <value>` — update runtime config in the `Config` sheet tab
  - Supported keys: `digest_hour`, `reminder_days_before`, `digest_enabled`, `reminders_enabled`
- `/admin stats` — bot status embed:
  - Uptime
  - Cache hit/miss ratio
  - Total commands processed (since last restart)
  - Active ideas / tasks / milestones counts
  - Database adapter in use (Sheets or SQLite)

#### Log Search Command

**Files:**
- `src/commands/log.ts` — **NEW**

**Subcommands:**
- `/log search [action_type] [actor] [days]` — query audit logs with filters
- Results displayed in paginated embed (10 per page, forward/back buttons)
- Action type autocomplete from known action types

---

### 2.2 Comprehensive Test Suite

#### Integration Tests for Sheets Layer

**Files:**
- `src/tests/sheets/cached-table.test.ts` — **NEW**
- `src/tests/sheets/retry.test.ts` — **NEW**
- `src/tests/sheets/sheet-table.test.ts` — **NEW**

**Test cases:**
- CachedTable: cache hit, cache miss, cache invalidation on write, TTL expiry, manual invalidation
- Retry: successful retry after 429, max retries exceeded, non-retryable errors passed through
- SheetTable: `ensureHeaders()` adds missing columns, `findAll()` filters blank rows, `deleteById()` clears correct row

**Approach:** Mock `googleapis` responses using `node:test` built-in mocking (`mock.method()`)

#### Command Handler Tests

**Files:**
- `src/tests/commands/idea.test.ts` — **NEW**
- `src/tests/commands/task.test.ts` — **NEW**
- `src/tests/commands/decide.test.ts` — **NEW**
- `src/tests/commands/admin.test.ts` — **NEW**
- `src/tests/helpers/mock-interaction.ts` — **NEW**: Reusable mock Discord interaction builder

**Test cases per command:**
- Input validation (missing required fields, invalid values)
- Permission checks (allowed role vs denied role)
- Error handling (service throws → user sees friendly error)
- Happy path (valid input → correct service method called → correct embed response)

#### Permissions Tests

**Files:**
- `src/tests/permissions.test.ts` — **NEW**

**Test cases:**
- User with admin role → allowed
- User with lead role → allowed
- User with neither role + roles configured → denied
- No roles configured → denied (security default)
- Guild owner → always allowed

#### UI Tests

**Files:**
- `src/tests/ui/embeds.test.ts` — **NEW**
- `src/tests/ui/design.test.ts` — **NEW**

**Test cases:**
- Progress bar at boundary values: 0%, 1%, 25%, 50%, 75%, 99%, 100%
- Grade bar at boundary values: 1, 2, 3, 4, 5
- Embed field counts within Discord limits (≤25 fields)
- Embed description length within Discord limits (≤4096 chars)
- No emojis in any embed output (regex scan)

#### Code Coverage

**Setup:**
- Install `c8` for native V8 coverage
- Update `npm test` script to run with `c8`
- Coverage thresholds: 80% lines, 75% branches
- Add coverage report to CI output

**Target: 80%+ line coverage, 60+ total tests**

---

### 2.3 Error Handling Strategy

**Files:**
- `src/errors/index.ts` — **NEW**: Custom error hierarchy

**Error classes:**
```
AppError (base class)
├── SheetError         — Google Sheets connection/read/write failures
├── ValidationError    — Invalid user input (bad date format, out-of-range values)
├── PermissionError    — Unauthorized action
├── NotFoundError      — Idea/task/milestone not found by ID
└── RateLimitError     — Google API quota exceeded
```

**Changes to existing code:**
- Replace all `catch (err: any)` with typed error handling
- Map error types to user-friendly Discord responses:
  - `ValidationError` → ephemeral reply with the validation message
  - `PermissionError` → ephemeral reply "You don't have permission to do this"
  - `NotFoundError` → ephemeral reply "Item not found"
  - `SheetError` / `RateLimitError` → ephemeral reply "Something went wrong, try again" + full stack trace to `#bot-errors`
  - Unknown errors → generic message + full log to `#bot-errors`

**Acceptance criteria:**
- Zero `catch (err: any)` remaining in codebase
- Zero `any` types remaining in codebase (enforced by ESLint rule)
- Every error path tested

---

### Month 2 Verification Checklist

- [ ] `/digest now` posts a working summary embed with tasks, milestones, standups
- [ ] Deadline reminders mention the correct assignees
- [ ] `/admin resync-sheets` clears cache and re-fetches
- [ ] `/admin config digest_hour 9` updates the Config sheet
- [ ] `/admin stats` shows uptime, cache stats, command counts
- [ ] `/log search` returns paginated results with forward/back navigation
- [ ] Test suite: 60+ tests
- [ ] Code coverage: 80%+ lines
- [ ] Zero `any` types in codebase
- [ ] All error paths return user-friendly messages

---

## Month 3 — Open-Source Infrastructure (Nov 2026)

> **Theme**: Make GradBot a project people want to use and contribute to.
>
> **Skills you'll learn**: Open-source licensing, community governance, semantic versioning, conventional commits, CI/CD pipelines, GitHub Actions, automated releases, Docker containerization, multi-stage builds, container security, docker-compose, technical writing, developer marketing, documentation-driven development.

---

### 3.1 OSS Essential Files

| File | Purpose |
|---|---|
| `LICENSE` — **NEW** | MIT License (most permissive, highest adoption for bots) |
| `CODE_OF_CONDUCT.md` — **NEW** | Contributor Covenant v2.1 |
| `SECURITY.md` — **NEW** | Security policy: how to report vulnerabilities, supported versions |
| `CHANGELOG.md` — **NEW** | Track all notable changes, generated via conventional commits |

**Conventional Commits adoption:**
- Install `commitlint` + `@commitlint/config-conventional`
- Add Husky `commit-msg` hook to enforce format
- Commit types: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`, `perf:`
- Install `standard-version` or `release-please` for automated changelog and version bumps

**`package.json` updates:**
```json
{
  "name": "gradbot",
  "description": "A Discord bot for managing graduation project teams — ideas, grading, decisions, tasks, milestones, and standups, powered by Google Sheets.",
  "keywords": ["discord", "bot", "graduation", "project-management", "google-sheets"],
  "author": "Mohamed Adel",
  "license": "MIT",
  "engines": { "node": ">=20" },
  "files": ["dist/", "README.md", "LICENSE"]
}
```

---

### 3.2 GitHub Repository Polish

#### Issue Templates

**Files:**
- `.github/ISSUE_TEMPLATE/bug_report.yml` — **NEW**
  - Fields: description, steps to reproduce, expected vs actual behavior, environment (Node version, OS, database adapter), logs/screenshots
- `.github/ISSUE_TEMPLATE/feature_request.yml` — **NEW**
  - Fields: use case description, proposed solution, alternatives considered, willingness to implement
- `.github/ISSUE_TEMPLATE/config.yml` — **NEW**
  - Template chooser with links to Discussions for questions

#### Pull Request Template

**File:** `.github/PULL_REQUEST_TEMPLATE.md` — **NEW**

Checklist:
- [ ] Tests added/updated
- [ ] `npm run lint` passes
- [ ] `npm run typecheck` passes
- [ ] `npm test` passes
- [ ] Documentation updated (if applicable)
- [ ] Screenshots attached (for UI changes)
- [ ] Linked to issue #___

#### CI Pipeline

**File:** `.github/workflows/ci.yml` — **NEW**

```yaml
name: CI
on: [push, pull_request]
jobs:
  quality:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [20, 22]
    steps:
      - Checkout
      - Setup Node ${{ matrix.node-version }}
      - npm ci
      - npm run lint
      - npm run typecheck
      - npm run build
      - npm test (with coverage)
      - Upload coverage to Codecov
```

#### Automated Release Pipeline

**File:** `.github/workflows/release.yml` — **NEW**

Triggered on version tag push (`v*`):
1. Build and test
2. Generate changelog from conventional commits
3. Create GitHub Release with changelog body
4. Optionally publish to npm

#### Optional

**File:** `.github/FUNDING.yml` — **NEW** (link to GitHub Sponsors / Buy Me a Coffee)

---

### 3.3 Professional README Rewrite

**File:** `README.md` — **REWRITE**

**Structure:**
1. **Hero section** — project logo/banner, one-line description, badges row
   - Badges: CI status, npm version, license, codecov percentage, Node version, Discord server invite
2. **"Why GradBot?"** — 3–4 bullet value propositions for graduation teams
3. **Feature showcase** — table or grid with screenshots/GIFs of:
   - Idea submission modal
   - Grading with progress bars
   - Task management
   - Milestone tracking
   - Daily standup digest
4. **Quick Start** — 5 steps from zero to running bot:
   1. Clone the repo
   2. `npm install`
   3. Create Discord bot + get token
   4. Set up Google Sheets (or use SQLite)
   5. `npm run dev`
5. **Configuration Reference** — full table of all env vars with types, defaults, and descriptions
6. **Command Reference** — all slash commands grouped by category
7. **Architecture Overview** — Mermaid diagram showing data flow
8. **Deployment Guide** — quick notes for Railway, Render, Docker
9. **Contributing** — link to `CONTRIBUTING.md`
10. **License**

#### CONTRIBUTING.md Rewrite

**File:** `CONTRIBUTING.md` — **REWRITE** (renamed from `contribution.md`)

**Additions:**
- How to get a test Discord bot token (step-by-step)
- How to set up a test Google Sheet
- Architecture walkthrough for new contributors
- "Good first issues" guidance
- Code style guide (references ESLint/Prettier config)
- How to write tests for your changes
- PR review process and response time expectations

---

### 3.4 Docker Support

**Files:**
- `Dockerfile` — **NEW**: Multi-stage build
- `docker-compose.yml` — **NEW**: Service definition
- `.dockerignore` — **NEW**: Exclude node_modules, .env, .git, dist, tests

**Dockerfile (multi-stage):**
```dockerfile
# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src/ ./src/
RUN npm run build

# Stage 2: Production
FROM node:20-alpine
RUN addgroup -S gradbot && adduser -S gradbot -G gradbot
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY --from=builder /app/dist ./dist
USER gradbot
HEALTHCHECK CMD node -e "require('http').get('http://localhost:3000', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"
CMD ["node", "dist/index.js"]
```

**docker-compose.yml:**
```yaml
services:
  gradbot:
    build: .
    env_file: .env
    restart: unless-stopped
    ports:
      - "3000:3000"
```

**Target image size:** < 100MB

---

### Month 3 Verification Checklist

- [ ] `LICENSE`, `CODE_OF_CONDUCT.md`, `SECURITY.md` files exist
- [ ] `CHANGELOG.md` has at least one release entry
- [ ] Conventional commit hook rejects `added a thing` but accepts `feat: add idea export`
- [ ] GitHub Actions CI runs on every PR: lint → typecheck → build → test → coverage
- [ ] README has badges, screenshots, architecture diagram, full command reference
- [ ] `CONTRIBUTING.md` has development setup walkthrough
- [ ] `docker build -t gradbot .` succeeds
- [ ] `docker run --env-file .env gradbot` starts the bot
- [ ] Docker image is under 100MB
- [ ] First automated GitHub Release created via tag push

---

## Month 4 — Extensibility & Database Abstraction (Dec 2026)

> **Theme**: Make GradBot adaptable to different teams' needs and scalable beyond Google Sheets.
>
> **Skills you'll learn**: Adapter pattern, database abstraction, SQLite, database migrations, factory pattern, SOLID principles (Dependency Inversion), plugin architecture, dynamic module loading, lifecycle management, webhook handling, internationalization, locale management, layered configuration.

---

### 4.1 Database Adapter Pattern

**Design:**

Both Google Sheets and SQLite implement the same `DatabaseAdapter` interface. The bot selects the adapter at startup based on `DATABASE_ADAPTER` env var. All repositories receive the adapter via dependency injection — they never know which backend is in use.

**Files:**
- `src/database/adapter.ts` — **NEW**: `DatabaseAdapter` interface
- `src/database/sheets-adapter.ts` — **NEW**: Wraps `CachedTable<T>` + `GoogleSheetsTable<T>`
- `src/database/sqlite-adapter.ts` — **NEW**: SQLite via `better-sqlite3`
- `src/database/factory.ts` — **NEW**: Factory to instantiate adapter from config
- `src/database/migrations/` — **NEW**: SQLite schema migration files

**`DatabaseAdapter` interface:**
```typescript
interface DatabaseAdapter {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  healthCheck(): Promise<{ ok: boolean; latencyMs: number }>;
  getTable<T>(name: string, columns: string[]): TableStore<T>;
  transaction<R>(fn: () => Promise<R>): Promise<R>;
}
```

**SQLite adapter details:**
- Auto-creates database file at `./data/gradbot.db` on first run
- Schema migration system using SQLite's `PRAGMA user_version`
- Proper indexes on: `ideas.status`, `tasks.status`, `tasks.milestone_id`, `grades.idea_id`, `votes.idea_id`, `logs.action_type`, `logs.actor_id`
- Transaction support for atomic multi-table operations
- WAL mode for better concurrent read performance

**Sheets adapter details:**
- Wraps existing `CachedTable` + `GoogleSheetsTable` behind the `DatabaseAdapter` interface
- Adds batch write support using `spreadsheets.values.batchUpdate`
- `transaction()` implemented as best-effort (Sheets doesn't support true transactions)

**Config changes:**
```env
DATABASE_ADAPTER=sheets    # or 'sqlite'
SQLITE_PATH=./data/gradbot.db  # only used when adapter=sqlite
```

**Acceptance criteria:**
- Bot runs with `DATABASE_ADAPTER=sqlite` using zero Google credentials
- Bot runs with `DATABASE_ADAPTER=sheets` with existing behavior preserved
- SQLite database auto-creates tables and indexes on first run
- All 60+ tests pass with both adapters (parameterized test suite)

---

### 4.2 Plugin / Extension System

**Files:**
- `src/plugins/types.ts` — **NEW**: Plugin interfaces
- `src/plugins/plugin-manager.ts` — **NEW**: Plugin lifecycle manager
- `src/plugins/plugin-context.ts` — **NEW**: Sandboxed context passed to plugins

**Plugin interface:**
```typescript
interface GradBotPlugin {
  name: string;
  version: string;
  description: string;
  commands?: BotCommand[];
  events?: EventHandler[];
  cronJobs?: CronJob[];
  onLoad(context: PluginContext): Promise<void>;
  onUnload(): Promise<void>;
}

interface PluginContext {
  database: DatabaseAdapter;
  logger: DiscordLogger;
  config: Config;
  registerCommand(command: BotCommand): void;
  registerEvent(event: EventHandler): void;
}
```

**Plugin discovery:**
- Scan `plugins/` directory at startup for directories containing `index.ts` (or compiled `index.js`)
- Each plugin directory is a self-contained module
- Plugins can be enabled/disabled via config

**Error isolation:**
- Plugin errors are caught and logged — they don't crash the bot
- Plugin `onLoad` failures are logged to `#bot-errors`; bot continues without the plugin

#### Example Plugin: GitHub Integration

**Files:**
- `plugins/github-integration/index.ts` — **NEW**
- `plugins/github-integration/webhook-handler.ts` — **NEW**
- `plugins/github-integration/embeds.ts` — **NEW**

**Features:**
- Express route: `POST /webhooks/github` receives GitHub webhook events
- Supported events: `push`, `pull_request.opened`, `pull_request.merged`, `issues.opened`, `issues.closed`
- Posts styled embeds to `#bot-logs`
- Logs events to the `Logs` sheet (action types: `github.push`, `github.pr_opened`, etc.)
- Unifies code activity with project management activity

**Acceptance criteria:**
- GitHub integration plugin loads successfully at startup
- Test webhook POST → embed appears in `#bot-logs`
- Plugin error doesn't crash the bot
- Disabling plugin via config → no webhook routes registered

---

### 4.3 Internationalization (i18n)

**Files:**
- `src/i18n/loader.ts` — **NEW**: Locale loader and translation function
- `src/i18n/en.json` — **NEW**: English strings (extracted from all commands, embeds, modals)
- `src/i18n/ar.json` — **NEW**: Arabic translation

**Implementation:**
- Extract all user-facing strings from commands, embeds, modals, and error messages
- Provide `t(key, params?)` function:
  - `t('idea.created', { title: 'AI Tutor' })` → `"Idea 'AI Tutor' created successfully"`
  - `t('error.not_found', { type: 'task', id: 'abc123' })` → `"Task abc123 not found"`
- Locale selected via `LOCALE` env var (default: `en`)
- Nested key support: `t('commands.idea.add.success')`
- Missing key fallback: return the key itself + log warning

**Arabic translation notes:**
- Discord supports RTL text natively in embeds
- Translate command descriptions (shown in Discord's slash command picker)
- Translate modal titles and labels
- Keep technical terms (IDs, status values) in English

**Acceptance criteria:**
- `LOCALE=en` → all messages in English
- `LOCALE=ar` → all messages in Arabic
- Missing translation key → falls back to key name + warning log
- At least 50% of strings translated to Arabic

---

### 4.4 Layered Configuration System

**Files:**
- `src/config/config-manager.ts` — **NEW**

**Configuration layers (highest priority first):**
1. Environment variables (`.env`)
2. `Config` sheet tab / SQLite config table (runtime-changeable)
3. Default values in Zod schema

**Runtime-changeable settings:**
- `digest_hour` — hour to post daily digest (0–23)
- `digest_enabled` — enable/disable daily digest (true/false)
- `reminder_days_before` — days before due date to send reminder (comma-separated: `1,3`)
- `reminders_enabled` — enable/disable reminders (true/false)
- `locale` — bot language (en/ar)

**Audit logging:**
- Every config change logged to `Logs` sheet with before/after values

**Acceptance criteria:**
- `/admin config digest_hour 9` → updates config, takes effect on next cron tick
- Environment variable overrides sheet-based config
- Config changes are audit-logged

---

### Month 4 Verification Checklist

- [ ] Bot runs with `DATABASE_ADAPTER=sqlite` — zero Google credentials needed
- [ ] Bot runs with `DATABASE_ADAPTER=sheets` — existing behavior preserved
- [ ] SQLite database auto-creates tables on first run
- [ ] Switching adapter requires only changing one env var
- [ ] All tests pass with both database adapters
- [ ] GitHub integration plugin loads and handles test webhooks
- [ ] Plugin with intentional error → bot stays running, error logged
- [ ] `LOCALE=ar` → Arabic messages in Discord embeds
- [ ] `/admin config` updates take effect without restart
- [ ] Config changes appear in audit log

---

## Month 5 — Advanced Features & Observability (Jan 2027)

> **Theme**: Add the features that make GradBot genuinely useful and operationally mature.
>
> **Skills you'll learn**: REST API design, OAuth2 authentication flow, data visualization, full-stack development, Express.js middleware, document generation, PDF rendering, data aggregation, application observability, structured logging, metrics collection, health checks, alerting, Discord.js advanced components, collector patterns, autocomplete handlers, context menu commands.

---

### 5.1 Web Dashboard

**Files:**
- `src/dashboard/server.ts` — **NEW**: Express.js server
- `src/dashboard/routes/api.ts` — **NEW**: REST API endpoints
- `src/dashboard/routes/auth.ts` — **NEW**: Discord OAuth2 login flow
- `src/dashboard/middleware/auth.ts` — **NEW**: JWT session validation
- `src/dashboard/public/` — **NEW**: Static frontend files (HTML, CSS, JS)

**REST API endpoints:**
| Method | Path | Description |
|---|---|---|
| `GET` | `/api/ideas` | List ideas with grades and status filter |
| `GET` | `/api/ideas/:id` | Single idea detail with comments |
| `GET` | `/api/tasks` | List tasks with assignee/status/milestone filters |
| `GET` | `/api/milestones` | Milestone list with progress |
| `GET` | `/api/standups` | Standup history with date range filter |
| `GET` | `/api/stats` | Team statistics summary |
| `GET` | `/api/logs` | Audit log feed with pagination |
| `GET` | `/auth/discord` | Initiate Discord OAuth2 flow |
| `GET` | `/auth/discord/callback` | Handle OAuth2 callback |
| `GET` | `/auth/me` | Current user info |

**Authentication:**
- Discord OAuth2: users log in with their Discord account
- Verify the user is a member of the configured guild
- JWT session tokens (httpOnly cookie)
- Role-based access: admins see all data, members see their own tasks

**Frontend dashboard pages:**
- **Overview**: Key metrics — active ideas, open tasks, milestone progress, team activity
- **Ideas**: Leaderboard with grade visualizations (bar charts)
- **Tasks**: Kanban board view (Todo → In Progress → Done columns)
- **Milestones**: Timeline/Gantt chart showing milestone dates and progress
- **Team**: Contribution heatmap, standup participation tracker
- **Logs**: Searchable, filterable audit log feed

**Acceptance criteria:**
- Dashboard accessible at `http://localhost:3001` (configurable port)
- Discord OAuth login works, shows user's avatar and name
- Data matches what's shown in Discord bot commands
- Dashboard is read-only (no mutations via web UI — Discord is the source of truth)

---

### 5.2 Reporting & Export

**Files:**
- `src/services/report-service.ts` — **NEW**
- `src/commands/report.ts` — **NEW**

**`/report generate [format]` command:**

Generates a comprehensive project report containing:
1. **Project Overview** — chosen idea, decision rationale, team members
2. **Timeline** — from first idea submission to current milestone
3. **Idea Phase Summary** — total ideas submitted, grading distribution, final scores
4. **Task Analytics** — completion rate, average time-to-complete, tasks by priority
5. **Milestone Progress** — each milestone with status, target vs actual dates
6. **Team Contributions** — tasks per member, standups submitted, grades given
7. **Activity Timeline** — key events in chronological order (from Logs)

**Export formats:**
- `markdown` — Markdown file attached to Discord message (for GitHub wiki / README)
- `json` — JSON data export (for external tools / data portability)
- `pdf` — PDF document via `pdfkit` (for academic submission / graduation defense)

**`/report schedule [weekly|monthly]` subcommand:**
- Automated periodic reports posted to a configured channel

**Acceptance criteria:**
- `/report generate markdown` → Markdown file attached to Discord reply
- `/report generate pdf` → PDF file attached to Discord reply
- Report contains all 7 sections with real data
- Useful for graduation project defense documentation

---

### 5.3 Observability & Monitoring

**Files:**
- `src/monitoring/metrics.ts` — **NEW**: Metrics collection
- `src/monitoring/health.ts` — **NEW**: Health check endpoint
- `src/monitoring/alerts.ts` — **NEW**: Alerting rules

**Metrics collection:**
| Metric | Type | Description |
|---|---|---|
| `commands_total` | Counter | Total commands processed, labeled by command name |
| `command_duration_ms` | Histogram | Response time per command |
| `cache_hits_total` | Counter | Sheets cache hits |
| `cache_misses_total` | Counter | Sheets cache misses |
| `sheets_api_calls_total` | Counter | Total Sheets API calls, labeled by operation |
| `sheets_api_errors_total` | Counter | Sheets API errors, labeled by error code |
| `active_users_daily` | Gauge | Unique users who ran a command today |

**Health endpoint:**
`GET /health` returns:
```json
{
  "status": "healthy",
  "uptime_seconds": 86400,
  "database": { "adapter": "sheets", "ok": true, "latency_ms": 45 },
  "cache": { "hit_rate": 0.92, "entries": 156 },
  "discord": { "connected": true, "guilds": 1 },
  "last_command_at": "2027-01-15T14:30:00Z"
}
```

**Structured logging (replace console.log/error):**
- Install `pino` logger
- JSON-formatted logs in production, pretty-printed in development
- Log levels: `debug`, `info`, `warn`, `error`, `fatal`
- Every log entry includes: timestamp, level, module, message, optional metadata
- Request correlation: each command execution gets a unique `requestId`

**Alerting rules:**
- Sheets API error rate > 5% in 5 minutes → warn in `#bot-errors`
- No commands processed in 2 hours during active hours → heartbeat alert
- Cache hit rate < 50% → warn (possible cache invalidation bug)

**Acceptance criteria:**
- `GET /health` returns structured JSON with all subsystem statuses
- All `console.log` / `console.error` replaced with `pino` logger
- Logs are JSON in production, pretty in development
- `/admin stats` shows live metrics
- Alert posted to `#bot-errors` when simulating high error rate

---

### 5.4 Advanced Discord Features

#### Pagination System

**Files:**
- `src/ui/components/paginator.ts` — **NEW**: Reusable paginator

**Features:**
- Composable: any list command can use it
- Button row: `◀ First` `◁ Prev` `Page 2/5` `Next ▷` `Last ▶`
- Configurable items per page (default: 10)
- Collector-based with 5-minute timeout → buttons auto-disabled
- Applied to: `/idea list`, `/idea leaderboard`, `/task list`, `/milestone list`, `/log search`

#### Autocomplete

**Files:**
- Update `src/commands/idea.ts`, `task.ts`, `milestone.ts` to add autocomplete handlers

**Autocomplete targets:**
- `/idea view <id>` → shows matching idea titles as user types
- `/idea archive <id>` → shows active idea titles
- `/task status <id>` → shows task titles
- `/task assign <id>` → shows task titles
- `/milestone progress <id>` → shows milestone names

#### Context Menu Commands

**Files:**
- `src/commands/context-menus/view-user-tasks.ts` — **NEW**
- `src/commands/context-menus/create-task-from-message.ts` — **NEW**

**Commands:**
- Right-click a user → "View their tasks" → shows filtered task list
- Right-click a message → "Create task from this" → opens task modal pre-filled with message content

---

### Month 5 Verification Checklist

- [ ] Dashboard accessible at configured port with Discord OAuth login
- [ ] Dashboard displays live data (ideas, tasks, milestones, standups, logs)
- [ ] `/report generate markdown` produces a complete project summary
- [ ] `/report generate pdf` produces a formatted PDF document
- [ ] `GET /health` returns structured bot status with all subsystems
- [ ] All logs output as structured JSON in production mode
- [ ] Pagination works on `/idea list`, `/task list`, `/log search`
- [ ] Autocomplete suggests idea/task/milestone titles as user types
- [ ] Right-click user → "View their tasks" shows correct results
- [ ] `/admin stats` shows live metrics (cache hit rate, command count, uptime)

---

## Month 6 — Community, Performance & v1.0 Release (Feb 2027)

> **Theme**: Polish everything, optimize performance, launch publicly.
>
> **Skills you'll learn**: Performance profiling, benchmarking, load testing, optimization techniques, application security, input validation, rate limiting, dependency security, static site generators, documentation-as-code, API documentation, CLI tool development, project scaffolding, npm publishing, release management, developer advocacy, technical writing, community building.

---

### 6.1 Performance Optimization

#### Sheets API Optimization
- **Batch reads**: Use `spreadsheets.values.batchGet` for multi-tab queries (e.g., idea + grades + comments in one API call)
- **Batch writes**: Use `spreadsheets.values.batchUpdate` for multi-row updates
- **Connection keep-alive** and HTTP/2 for Google API calls
- **Pre-warm caches** on startup: fetch all tables into cache before accepting commands

#### Bot Response Time
- Profile interaction → response pipeline, identify bottlenecks
- Target: < 200ms p95 for cached reads, < 1s p95 for Sheets writes
- Add command cooldowns: prevent same user from running same command more than 3x in 10 seconds

#### Load Testing
- Write a load test script simulating 20 concurrent users submitting commands
- Document performance characteristics:
  - Max concurrent users supported
  - Response time at various load levels
  - Sheets API quota consumption rate
- Identify and fix bottlenecks

**Acceptance criteria:**
- Cached reads respond in < 200ms (p95)
- Sheets writes respond in < 1s (p95)
- Bot handles 20 concurrent command submissions without errors
- Performance characteristics documented in `docs/performance.md`

---

### 6.2 Security Hardening

**Files:**
- `src/security/sanitize.ts` — **NEW**: Input sanitization
- `src/security/rate-limit.ts` — **NEW**: Per-user command rate limiting

**Input sanitization:**
- Prevent Discord markdown injection (`@everyone`, `@here`, mass mentions)
- Strip potentially dangerous characters from user inputs before storing
- Validate all string lengths against Discord embed limits before sending

**Rate limiting:**
- Per-user, per-command rate limits (configurable)
- Default: 5 commands per 30 seconds per user
- Admin commands: 2 per 30 seconds
- Rate limit exceeded → ephemeral message with cooldown time

**Dependency security:**
- Add `npm audit` step to CI pipeline
- Add Dependabot or Renovate for automated dependency updates
- Pin all dependency versions (remove `^` prefixes) for reproducible builds

**Secret rotation guide:**
- Document in `docs/security.md`: how to rotate Discord token, Google service account key
- Document: what to do if a secret is leaked

**Acceptance criteria:**
- User input with `@everyone` → sanitized before storage
- Spamming `/idea list` 10x in 5 seconds → rate limit message on 6th call
- `npm audit` runs in CI and fails on critical vulnerabilities
- Security documentation exists in `docs/security.md`

---

### 6.3 Documentation Site

**Files:**
- `docs/` — documentation content (Markdown files)
- `docs/.vitepress/config.ts` — **NEW**: VitePress site configuration

**Documentation site sections:**

| Section | Content |
|---|---|
| **Getting Started** | 5-minute quickstart: clone → configure → run |
| **Configuration Guide** | All env vars explained with types, defaults, examples |
| **Command Reference** | Every slash command with description, parameters, examples, screenshots |
| **Architecture Guide** | System design, data flow diagrams, extension points, Mermaid diagrams |
| **Database Adapters** | Sheets vs SQLite comparison, how to add a new adapter |
| **Plugin Development** | How to write custom plugins with full example |
| **Dashboard** | Setup, OAuth configuration, available pages |
| **API Reference** | REST API docs for dashboard endpoints |
| **Deployment Guide** | Railway, Render, VPS, Docker, Raspberry Pi — step-by-step |
| **i18n Guide** | How to add a new language |
| **Security** | Secret management, rotation, threat model |
| **Performance** | Benchmarks, tuning, scaling guide |
| **FAQ & Troubleshooting** | Common setup issues and solutions |
| **Contributing** | Development setup, architecture, code style, PR process |
| **Changelog** | Release history |

**Deployment:** GitHub Pages via GitHub Actions (auto-deploy on push to `main`)

**Acceptance criteria:**
- Documentation site live at `https://mohamedadel96e.github.io/Graduation-Bot/`
- All sections have content (not placeholders)
- Search works across all pages
- Mobile-responsive

---

### 6.4 CLI Scaffolder (`create-gradbot`)

**Files:**
- `packages/create-gradbot/` — **NEW**: Separate npm package
- `packages/create-gradbot/src/index.ts` — CLI entry point
- `packages/create-gradbot/templates/` — Project templates

**Usage:**
```bash
npx create-gradbot my-team-bot
```

**Interactive prompts:**
1. Bot name (default: directory name)
2. Database choice: `Google Sheets` / `SQLite` / `Both`
3. Features to enable: `☑ Ideas`, `☑ Tasks`, `☑ Milestones`, `☑ Standups`, `☐ Dashboard`, `☐ GitHub Integration`
4. Language: `English` / `Arabic`
5. Deploy target: `Docker` / `Railway` / `Render` / `Manual`

**Output:**
- Pre-configured project with only selected features
- `.env.example` with only relevant variables
- `README.md` with personalized setup instructions
- `Dockerfile` (if Docker deployment selected)
- `railway.json` / `render.yaml` (if platform selected)

**Acceptance criteria:**
- `npx create-gradbot test-bot` → generates a working project
- Generated project starts with `npm run dev` (after filling `.env`)
- Only selected features are included (no dead code)
- Generated README has correct setup instructions for chosen database

---

### 6.5 v1.0 Release

#### Pre-Release Checklist
- [ ] All features documented on documentation site
- [ ] All tests passing: **150+ tests, 85%+ coverage**
- [ ] Zero `any` types in codebase
- [ ] ESLint zero warnings
- [ ] `npm audit` zero critical vulnerabilities
- [ ] Performance benchmarks documented
- [ ] Security review completed
- [ ] `CHANGELOG.md` up to date with all changes since inception
- [ ] Migration guide written (for any pre-1.0 users)
- [ ] README has badges, screenshots, full command reference
- [ ] Docker image builds and runs successfully
- [ ] Documentation site deployed and searchable

#### Release Steps
1. Tag `v1.0.0` on `main` branch
2. GitHub Actions creates GitHub Release with full changelog
3. `npm publish gradbot` — main package
4. `npm publish create-gradbot` — CLI scaffolder
5. Documentation site auto-deploys with release notes

#### Post-Release
- [ ] Set up GitHub Discussions for community Q&A
- [ ] Label 5+ issues as "good first issue" for new contributors
- [ ] Write a Dev.to / Hashnode blog post about the journey (portfolio piece)
- [ ] Record a 5-minute demo video for the README
- [ ] Post announcement to:
  - Reddit: r/discordapp, r/discord_bots, r/learnprogramming
  - Discord bot list sites
  - University tech communities
  - Twitter/X with demo GIF

---

## Learning Roadmap Summary

Each month targets specific engineering skills that will serve you throughout your career:

| Month | Engineering Skills | Technologies |
|---|---|---|
| **1 — Architecture** | Refactoring, SoC, decorator pattern, fail-fast, caching, exponential backoff | Zod, ESLint, Prettier, Husky |
| **2 — Testing** | TDD, test doubles, integration testing, coverage analysis, error hierarchies | c8, pino |
| **3 — OSS & DevOps** | CI/CD, Docker, semantic versioning, conventional commits, technical writing | GitHub Actions, Docker, standard-version |
| **4 — Extensibility** | Adapter pattern, DI, SOLID, plugin architecture, i18n | better-sqlite3 |
| **5 — Full-Stack** | REST APIs, OAuth2, data viz, observability, structured logging | Express.js, passport-discord, pdfkit |
| **6 — Release Engineering** | Performance profiling, security hardening, npm publishing, community building | VitePress, autocannon |

---

## Technology Additions by Month

| Month | New Dependencies | Purpose |
|---|---|---|
| 1 | `zod`, `eslint`, `prettier`, `husky`, `lint-staged` | Validation, code quality |
| 2 | `c8`, `pino` | Coverage, structured logging |
| 3 | `standard-version` or `release-please`, `commitlint` | Automated releases, commit format |
| 4 | `better-sqlite3`, `@types/better-sqlite3` | SQLite adapter |
| 5 | `express`, `passport-discord`, `pdfkit`, `jsonwebtoken` | Dashboard, reports, auth |
| 6 | `vitepress`, `autocannon`, `inquirer` | Docs site, load testing, CLI |

---

## Verification Plan

### Automated Tests (every month)
```bash
npm run lint          # ESLint check
npm run typecheck     # tsc --noEmit
npm run build         # Full compilation
npm test              # Unit + integration tests with coverage
```

### CI Pipeline (from Month 3 onward)
- **Every PR**: lint → typecheck → build → test → coverage report → npm audit
- **Every merge to main**: build + tag pre-release
- **Every version tag**: full release pipeline (changelog, GitHub Release, npm publish)

### Manual Verification
- Monthly: deploy to a test Discord server and exercise all commands
- Monthly: review Google Sheets API usage in Google Cloud Console
- Pre-release: full walkthrough of setup guide on a clean machine
- Pre-release: test Docker deployment from scratch

---

## Estimated Effort

This plan is designed for **~10–15 hours/week** of focused work.

Each month builds on the previous one, so the order matters. However, each month also delivers **standalone value**:

- After **Month 1**: You have a well-structured, professional codebase
- After **Month 2**: You have a fully-featured bot with comprehensive tests
- After **Month 3**: You have a proper open-source project others can contribute to
- After **Month 4**: You have a extensible platform that supports multiple databases
- After **Month 5**: You have a full-stack application with a web dashboard
- After **Month 6**: You have a published npm package and a community-ready project

If you finish a month early, pull items from the next month forward. If you fall behind, you can ship at the end of any month and still have a great project.

---

## Final State

By February 2027, GradBot will be:

- **150+ automated tests** with 85%+ code coverage
- **2 database adapters** (Google Sheets + SQLite) with config toggle
- **Plugin system** with GitHub integration example
- **Web dashboard** with Discord OAuth and data visualization
- **Report generator** with Markdown, JSON, and PDF export
- **Full observability**: structured logging, metrics, health checks, alerting
- **Docker support** with multi-stage builds
- **CI/CD pipeline** with automated releases
- **Documentation site** with full guides and API reference
- **CLI scaffolder** (`npx create-gradbot`) for instant project setup
- **i18n support** (English + Arabic)
- **Published on npm** as `gradbot` and `create-gradbot`
- **Community-ready** GitHub repository with issues, discussions, and contributor guides

This is a **portfolio-grade project** that demonstrates professional software engineering practices across architecture, testing, DevOps, full-stack development, security, and open-source governance.
