# GradBot — Complete Developer Documentation

> This document is the definitive developer reference for **GradBot**, a Discord bot that helps graduation project teams brainstorm, grade, discuss, and finalize their project ideas. It is written in a brainstorming, conversational style so that any developer — even someone who has never seen the codebase — can understand every detail and confidently modify any functionality.

---

## Table of Contents

1. [The Big Picture](#1-the-big-picture)
2. [Project Structure — The File Tree](#2-project-structure--the-file-tree)
3. [Technology Stack](#3-technology-stack)
4. [Environment Configuration](#4-environment-configuration)
5. [Entry Point — How the Bot Starts](#5-entry-point--how-the-bot-starts)
6. [The Brain — `bot.ts`](#6-the-brain--botts)
7. [Type System — `types.ts`](#7-type-system--typests)
8. [Configuration — `config.ts`](#8-configuration--configts)
9. [Permissions — `permissions.ts`](#9-permissions--permissionsts)
10. [The Database Layer — Google Sheets](#10-the-database-layer--google-sheets)
11. [Repository Pattern — Domain Repos](#11-repository-pattern--domain-repos)
12. [Service Layer — Business Logic](#12-service-layer--business-logic)
13. [Slash Commands](#13-slash-commands)
14. [Discord Command Registration](#14-discord-command-registration)
15. [The Design System — `ui/design.ts`](#15-the-design-system--uidesignts)
16. [Embeds — Rich Message Cards](#16-embeds--rich-message-cards)
17. [Buttons — Interactive Components](#17-buttons--interactive-components)
18. [Modals — Pop-up Forms](#18-modals--pop-up-forms)
19. [The Discord Logger](#19-the-discord-logger)
20. [Testing — Unit Tests](#20-testing--unit-tests)
21. [Deployment](#21-deployment)
22. [User Flows — End to End](#22-user-flows--end-to-end)
23. [How to Add a New Feature](#23-how-to-add-a-new-feature)
24. [How to Modify Existing Features](#24-how-to-modify-existing-features)
25. [Troubleshooting & Common Pitfalls](#25-troubleshooting--common-pitfalls)
26. [Glossary](#26-glossary)

---

## 1. The Big Picture

GradBot exists to solve a specific problem: graduation project teams need a structured way to:

1. **Brainstorm ideas** — anyone on the team can submit a project idea through a Discord modal form.
2. **Grade ideas** — team members evaluate each idea across four criteria (Learning Value, Problem Impact, Feasibility, Innovation) on a 1–5 scale.
3. **Discuss ideas** — each idea automatically gets a dedicated discussion thread.
4. **Decide on a project** — the team lead finalizes the winning idea.

The bot uses **Google Sheets** as its database (no traditional database server needed) and **Discord** as the user interface. Every action the bot takes is logged to both the Google Sheet and a dedicated Discord channel, creating a full audit trail.

### Architecture at a Glance

```
Discord User
    │
    ▼
Discord API (slash commands, buttons, modals)
    │
    ▼
bot.ts (event router)
    │
    ├── commands/ (slash command handlers)
    ├── services/ (business logic)
    │       ├── IdeaService
    │       └── DecisionService
    ├── sheets/ (data access layer)
    │       ├── GoogleSheetsTable (generic CRUD)
    │       ├── IdeasRepo
    │       ├── GradesRepo
    │       ├── LogsRepo
    │       └── DecisionRepo
    └── ui/ (visual output)
            ├── embeds/ (rich message cards)
            ├── components/ (buttons)
            └── modals/ (pop-up forms)
```

The data flows in one direction: **User → Discord → bot.ts → Service → Repo → Google Sheets**, and responses flow back out through **Embeds → Discord → User**.

---

## 2. Project Structure — The File Tree

```
Graduation-Bot/
├── .env                         # Your secrets (never commit this)
├── .env.example                 # Template showing required variables
├── package.json                 # Dependencies and scripts
├── tsconfig.json                # TypeScript compiler configuration
├── tsconfig.test.json           # TypeScript config for tests only
├── todo.md                      # Project task tracker
├── explanation.md               # This file
│
├── src/
│   ├── index.ts                 # Entry point — boots the bot + HTTP server
│   ├── config.ts                # Loads .env variables into a typed object
│   ├── types.ts                 # All TypeScript interfaces and constants
│   ├── permissions.ts           # Role-based access control
│   ├── bot.ts                   # The brain — wires everything together
│   │
│   ├── commands/                # Slash command definitions
│   │   ├── index.ts             # Command registry (exports all commands)
│   │   ├── types.ts             # BotCommand and CommandContext interfaces
│   │   ├── idea.ts              # /idea add|list|view|archive|comment|leaderboard
│   │   └── decide.ts            # /decide finalize|reasoning|status
│   │
│   ├── discord/                 # Discord-specific utilities
│   │   └── registerCommands.ts  # Pushes slash commands to Discord API
│   │
│   ├── services/                # Business logic layer
│   │   ├── idea-service.ts      # Idea CRUD, grading, commenting
│   │   ├── decision-service.ts  # Finalize and reason about decisions
│   │   └── logger.ts            # Posts audit logs to Discord channels
│   │
│   ├── sheets/                  # Data access layer (Google Sheets)
│   │   ├── client.ts            # Google API authentication
│   │   ├── sheet-table.ts       # Generic CRUD for any sheet tab
│   │   ├── memory-table.ts      # In-memory implementation for tests
│   │   ├── ideas.repo.ts        # Ideas-specific queries
│   │   ├── grades.repo.ts       # Grades-specific queries + aggregation
│   │   ├── logs.repo.ts         # Audit log append-only storage
│   │   └── decision.repo.ts     # Decision queries
│   │
│   ├── ui/                      # Everything the user sees
│   │   ├── design.ts            # Color palette, grade bars, labels
│   │   ├── embeds/              # Rich embed builders
│   │   │   ├── idea.ts          # Idea card + list embeds
│   │   │   └── decision.ts      # Decision card embeds
│   │   ├── components/          # Interactive components
│   │   │   └── idea-buttons.ts  # Grade / Add Comment / View Comments buttons
│   │   └── modals/              # Pop-up form builders
│   │       ├── idea-add.ts      # "Submit a Project Idea" form
│   │       ├── idea-grade.ts    # "Grade This Idea" form (4 criteria)
│   │       └── idea-comment.ts  # "Add a Comment" form
│   │
│   ├── tests/                   # Unit tests
│   │   ├── idea-service.test.ts
│   │   └── decision-service.test.ts
│   │
│   └── events/                  # (Reserved for future event handlers)
│
└── dist/                        # Compiled JavaScript output (gitignored)
```

---

## 3. Technology Stack

| Technology | Purpose | Why this choice? |
|---|---|---|
| **TypeScript** | Language | Type safety catches bugs at compile time instead of at 3 AM in production |
| **discord.js v14** | Discord API wrapper | The most popular, well-documented Discord library for Node.js |
| **googleapis** | Google Sheets API | Official Google client — reliable, typed |
| **dotenv** | Environment variables | Simple `.env` file loading |
| **Node.js built-in `node:test`** | Testing | Zero dependency testing — no Jest or Mocha needed |
| **tsx** | Dev runner | Runs TypeScript directly without compiling — used for `npm run dev` |

### npm Scripts

| Script | Command | What it does |
|---|---|---|
| `npm run dev` | `tsx watch src/index.ts` | Runs the bot in development mode with hot-reload |
| `npm run build` | `tsc` | Compiles TypeScript to JavaScript in `dist/` |
| `npm start` | `node dist/index.js` | Runs the compiled production build |
| `npm test` | `tsc -p tsconfig.test.json && node --test ...` | Compiles tests and runs them |

---

## 4. Environment Configuration

The `.env` file is the single source of truth for all secrets and configuration. Here is every variable with a full explanation:

```env
# ─── Discord ──────────────────────────────────────────────
DISCORD_TOKEN=              # Bot token from Discord Developer Portal
DISCORD_CLIENT_ID=          # Application ID from Discord Developer Portal
DISCORD_GUILD_ID=           # The server (guild) ID where the bot operates

# ─── Google Sheets ────────────────────────────────────────
GOOGLE_SERVICE_ACCOUNT_EMAIL=   # e.g., gradbot@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY=             # The private key from your service account JSON
GOOGLE_SHEET_ID=                # The ID from the Google Sheets URL

# ─── Discord Channel IDs ─────────────────────────────────
LOG_CHANNEL_ID=             # #bot-logs channel — all actions are posted here
ERROR_CHANNEL_ID=           # #bot-errors channel — errors are posted here
DIGEST_CHANNEL_ID=          # (Reserved for future digest feature)
DISCUSSION_CHANNEL_ID=      # #idea-discussion — threads are created here
VOTING_RESULTS_CHANNEL_ID=  # #voting-results — voting cards are posted here

# ─── Role-Based Access ───────────────────────────────────
LEAD_ROLE_ID=               # Discord role ID for Team Leads
ADMIN_ROLE_ID=              # Discord role ID for Bot Admins
```

### How `config.ts` Loads These

The file `src/config.ts` calls `dotenv`'s `config()` to load the `.env` file, then exports a single `ENV` object with all values. There's one important trick: the `GOOGLE_PRIVATE_KEY` often contains literal `\n` characters (because environment variables can't have real newlines), so we use `.replace(/\\n/g, '\n')` to convert them to actual newline characters.

```typescript
// src/config.ts — simplified
import { config } from 'dotenv';
config();

export const ENV = {
    DISCORD_TOKEN: process.env.DISCORD_TOKEN || '',
    // ... all other variables ...
    GOOGLE_PRIVATE_KEY: (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
};
```

**How to edit:** If you need a new environment variable (say, `MAX_IDEAS_PER_USER`), add it here and in `.env.example`. Then access it anywhere via `context.env.MAX_IDEAS_PER_USER`.

---

## 5. Entry Point — How the Bot Starts

`src/index.ts` is the file that Node.js actually runs. It does exactly two things:

1. **Creates and starts the bot** by calling `createGradBot()` from `bot.ts`.
2. **Starts a tiny HTTP server** on the port Render provides (`process.env.PORT`).

### Why the HTTP server?

Render's free tier requires a web service to bind to a port, and it also gives us a URL we can ping every 10 minutes with `cron-job.org` to prevent the server from sleeping.

```typescript
// src/index.ts
import { createServer } from 'node:http';
import { createGradBot } from './bot';

async function main() {
    const bot = createGradBot();
    await bot.start();

    const port = process.env.PORT || 3000;
    createServer((req, res) => {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('GradBot is online!\n');
    }).listen(port, () => {
        console.log(`HTTP server listening on port ${port}`);
    });
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
```

**How to edit:** If you want to add a health-check endpoint (e.g., `/health` returning JSON with uptime), modify the `createServer` callback to inspect `req.url`.

---

## 6. The Brain — `bot.ts`

This is the largest and most important file in the project (474 lines). Think of it as the **central nervous system** — it doesn't contain business logic itself, but it wires together all the other pieces and routes incoming Discord events to the right handler.

### What `createGradBot()` Does (Step by Step)

```
1. Creates a Discord Client with the Guilds intent
2. Loads all slash commands from commands/index.ts
3. Creates a DiscordLogger (for #bot-logs and #bot-errors)
4. Creates the CommandContext (services + repos + logger)
5. Wires the onLog callback so every service action → Discord log
6. Sets up event listeners:
   a. ClientReady  → logs "GradBot is online!" and tests Sheets connection
   b. InteractionCreate → routes modals, buttons, and commands
7. Returns a GradBot object with a start() method
```

### The Interaction Router

The `InteractionCreate` event is the heart of Discord bot development. Every time a user clicks a button, submits a modal, or types a slash command, Discord sends an "interaction". The router in `bot.ts` checks the type:

```
Is it a ModalSubmit?
  ├── customId === 'modal-idea-add'        → handleIdeaAddModal()
  ├── customId starts with 'modal-idea-grade_'   → handleIdeaGradeModal()
  └── customId starts with 'modal-idea-comment_' → handleIdeaCommentModal()

Is it a Button click?
  ├── customId starts with 'grade_'       → show the grading modal
  ├── customId starts with 'add_comment_' → show the comment modal
  └── customId starts with 'comments_'    → handleViewCommentsButton()

Is it a ChatInputCommand?
  └── Look up the command by name and call its execute()
```

### Modal Handlers — The Heavy Lifters

#### `handleIdeaAddModal()`
This is called when a user submits the "Submit a Project Idea" form:
1. Defers the reply (tells Discord "I'm working on it, please wait").
2. Extracts fields: title, description, difficulty, category.
3. Validates difficulty against `['Easy', 'Medium', 'Hard']`.
4. Validates category against `['B2B', 'Fintech', 'EdTech', 'HealthTech', 'Social', 'Dev Tools', 'Other']`.
5. Calls `IdeaService.createIdea()` to save to Google Sheets.
6. Replies to the user with a success message.
7. Posts the idea card with buttons to the `DISCUSSION_CHANNEL_ID`.
8. Creates a discussion thread from that message (name truncated to 100 chars — Discord's limit).
9. Saves the thread ID back to the Ideas sheet.

**How to edit:** To add a new field to the idea form (say, "Team Size"), you need to:
1. Add the field to `idea-add.ts` modal (but Discord limits modals to 5 fields!).
2. Add the column to `IDEA_COLUMNS` in `types.ts`.
3. Add the property to the `Idea` interface in `types.ts`.
4. Extract it from the modal in `handleIdeaAddModal()`.
5. Pass it through `createIdea()` in `idea-service.ts`.
6. Add the column to your Google Sheet.

#### `handleIdeaGradeModal()`
Called when a user submits the grading form:
1. Defers an ephemeral (private) reply.
2. Extracts the idea ID from the modal's `customId`.
3. Parses and validates all four grade values (must be integers 1–5).
4. Calls `IdeaService.gradeIdea()` which upserts the grade (one grade per user per idea).
5. Replies with the saved grade.
6. Updates the original message embed (the card the user clicked from).
7. Updates the voting results channel card:
   - If no voting card exists yet → sends a new one and saves `voting_message_id`.
   - If one exists → edits the existing message with updated grades.

#### `handleIdeaCommentModal()`
Called when a user submits the comment form:
1. Defers an ephemeral reply.
2. Extracts idea ID and comment text.
3. Calls `IdeaService.commentOnIdea()` which saves it as a log entry.
4. Posts the comment to the idea's discussion thread (if it exists).
5. Updates the original embed and the voting card to show the latest comments.

#### `handleViewCommentsButton()`
Called when a user clicks "View Comments":
1. Defers an ephemeral reply.
2. Fetches all comments for the idea from the Logs sheet.
3. Formats them as a readable list with timestamps.
4. Truncates to 2000 characters (Discord's message limit).
5. Sends the ephemeral response.

### The Context Factory

At the bottom of `bot.ts`, `createCommandContext()` is the function that wires up the entire dependency graph:

```typescript
function createCommandContext(env, logger) {
    const sheets = getSheetsClient(env);     // Google API client

    const logsRepo    = new LogsRepo(new GoogleSheetsTable('Logs', ...));
    const ideasRepo   = new IdeasRepo(new GoogleSheetsTable('Ideas', ...));
    const gradesRepo  = new GradesRepo(new GoogleSheetsTable('Grades', ...));
    const decisionRepo = new DecisionRepo(new GoogleSheetsTable('Decisions', ...));

    return {
        env,
        ideas: new IdeaService({ ideas: ideasRepo, grades: gradesRepo, logs: logsRepo }),
        decisions: new DecisionService({ decision: decisionRepo, ideas: ideasRepo, logs: logsRepo }),
        logger,
    };
}
```

This is the **composition root** — the one place where all dependencies are assembled. If you need to add a new repo or service, wire it here.

### Helper Functions

| Function | Purpose |
|---|---|
| `normalizeDifficulty(raw)` | Case-insensitive match: "easy" → "Easy", "HARD" → "Hard" |
| `normalizeCategory(raw)` | Case + space insensitive: "dev tools" → "Dev Tools", "edtech" → "EdTech" |
| `parseGradeValue(raw)` | Ensures the value is an integer between 1 and 5 |

---

## 7. Type System — `types.ts`

This file is the **contract** that every other file agrees to follow. It defines the shape of every data object in the system.

### Sheet Column Arrays

Each Google Sheet tab has its columns defined as a readonly tuple. These arrays serve double duty:
1. They define the column order for reading/writing sheets.
2. They are used by `GoogleSheetsTable` to auto-create headers if the sheet is empty.

```typescript
export const IDEA_COLUMNS = [
    'id', 'title', 'description', 'tech_stack', 'difficulty',
    'category', 'submitted_by', 'submitted_by_name', 'status',
    'thread_id', 'voting_message_id', 'created_at', 'updated_at',
] as const;
```

### Enums (as Arrays)

Discord modals don't support dropdown selects, so we validate user text input against these arrays:

```typescript
export const IDEA_DIFFICULTIES = ['Easy', 'Medium', 'Hard'] as const;
export const IDEA_STATUSES = ['Active', 'Finalized', 'Archived'] as const;
export const PROJECT_CATEGORIES = ['B2B', 'Fintech', 'EdTech', 'HealthTech', 'Social', 'Dev Tools', 'Other'] as const;
```

**How to add a new category:** Add it to the `PROJECT_CATEGORIES` array. That's it — the validation in `bot.ts` and the type system will pick it up automatically.

### Core Interfaces

| Interface | Purpose | Key fields |
|---|---|---|
| `SheetRow` | Base type for all sheet data | `Record<string, string>` — everything is a string in Sheets |
| `Actor` | Represents who did something | `id`, `name` |
| `Idea` | A project idea | title, description, difficulty, category, status, thread_id, voting_message_id |
| `Grade` | One user's evaluation of one idea | idea_id, user_id, learning/impact/feasibility/innovation (1–5) |
| `LogEntry` | An audit log row | actor, action_type, target_id, before/after snapshots, detail |
| `Decision` | The finalized project choice | idea_id, reasoning, decided_by |
| `GradeSummary` | Computed averages (not stored) | learning, impact, feasibility, innovation, overall, count |
| `CommentEntry` | Extracted from logs (not stored) | actor_name, text, timestamp |
| `IdeaWithGrades` | Rich view combining idea + grades + comments | Used by embeds and commands |

**Important design decision:** `GradeSummary` and `CommentEntry` are **computed at runtime** from the Grades and Logs sheets. They are not stored in a separate sheet. This keeps the data normalized but means every idea view requires scanning the Grades and Logs sheets.

---

## 8. Configuration — `config.ts`

Already covered in section 4. The key thing to remember: this file is loaded **once** at import time. If you change `.env` values, you must restart the bot.

---

## 9. Permissions — `permissions.ts`

This file contains a single function: `canManageProject()`. It determines whether a user is allowed to perform admin actions (archiving ideas, finalizing decisions).

### How it works

```typescript
export function canManageProject(interaction, env): boolean {
    // 1. Collect configured role IDs (LEAD_ROLE_ID, ADMIN_ROLE_ID)
    const configuredRoleIds = [env.ADMIN_ROLE_ID, env.LEAD_ROLE_ID].filter(Boolean);

    // 2. If no roles are configured, allow everyone (development mode)
    if (configuredRoleIds.length === 0) return true;

    // 3. Check if the user has any of the configured roles
    const roles = interaction.member?.roles;
    // ... handles both array format and GuildMemberRoleManager format
}
```

**Design decision:** If neither `LEAD_ROLE_ID` nor `ADMIN_ROLE_ID` is set in `.env`, everyone is treated as an admin. This makes local development frictionless.

**How to edit:** To add a new permission level (e.g., `MODERATOR_ROLE_ID`), add it to `config.ts`, then add it to the `configuredRoleIds` array in `permissions.ts`.

---

## 10. The Database Layer — Google Sheets

### Why Google Sheets?

- **Free** — no database hosting costs.
- **Visible** — the team can open the spreadsheet and see all data directly.
- **No setup** — no Docker, no PostgreSQL, no migrations.
- **Editable** — admins can manually fix data in the sheet if needed.

### `sheets/client.ts` — Authentication

```typescript
export function getSheetsClient(env) {
    const auth = new google.auth.JWT({
        email: env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        key: env.GOOGLE_PRIVATE_KEY,
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    return google.sheets({ version: 'v4', auth });
}
```

This creates a JWT-authenticated Google Sheets client using a **service account**. The service account must be shared with the Google Sheet (give it "Editor" access).

`testSheetConnection()` is called on startup to verify the connection works. If it fails, the bot logs an error to `#bot-errors`.

### `sheets/sheet-table.ts` — The Generic CRUD Engine

This is the most clever abstraction in the codebase. `GoogleSheetsTable<T>` provides full CRUD operations for any sheet tab, regardless of its columns.

#### Interface: `TableStore<T>`

```typescript
export interface TableStore<T extends SheetRow> {
    findAll(): Promise<T[]>;
    findById(id: string): Promise<T | null>;
    append(row: T): Promise<T>;
    updateById(id: string, patch: Partial<T>): Promise<T | null>;
}
```

This interface is implemented by both `GoogleSheetsTable` (production) and `MemoryTable` (tests), enabling dependency injection.

#### How `GoogleSheetsTable` Works

**`findAll()`** — Reads all rows from the sheet tab, skips the header row, converts each row into a typed object using `rowToObject()`.

**`findById(id)`** — Calls `findAll()` and filters. Yes, this is a full table scan every time. For a graduation project with < 100 ideas, this is perfectly fine. For 10,000 rows, you'd want caching.

**`append(row)`** — Uses Google Sheets API `values.append` to add a new row at the bottom of the sheet.

**`updateById(id, patch)`** — This is the most complex operation:
1. Reads all rows.
2. Finds the row index where `id` matches.
3. Merges the patch into the existing row.
4. Uses Google Sheets API `values.update` to overwrite that specific row.

**`ensureHeaders()`** — If the sheet tab is empty, it writes the column headers (from the `columns` array) into row 1. This means you never need to manually set up the sheet — the bot does it automatically.

**`toColumnName(n)`** — Converts a column number to a letter: 1 → "A", 26 → "Z", 27 → "AA". Used to construct Sheets API ranges like `Ideas!A2:M2`.

**How to edit:** If you add a new column to an existing sheet tab, you need to:
1. Add it to the corresponding `*_COLUMNS` array in `types.ts`.
2. Add it to the corresponding interface in `types.ts`.
3. Add the column header to your actual Google Sheet (in the correct position!).

### `sheets/memory-table.ts` — The Test Double

This class implements the exact same `TableStore<T>` interface but stores data in a plain JavaScript array. This is what makes the unit tests possible without a Google Sheets connection.

```typescript
export class MemoryTable<T extends SheetRow> implements TableStore<T> {
    private readonly rows: T[];
    // findAll, findById, append, updateById — all operate on the array
}
```

Every method returns **copies** of objects (using spread `{ ...row }`) to prevent tests from accidentally mutating shared state.

---

## 11. Repository Pattern — Domain Repos

Each domain entity has its own repository class that wraps the generic `TableStore` with entity-specific queries.

### `IdeasRepo`

```typescript
export class IdeasRepo {
    constructor(private readonly table: TableStore<Idea>) {}

    create(idea)          → table.append(idea)
    findAll(status?)      → table.findAll() then filter by status
    findById(id)          → table.findById(id)
    updateById(id, patch) → table.updateById(id, patch)
}
```

**How to edit:** To add a query like "find ideas by category", add:
```typescript
async findByCategory(category: ProjectCategory): Promise<Idea[]> {
    const all = await this.table.findAll();
    return all.filter(i => i.category === category);
}
```

### `GradesRepo`

This is the most complex repository because it handles **aggregation** and **upsert logic**.

```typescript
export class GradesRepo {
    findByIdeaId(ideaId)       → all grades for one idea
    summarizeForIdea(ideaId)   → compute average for each criterion + overall
    upsert(grade)              → insert or update (one grade per user per idea)
}
```

#### `summarizeForIdea()` — How Averages Work

```
1. Get all grades for the idea
2. Sum each criterion across all grades
3. Divide by the number of grades to get averages
4. overall = (avgLearning + avgImpact + avgFeasibility + avgInnovation) / 4
```

#### `upsert()` — One Grade Per User

The grading system enforces **one grade per user per idea**. When a user grades an idea:
1. Check if a grade already exists with the same `idea_id` and `user_id`.
2. If not found → `table.append(grade)` (create new).
3. If found → `table.updateById(existing.id, ...)` (update existing).
4. Returns `{ before: existingOrNull, after: savedGrade }` for audit logging.

### `LogsRepo`

The simplest repository — append-only.

```typescript
export class LogsRepo {
    append(entry) → table.append(entry)
    findAll()     → table.findAll()
}
```

The Logs sheet is used for two things:
1. **Audit trail** — every action (idea.create, idea.grade, idea.archive, etc.) is logged.
2. **Comment storage** — comments are stored as log entries with `action_type === 'idea.comment'`. This avoids needing a separate Comments sheet.

### `DecisionRepo`

```typescript
export class DecisionRepo {
    create(decision)                → table.append(decision)
    findLatest()                    → last row in the sheet (the current decision)
    updateReasoning(ideaId, text)   → find the decision for this idea and update reasoning
}
```

**Design decision:** Only one decision can be "active" at a time. `findLatest()` returns the last row, which is assumed to be the current decision.

---

## 12. Service Layer — Business Logic

Services contain the **domain logic** — the rules that govern how ideas, grades, and decisions work. They sit between the commands (what the user asked for) and the repos (where data is stored).

### `IdeaService`

This is the largest service. Here's every method:

| Method | What it does | Side effects |
|---|---|---|
| `createIdea(input, actor)` | Validates title/description, generates UUID, saves to Ideas sheet | Logs `idea.create` |
| `listIdeas(status)` | Gets all ideas matching the status, enriches each with grade summary and comments | None |
| `getIdea(id)` | Gets one idea with grades and comments | Throws `UserFacingError` if not found |
| `gradeIdea(id, values, actor)` | Upserts a grade, returns enriched idea | Logs `idea.grade` |
| `archiveIdea(id, actor)` | Changes status to 'Archived' | Logs `idea.archive` |
| `commentOnIdea(id, text, actor)` | Saves comment as a log entry | Logs `idea.comment` |
| `updateIdeaThread(ideaId, threadId)` | Saves the Discord thread ID | None |
| `updateVotingMessageId(ideaId, msgId)` | Saves the voting card message ID | None |
| `getCommentsForIdea(ideaId)` | Scans logs for `idea.comment` entries matching the idea | None |

#### The `onLog` Callback

Every time a service logs an action, it also fires an optional `onLog` callback. In `bot.ts`, this callback is wired to post the log entry to the `#bot-logs` Discord channel:

```typescript
context.ideas.onLog = (entry) => {
    discordLogger.logAction(entry).catch(console.error);
};
```

This is a clean way to decouple the service from Discord — the service doesn't know about Discord at all; it just fires a callback.

#### Dependency Injection for Testing

The service accepts an `IdAndClock` interface for generating IDs and timestamps:

```typescript
interface IdAndClock {
    newId(): string;
    now(): string;
}
```

In production, this uses `randomUUID().slice(0, 8)` and `new Date().toISOString()`. In tests, it uses deterministic functions like `() => 'id-1'` and `() => '2026-07-01T00:00:00.000Z'`, making tests reproducible.

### `DecisionService`

| Method | What it does | Side effects |
|---|---|---|
| `finalize(ideaId, actor)` | Creates a decision, changes idea status to 'Finalized' | Logs `decision.finalize` |
| `addReasoning(text, actor)` | Updates the reasoning field of the latest decision | Logs `decision.reasoning` |
| `getStatus()` | Returns the latest decision + its associated idea | None |

**How to edit:** To add a "revert decision" feature, add a method like:
```typescript
async revert(actor: Actor): Promise<Idea> {
    const latest = await this.repos.decision.findLatest();
    if (!latest) throw new UserFacingError('No decision to revert.');
    const idea = await this.repos.ideas.updateById(latest.idea_id, { status: 'Active' });
    await this.log(actor, 'decision.revert', latest.idea_id, ...);
    return idea;
}
```

### `UserFacingError`

This custom error class (defined in `idea-service.ts`) is used for errors that should be shown directly to the user:

```typescript
export class UserFacingError extends Error {}
```

In command handlers, if a `UserFacingError` is caught, its message is sent to the user. Other errors trigger a generic "Something went wrong" message and are logged to `#bot-errors`.

---

## 13. Slash Commands

### Command Architecture

Every slash command follows the same pattern:

```typescript
export const myCommand: BotCommand = {
    data: new SlashCommandBuilder()
        .setName('commandname')
        .setDescription('...')
        .addSubcommand(...),

    async execute(interaction, context) {
        // Handle subcommands
    },
};
```

Commands are registered in `commands/index.ts`:

```typescript
export function createCommands(): BotCommand[] {
    return [ideaCommand, decideCommand];
}
```

**How to add a new command:**
1. Create `src/commands/mycommand.ts` following the pattern above.
2. Import and add it to the array in `commands/index.ts`.
3. The bot will automatically register it with Discord on next startup.

### `/idea` Command — All Subcommands

| Subcommand | Description | Permissions |
|---|---|---|
| `/idea add` | Opens the "Submit a Project Idea" modal | Everyone |
| `/idea list [status]` | Lists ideas filtered by status (default: Active) | Everyone |
| `/idea view <id>` | Shows one idea with grades, comments, and action buttons | Everyone |
| `/idea archive <id>` | Archives an idea (hides from active list) | Lead/Admin only |
| `/idea comment <id> <text>` | Adds a comment via slash command | Everyone |
| `/idea leaderboard` | Shows all active ideas sorted by overall rating | Everyone |

**Note on `/idea add`:** This subcommand is special because it opens a **modal** (pop-up form) instead of processing immediately. Because of Discord's API rules, you can only `showModal()` on the first response — you cannot `deferReply()` first.

### `/decide` Command — All Subcommands

| Subcommand | Description | Permissions |
|---|---|---|
| `/decide finalize <id>` | Marks an idea as the final project choice | Lead/Admin only |
| `/decide reasoning <text>` | Adds reasoning to the current decision | Lead/Admin only |
| `/decide status` | Shows the current decision | Everyone |

---

## 14. Discord Command Registration

`src/discord/registerCommands.ts` pushes slash command definitions to Discord's API every time the bot starts:

```typescript
export async function registerGuildCommands(commands, env) {
    const rest = new REST({ version: '10' }).setToken(env.DISCORD_TOKEN);
    await rest.put(
        Routes.applicationGuildCommands(env.DISCORD_CLIENT_ID, env.DISCORD_GUILD_ID),
        { body: commands.map(cmd => cmd.data.toJSON()) },
    );
}
```

This uses **guild commands** (specific to one server), not global commands. Guild commands update instantly, while global commands take up to an hour to propagate.

---

## 15. The Design System — `ui/design.ts`

Every color, label, and visual element in the bot is centralized here.

### Color Palette

```typescript
export const PALETTE = {
    forest: 0x778873,  // Muted green — archived, neutral states
    sage:   0xa1bc98,  // Light green — active, success, primary actions
    sand:   0xdccfc0,  // Warm beige — secondary, info, grading
    cream:  0xfdf6ed,  // Off-white — accent (used sparingly)
    error:  0xc45b4b,  // Muted red — errors
};
```

These are earthy, professional tones. No bright reds, blues, or greens — the palette is cohesive and calming.

### Functions

| Function | Purpose | Example output |
|---|---|---|
| `statusColor(status)` | Maps idea status to a color | `'Active'` → sage green |
| `statusLabel(status)` | Human-readable status text | `'Archived'` → `'Archived'` |
| `difficultyLabel(diff)` | Human-readable difficulty | `'Medium'` → `'Medium'` |
| `gradeBar(value)` | Text-based progress bar | `gradeBar(3.2)` → `"██████░░░░ 3.2"` |

### `gradeBar()` — How It Works

```typescript
export function gradeBar(value: number): string {
    const filled = Math.round(value * 2);  // value 1–5, so filled = 2–10
    const empty  = 10 - filled;
    const bar = '█'.repeat(filled) + '░'.repeat(empty);
    return `${bar} ${value.toFixed(1)}`;
}
```

The bar is 10 characters wide. A value of 5.0 fills all 10 blocks; a value of 1.0 fills 2 blocks.

**How to edit:** To change the bar width to 20 characters, multiply by 4 instead of 2.

---

## 16. Embeds — Rich Message Cards

### `ui/embeds/idea.ts`

#### `ideaEmbed(ideaWithGrades)` — The Idea Card

This function builds the rich embed card that shows an idea with all its details. The card has three sections:

1. **Header**: Title, description, color (based on status).
2. **Metadata fields** (inline): ID, Status, Difficulty, Category, Tech Stack, Submitted By.
3. **Evaluation section**:
   - If graded: Shows progress bars for each criterion + overall score.
   - If ungraded: Shows "No reviews yet" message.
4. **Comments section**: Shows the last 5 comments (if any exist).

**How to edit:** To add a new field to the card (say, "Team Size"), add a field object:
```typescript
{ name: 'Team Size', value: idea.team_size || 'Not set', inline: true },
```

#### `ideaListEmbed(rows, status)` — The List View

Shows up to 20 ideas in a compact format:
```
`abc123` **My Idea** [EdTech]
Medium · 3.5/5 · React, Node.js
```

### `ui/embeds/decision.ts`

#### `decisionEmbed(decision, idea)` — The Decision Card

Shows the finalized decision with reasoning, metadata, and who decided.

#### `noDecisionEmbed()` — Empty State

Shown when no decision has been made yet. Provides guidance on using `/decide finalize`.

---

## 17. Buttons — Interactive Components

### `ui/components/idea-buttons.ts`

```typescript
export function ideaActionButtons(ideaId: string) {
    // Returns an ActionRow with 3 buttons:
    // 1. "Grade This Idea" (Primary/Blue) → customId: grade_{ideaId}
    // 2. "Add Comment" (Secondary/Gray) → customId: add_comment_{ideaId}
    // 3. "View Comments" (Secondary/Gray) → customId: comments_{ideaId}
}
```

### How Custom IDs Work

Each button encodes the idea ID into its `customId`. When a user clicks the button, Discord sends the `customId` back to the bot. The bot parses the ID out:

```typescript
// Button click arrives with customId = "grade_abc123"
const ideaId = interaction.customId.replace('grade_', '');
// ideaId = "abc123"
```

**How to add a new button:** 
1. Add a `ButtonBuilder` in `idea-buttons.ts` with a unique customId prefix.
2. Add a handler in the button section of `bot.ts`.
3. If the button needs a form, create a modal and show it.

---

## 18. Modals — Pop-up Forms

Discord modals can have up to **5 text inputs** (this is a hard Discord API limit).

### `ui/modals/idea-add.ts` — Submit a Project Idea

| Field | Custom ID | Type | Validation |
|---|---|---|---|
| Title | `idea-title` | Short | Required, max 80 chars |
| Description | `idea-description` | Paragraph | Required |
| Difficulty | `idea-difficulty` | Short | Must be Easy/Medium/Hard |
| Category | `idea-category` | Short | Must match PROJECT_CATEGORIES |

Note: We can't add `tech_stack` because we're already at 4 fields and Discord caps at 5 action rows per modal. If you need more fields, you'd have to remove one or use a follow-up message.

### `ui/modals/idea-grade.ts` — Grade This Idea

| Field | Custom ID | Type | Validation |
|---|---|---|---|
| Learning Value (1–5) | `grade-learning` | Short | Integer 1–5 |
| Problem Impact (1–5) | `grade-impact` | Short | Integer 1–5 |
| Feasibility (1–5) | `grade-feasibility` | Short | Integer 1–5 |
| Innovation (1–5) | `grade-innovation` | Short | Integer 1–5 |

Each field has `minLength: 1` and `maxLength: 1` to enforce single-digit input.

The `customId` of the modal itself encodes the idea ID: `modal-idea-grade_{ideaId}`.

### `ui/modals/idea-comment.ts` — Add a Comment

| Field | Custom ID | Type | Validation |
|---|---|---|---|
| Your Comment | `comment-text` | Paragraph | Required, max 1000 chars |

---

## 19. The Discord Logger

`src/services/logger.ts` — The `DiscordLogger` class posts structured log entries to Discord channels as rich embeds.

### Methods

| Method | Posts to | Purpose |
|---|---|---|
| `logAction(entry)` | `#bot-logs` | Every create/grade/archive/comment/finalize action |
| `logSystem(message)` | `#bot-logs` | Bot startup/shutdown messages |
| `logError(error, context)` | `#bot-errors` (or `#bot-logs` fallback) | Errors with context |

### Color Coding

The logger automatically color-codes log entries:
- **Create/Add actions** → sage (green)
- **Archive/Delete actions** → forest (dark green)
- **Grade actions** → sand (beige)
- **Finalize/Decide actions** → sage (green)
- **Errors** → muted red

### `init()` — Channel Resolution

When the bot starts, `init()` is called to resolve channel IDs into actual channel objects. This is called in the `ClientReady` event because channels can only be fetched after the bot is logged in.

---

## 20. Testing — Unit Tests

Tests live in `src/tests/` and use Node.js's built-in `node:test` framework.

### How the Tests Work

Each test file creates an isolated test environment using `MemoryTable` instead of `GoogleSheetsTable`:

```typescript
function createTestService() {
    let idCounter = 0;
    const ideas  = new IdeasRepo(new MemoryTable<Idea>());
    const grades = new GradesRepo(new MemoryTable<Grade>());
    const logs   = new LogsRepo(new MemoryTable<LogEntry>());
    const service = new IdeaService(
        { ideas, grades, logs },
        {
            newId: () => `id-${++idCounter}`,  // Deterministic IDs
            now: () => '2026-07-01T00:00:00.000Z',  // Fixed timestamp
        },
    );
    return { service, ideas, grades, logs };
}
```

This pattern means:
- No Google Sheets connection needed.
- Tests are fast (< 100ms total).
- Tests are deterministic (same IDs, same timestamps every run).

### Test Cases — `idea-service.test.ts`

1. **Creates an idea and records an audit log** — verifies the full create flow.
2. **Lists active ideas with grade summaries** — verifies enrichment works.
3. **Lets one user update their grade** — verifies upsert (no duplicates).
4. **Archives ideas and hides from active list** — verifies status filtering.
5. **Adds a comment and logs it** — verifies comments are stored as log entries.
6. **Retrieves comments for an idea** — verifies comment extraction from logs.
7. **Updates the thread ID** — verifies thread tracking.
8. **Includes grades and comments in getIdea result** — verifies the full rich view.

### Test Cases — `decision-service.test.ts`

1. **Finalizes an idea and creates a decision** — verifies finalize flow.
2. **Adds reasoning to a decision** — verifies reasoning update.
3. **Gets the current status** — verifies status retrieval (null before, populated after).

### Running Tests

```bash
npm test
```

This compiles test-specific TypeScript (using `tsconfig.test.json`) and runs the compiled tests.

**How to add a new test:** Create a new test file in `src/tests/`, add it to the `node --test` command in `package.json`.

---

## 21. Deployment

### Render.com (Free Tier)

The bot is deployed on Render as a **Web Service**.

**Build Command:** `npm install && npm run build`
**Start Command:** `npm start`

#### Key deployment details:

1. **No `prestart` hook** — Render's free tier has limited memory (512MB). Running `tsc` twice (once in build, once in start) causes an out-of-memory crash. We removed `prestart` from `package.json`.

2. **HTTP server** — Render requires web services to bind to a port. Our `index.ts` creates a simple HTTP server that returns "GradBot is online!" on any request.

3. **Keep-alive** — Render puts free services to sleep after 15 minutes of inactivity. We use `cron-job.org` to ping the bot's URL every 10 minutes.

### Environment Variables on Render

All `.env` variables must be set in Render's dashboard under **Environment → Environment Variables**.

---

## 22. User Flows — End to End

### Flow 1: Submitting an Idea

```
User types /idea add
  → Discord shows the "Submit a Project Idea" modal
  → User fills in title, description, difficulty, category
  → User clicks Submit
  → bot.ts receives the ModalSubmit interaction
  → handleIdeaAddModal() runs:
      1. Validates difficulty and category
      2. Calls IdeaService.createIdea() → saves to Ideas sheet
      3. Replies to user: "Idea submitted successfully"
      4. Posts idea card to #idea-discussion channel
      5. Creates a discussion thread from the card
      6. Saves thread_id to the Ideas sheet
  → IdeaService.onLog fires → DiscordLogger posts to #bot-logs
```

### Flow 2: Grading an Idea

```
User clicks "Grade This Idea" button on a card
  → Discord shows the grading modal (4 fields: L/I/F/N)
  → User enters values 1–5 for each
  → User clicks Submit
  → bot.ts receives the ModalSubmit interaction
  → handleIdeaGradeModal() runs:
      1. Validates all values are integers 1–5
      2. Calls IdeaService.gradeIdea() → upserts to Grades sheet
      3. Replies ephemerally: "Grade saved (Overall: X.X/5)"
      4. Edits the original card with updated grade bars
      5. If no voting card in #voting-results yet → sends one
         If voting card exists → edits it with new averages
  → IdeaService.onLog fires → DiscordLogger posts to #bot-logs
```

### Flow 3: Commenting

```
User clicks "Add Comment" button on a card
  → Discord shows the comment modal
  → User types their comment
  → User clicks Submit
  → bot.ts receives the ModalSubmit interaction
  → handleIdeaCommentModal() runs:
      1. Calls IdeaService.commentOnIdea() → saves to Logs sheet
      2. Replies ephemerally: "Comment added"
      3. Posts the comment to the idea's discussion thread
      4. Updates the original card and voting card embeds
```

### Flow 4: Viewing Comments

```
User clicks "View Comments" button on a card
  → bot.ts handles the button click
  → handleViewCommentsButton() runs:
      1. Fetches all comments from Logs sheet
      2. Formats as a readable list with timestamps
      3. Replies ephemerally with the comments
```

### Flow 5: Finalizing a Decision

```
Team Lead types /decide finalize <id>
  → decide.ts handles the command
  → Checks permissions (must have LEAD or ADMIN role)
  → Calls DecisionService.finalize():
      1. Creates a Decision row in the Decisions sheet
      2. Updates the idea's status to 'Finalized'
      3. Logs decision.finalize
  → Replies with the decision embed card
```

### Flow 6: Leaderboard

```
User types /idea leaderboard
  → idea.ts handles the command
  → Calls IdeaService.listIdeas('Active')
  → Sorts by grades.overall descending
  → Shows the ranked list embed
```

---

## 23. How to Add a New Feature

### Example: Adding a "Star" Button

Let's say you want to add a star button that users can click to bookmark an idea.

1. **Add the button** in `src/ui/components/idea-buttons.ts`:
   ```typescript
   const starButton = new ButtonBuilder()
       .setCustomId(`star_${ideaId}`)
       .setLabel('Star')
       .setStyle(ButtonStyle.Secondary);
   ```
   Add it to the `.addComponents(...)` call.

2. **Handle the click** in `bot.ts` (button section):
   ```typescript
   } else if (interaction.customId.startsWith('star_')) {
       const ideaId = interaction.customId.replace('star_', '');
       // Do something with the star action
   }
   ```

3. **If you need a database:** Add a new sheet tab, new columns in `types.ts`, a new repo, and wire it in `createCommandContext()`.

### Example: Adding a New Slash Command

1. Create `src/commands/stats.ts`:
   ```typescript
   export const statsCommand: BotCommand = {
       data: new SlashCommandBuilder()
           .setName('stats')
           .setDescription('Show project statistics.'),
       async execute(interaction, context) {
           await interaction.deferReply();
           const ideas = await context.ideas.listIdeas();
           await interaction.editReply({ content: `Total ideas: ${ideas.length}` });
       },
   };
   ```

2. Register it in `src/commands/index.ts`:
   ```typescript
   import { statsCommand } from './stats';
   export function createCommands() {
       return [ideaCommand, decideCommand, statsCommand];
   }
   ```

3. Restart the bot — the command will be automatically registered with Discord.

### Example: Adding a New Grade Criterion

Let's say you want to add "Market Potential" as a 5th criterion.

1. **types.ts**: Add `market_potential` to `GRADE_COLUMNS` and the `Grade` interface.
2. **Google Sheet**: Add the `market_potential` column to the Grades sheet.
3. **idea-grade.ts**: You can't! Discord modals max out at 5 rows, and you already have 4 criteria. You'd need to split grading into two modals or use a different interaction pattern.
4. **grades.repo.ts**: Update `summarizeForIdea()` to include the new criterion.
5. **ui/embeds/idea.ts**: Add a new `gradeBar()` field for Market Potential.
6. **idea-service.ts**: Update `gradeIdea()` to accept the new value.
7. **bot.ts**: Update `handleIdeaGradeModal()` to parse the new field.

---

## 24. How to Modify Existing Features

### Change the Grading Scale

Currently 1–5. To change to 1–10:
1. `bot.ts` → `parseGradeValue()`: Change `n > 5` to `n > 10`, remove `!Number.isInteger(n)` if you want decimals.
2. `idea-grade.ts`: Change `setMaxLength(1)` to `setMaxLength(2)`, update labels.
3. `ui/design.ts` → `gradeBar()`: Adjust the multiplier (currently `value * 2`).
4. `ui/embeds/idea.ts`: Update the "Overall Score" format.

### Change the Color Palette

Edit only `src/ui/design.ts`. All embeds and the logger import colors from there.

### Add a New Project Category

Edit only `src/types.ts` — add the new value to the `PROJECT_CATEGORIES` array. The validation in `bot.ts` uses this array automatically.

### Change the Discussion Channel

Update `DISCUSSION_CHANNEL_ID` in your `.env` file and restart the bot.

### Modify the Idea Card Layout

Edit `src/ui/embeds/idea.ts`. The `ideaEmbed()` function builds the card field by field. Reorder, add, or remove `.addFields()` calls.

### Add Admin-Only Category Editing

Currently, only the idea submitter sets the category. To let admins edit it:
1. Add a `/idea setcategory <id> <category>` subcommand in `idea.ts`.
2. In the handler, check `canManageProject()`.
3. Call `context.ideas.repos.ideas.updateById(id, { category })`.

---

## 25. Troubleshooting & Common Pitfalls

### "Interaction has already been acknowledged"

This happens when you try to `deferReply()` or `reply()` more than once on the same interaction. Discord allows exactly one acknowledgment per interaction.

**Fix:** Always use `deferReply()` first, then `editReply()` for subsequent responses.

### "Unknown interaction"

This happens when your bot takes longer than 3 seconds to respond. Discord shows this error to the user.

**Fix:** Always `deferReply()` as the very first thing in your handler (before any Sheets API calls). This gives you 15 minutes to respond.

**Exception:** You cannot `deferReply()` before `showModal()`. Modal interactions are special — you must show the modal as your first response.

### Thread name too long

Discord thread names are capped at 100 characters. If your idea title is very long, thread creation will silently fail.

**Fix:** We already handle this by truncating: `threadName.slice(0, 100)`.

### Google Sheets "Quota exceeded"

The Google Sheets API has a rate limit of 60 requests per minute per user. If you're hitting this, you need to add caching.

**Potential fix:** Add a TTL cache in `GoogleSheetsTable.findAll()` that returns cached results for 10 seconds.

### Out of Memory on Render

Render's free tier has 512MB RAM. The TypeScript compiler (`tsc`) is memory-hungry.

**Fix:** Never run `tsc` at startup. Only run it during the build phase. We removed the `prestart` hook for this reason.

### Bot Goes Offline

Render's free tier sleeps after 15 minutes of inactivity.

**Fix:** Use `cron-job.org` to ping your bot's URL every 10 minutes.

---

## 26. Glossary

| Term | Meaning |
|---|---|
| **Embed** | A rich formatted message card in Discord with colors, fields, and footers |
| **Modal** | A pop-up form that Discord shows to the user |
| **Ephemeral** | A message only visible to the user who triggered it |
| **Interaction** | Any user action in Discord (slash command, button click, modal submit) |
| **Defer** | Tell Discord "I received the interaction, give me more time to respond" |
| **Upsert** | Insert if new, update if existing (used for grades) |
| **Guild** | Discord's internal name for a "server" |
| **Slash Command** | A command triggered by typing `/commandname` in Discord |
| **Custom ID** | A string attached to buttons/modals that identifies what was clicked |
| **Action Row** | A horizontal row of buttons or inputs in a Discord message |
| **Service Account** | A Google account used by applications (not humans) to access APIs |
| **Composition Root** | The one place in the codebase where all dependencies are assembled |
| **Table Store** | Our generic interface for database operations (findAll, findById, append, updateById) |
| **MemoryTable** | An in-memory implementation of TableStore used for unit testing |
| **JWT** | JSON Web Token — used for Google API authentication |

---

## Google Sheets Structure Reference

### Ideas Sheet

| Column | Type | Description |
|---|---|---|
| `id` | UUID (8 chars) | Unique identifier |
| `title` | String | Idea title (max 80 chars) |
| `description` | String | Full description |
| `tech_stack` | String | Technologies used |
| `difficulty` | Easy/Medium/Hard | Estimated difficulty |
| `category` | See PROJECT_CATEGORIES | Project category |
| `submitted_by` | Discord User ID | Who submitted it |
| `submitted_by_name` | String | Display name |
| `status` | Active/Finalized/Archived | Current state |
| `thread_id` | Discord Channel ID | Discussion thread ID |
| `voting_message_id` | Discord Message ID | Voting card message ID in #voting-results |
| `created_at` | ISO 8601 | Creation timestamp |
| `updated_at` | ISO 8601 | Last update timestamp |

### Grades Sheet

| Column | Type | Description |
|---|---|---|
| `id` | UUID (8 chars) | Unique identifier |
| `idea_id` | UUID (8 chars) | Which idea this grade is for |
| `user_id` | Discord User ID | Who graded |
| `user_name` | String | Display name |
| `learning` | 1–5 | Learning Value score |
| `impact` | 1–5 | Problem Impact score |
| `feasibility` | 1–5 | Feasibility score |
| `innovation` | 1–5 | Innovation score |
| `created_at` | ISO 8601 | When the grade was submitted |

### Logs Sheet

| Column | Type | Description |
|---|---|---|
| `id` | UUID (8 chars) | Unique identifier |
| `timestamp` | ISO 8601 | When the action happened |
| `actor_id` | Discord User ID | Who did it |
| `actor_name` | String | Display name |
| `action_type` | String | e.g., `idea.create`, `idea.grade`, `idea.comment` |
| `target_id` | UUID (8 chars) | The idea/decision this action targets |
| `before` | JSON string | State before the change |
| `after` | JSON string | State after the change |
| `detail` | String | Human-readable description or comment text |

### Decisions Sheet

| Column | Type | Description |
|---|---|---|
| `id` | UUID (8 chars) | Unique identifier |
| `idea_id` | UUID (8 chars) | Which idea was chosen |
| `reasoning` | String | Why this idea was chosen |
| `decided_by` | Discord User ID | Who made the decision |
| `decided_by_name` | String | Display name |
| `decided_at` | ISO 8601 | When the decision was made |

---

*End of documentation. If you have questions about any part of this codebase, refer to the relevant section above or explore the source files directly.*
