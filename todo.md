# GradBot TODO List

This document tracks the implementation status of the GradBot project based on the original project plan.

## Phase 1: Foundation
- [x] Bot scaffold and event loading (`bot.ts`, `index.ts`)
- [x] Slash command registration framework (`discord/registerCommands.ts`)
- [x] Google Sheets authentication and connection (`sheets/client.ts`)
- [x] Base Sheet Table interface and implementation (`sheets/sheet-table.ts`)
- [x] Dedicated Discord logger for `#bot-logs` and `#bot-errors` (`services/logger.ts`)
- [x] Wiring of sheet writes to Discord channel logs
- [x] `/idea add` command (Discord Modal)
- [x] `/idea list` command

## Phase 2: Ideas & Grading
- [x] Idea details embeds (`ui/embeds/idea.ts`) — professional, no emojis
- [x] Multi-criteria grading system (Learning, Impact, Feasibility, Innovation) — replaces voting
- [x] Grade progress bars in embed display
- [x] Project categories (B2B, Fintech, EdTech, HealthTech, Social, Dev Tools, Other)
- [x] `/idea archive` flow with permission checks (`permissions.ts`)
- [x] Discord Modal for `/idea add` with validation (difficulty + category)
- [x] Grading Modal triggered by "Grade This Idea" button
- [x] Idea discussion auto-threading (thread name truncated to 100 chars)
- [x] `/idea comment` command — posts to thread + logged
- [x] Comments displayed inline in `/idea view` embed
- [x] `/decide finalize <id>` command
- [x] `/decide reasoning <text>` command
- [x] `/decide status` command
- [x] Decision sheet repository
- [x] Shared design system (`ui/design.ts`) — custom color palette (#778873, #A1BC98, #DCCFC0, #FDF6ED)
- [x] All embeds and logger use unified palette — no emojis anywhere
- [x] Cleanup of empty scaffold directories
- [x] Comprehensive unit tests (11 tests covering grades, comments, decisions)

## Phase 3: Development Tracking (Not Started)
- [ ] Tasks Sheet repository (`tasks.repo.ts`)
- [ ] Milestones Sheet repository (`milestones.repo.ts`)
- [ ] Standups Sheet repository
- [ ] `/task add` (modal)
- [ ] `/task list` (filtered view)
- [ ] `/task status` (state updates)
- [ ] `/task assign`
- [ ] `/task delete`
- [ ] `/milestone add`
- [ ] `/milestone list`
- [ ] `/milestone progress` (auto-computed)
- [ ] `/standup` command

## Phase 4: Automation & Admin (Not Started)
- [ ] Cron-based daily/weekly digest service
- [ ] Deadline reminder pings
- [ ] `/digest now` command
- [ ] `/admin resync-sheets` command for cache refreshing
- [ ] `/admin config` command
- [ ] `/log search` command

## Infrastructure & Polish
- [x] Proper error handling and deferral to avoid Discord 3-second timeouts
- [x] Input validation (difficulty, category, grade values)
- [ ] In-memory caching for Sheets API rate limit safety
- [ ] README setup guide
