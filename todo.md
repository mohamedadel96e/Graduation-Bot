# GradBot TODO List

This document tracks the implementation status of the GradBot project based on the original project plan.

## Phase 1: Foundation
- [x] Bot scaffold and event loading (`bot.ts`, `index.ts`)
- [x] Slash command registration framework (`discord/registerCommands.ts`)
- [x] Google Sheets authentication and connection (`sheets/client.ts`)
- [x] Base Sheet Table interface and implementation (`sheets/sheet-table.ts`)
- [x] Dedicated Discord logger for `#bot-logs` and `#bot-errors` (`services/logger.ts`)
- [x] Wiring of sheet writes to Discord channel logs
- [x] Basic `/idea add` command (using slash options instead of modal)
- [x] `/idea list` command

## Phase 2: Ideas & Voting
- [x] Idea details embeds (`ui/embeds/idea.ts`)
- [x] Voting logic and tallies (`sheets/votes.repo.ts`, `/idea vote`)
- [x] `/idea archive` flow with permission checks (`permissions.ts`)
- [x] Implement Discord Modals for `/idea add` (currently uses command options)
- [x] Idea discussion auto-threading (spawning a thread under new ideas)
- [x] `/idea comment` command
- [x] `/decide finalize <id>` command
- [x] `/decide reasoning <text>` command
- [x] `/decide status` command
- [x] Decision sheet repository

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
- [ ] In-memory caching for Sheets API rate limit safety
- [ ] README setup guide
