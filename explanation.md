# GradBot — Source Code Explanation

## Overview
**GradBot** is a Discord bot designed to manage the lifecycle of a student team's graduation project. It acts as a central hub to brainstorm, vote on ideas, track tasks, and record milestones, using **Google Sheets** as its backend database. 

This document explains the architecture of the bot, outlining every file in the source code and providing an abstracted interface of the classes and functions within them to explain exactly what everything does.

---

## 1. Entry & Bootstrap (`src/`)

### `index.ts`
**Purpose:** The main entry point of the application. It instantiates the bot and starts it.
```typescript
// Asynchronous function that calls createGradBot() and bot.start(). 
// Catches any startup errors and exits the process.
async function main(): Promise<void>
```

### `bot.ts`
**Purpose:** Sets up the Discord client, registers event listeners, and wires together the bot's services (Google Sheets, Discord logger, and slash commands).
```typescript
interface GradBot {
    client: Client;              // The discord.js client
    commands: BotCommand[];      // List of loaded slash commands
    context: CommandContext;     // The shared dependency injection context
    start(): Promise<void>;      // Registers commands with Discord API and logs in
}

// Initializes the Discord client, creates the Discord channel logger (DiscordLogger), 
// sets up the CommandContext, and registers `ready` and `interactionCreate` event handlers.
function createGradBot(env?: typeof ENV): GradBot

// Instantiates the Google Sheets API client and initializes the repositories 
// (IdeasRepo, VotesRepo, LogsRepo) inside the IdeaService.
function createCommandContext(env: typeof ENV, logger: DiscordLogger): CommandContext
```

### `config.ts`
**Purpose:** Loads and exports environment variables.
```typescript
// An object containing the loaded configuration (Discord tokens, Google credentials, Channel IDs).
export const ENV: Record<string, string>;
```

### `types.ts`
**Purpose:** Contains all the central TypeScript interfaces and type definitions used across the application.
```typescript
// Core Data Models mapped to Sheet Rows
interface Idea { id, title, description, difficulty, status, submitted_by, ... }
interface Vote { id, idea_id, user_id, vote, ... }
interface LogEntry { id, timestamp, actor_id, action_type, target_id, before, after, detail }

// Enums / Allowed Values
const IDEA_DIFFICULTIES = ['Easy', 'Medium', 'Hard'];
const IDEA_STATUSES = ['Active', 'Finalized', 'Archived'];
const VOTE_VALUES = ['up', 'down', 'unsure'];

// Aggregated View Models
interface VoteTally { up: number, down: number, unsure: number, total: number }
interface IdeaWithTally { idea: Idea, tally: VoteTally }
```

### `permissions.ts`
**Purpose:** Handles access control for privileged commands.
```typescript
// Checks if the user who triggered the interaction has the ADMIN_ROLE_ID or LEAD_ROLE_ID.
function canManageProject(interaction: ChatInputCommandInteraction, env: EnvShape): boolean
```

---

## 2. Commands Layer (`src/commands/`)

### `types.ts`
**Purpose:** Defines the standard interface for all bot commands and the context they receive when executed.
```typescript
interface CommandContext {
    env: typeof ENV;          // Environment variables
    ideas: IdeaService;       // The business logic service for ideas
    logger: DiscordLogger;    // The service that posts to #bot-logs
}

interface BotCommand {
    // The slash command definition sent to Discord
    data: SlashCommandBuilder | SlashCommandSubcommandsOnlyBuilder; 
    
    // The execution logic when a user runs the command
    execute(interaction: ChatInputCommandInteraction, context: CommandContext): Promise<void>;
}
```

### `index.ts`
**Purpose:** Exports an array of all registered bot commands.
```typescript
// Returns the list of active commands to be loaded by bot.ts
function createCommands(): BotCommand[]
```

### `idea.ts`
**Purpose:** Implements the `/idea` command and its subcommands (`add`, `list`, `view`, `vote`, `archive`).
```typescript
// The command definition object containing the execute() function that:
// 1. Defers the interaction reply
// 2. Parses the subcommand and arguments
// 3. Delegates logic to context.ideas (IdeaService)
// 4. Edits the reply with an embed
export const ideaCommand: BotCommand;

// Helper to extract the user's ID and name to record who performed the action.
function actorFromInteraction(interaction: Interaction): Actor;
```

---

## 3. Discord Infrastructure (`src/discord/`)

### `registerCommands.ts`
**Purpose:** Handles pushing the slash command definitions to the Discord API.
```typescript
// Uses the Discord REST API to register the bot's commands to the specific 
// guild (server) defined in the .env file.
async function registerGuildCommands(commands: BotCommand[], env: typeof ENV): Promise<void>
```

---

## 4. UI Layer (`src/ui/`)

### `embeds/idea.ts`
**Purpose:** Contains builders for formatting idea data into rich Discord embeds.
```typescript
// Returns a single formatted card for an idea showing its details, status, and vote tally.
function ideaEmbed(data: IdeaWithTally): EmbedBuilder

// Returns a consolidated embed listing multiple ideas and their vote summaries.
function ideaListEmbed(rows: IdeaWithTally[], status: string): EmbedBuilder
```

---

## 5. Services Layer (`src/services/`)

### `logger.ts`
**Purpose:** A dedicated Discord channel logger that mirrors actions into `#bot-logs` and `#bot-errors`.
```typescript
class DiscordLogger {
    // Fetches the physical Discord channel objects using the IDs from the environment.
    init(): Promise<void>;
    
    // Formats a LogEntry into a rich embed (showing before/after states) 
    // and posts it to the #bot-logs channel.
    logAction(entry: LogEntry): Promise<void>;
    
    // Posts generic system messages (like startup notifications).
    logSystem(message: string): Promise<void>;
    
    // Formats an error and posts it to the #bot-errors channel.
    logError(error: unknown, context?: string): Promise<void>;
}
```

### `idea-service.ts`
**Purpose:** The core business logic for handling ideas. It acts as an intermediary between the Discord commands and the database repositories.
```typescript
class IdeaService {
    // A callback triggered whenever an action is logged (wired to the DiscordLogger in bot.ts).
    onLog?: (entry: LogEntry) => void;

    // Validates input, generates an ID, saves to the IdeasRepo, and logs the creation.
    createIdea(input: CreateIdeaInput, actor: Actor): Promise<Idea>;
    
    // Fetches ideas and attaches their vote tallies.
    listIdeas(status?: IdeaStatus): Promise<IdeaWithTally[]>;
    
    // Fetches a single idea and its tally.
    getIdea(id: string): Promise<IdeaWithTally>;
    
    // Validates the idea is active, upserts the vote, and logs the action.
    voteIdea(id: string, voteValue: VoteValue, actor: Actor): Promise<IdeaWithTally>;
    
    // Updates an idea's status to 'Archived' and logs the change.
    archiveIdea(id: string, actor: Actor): Promise<Idea>;
    
    // Internal helper that appends a record to the LogsRepo and fires the onLog callback.
    private log(actor, actionType, targetId, before, after, detail): Promise<LogEntry>;
}
```

---

## 6. Database Layer (Google Sheets) (`src/sheets/`)

This layer abstracts the Google Sheets API so the rest of the application interacts with it exactly like a traditional database.

### `client.ts`
**Purpose:** Handles authentication with Google APIs.
```typescript
// Authenticates using the Service Account credentials and returns the initialized API client.
function getSheetsClient(env?: typeof ENV): sheets_v4.Sheets;

// Attempts to read the sheet metadata to verify connectivity on startup.
function testSheetConnection(env?: typeof ENV): Promise<boolean>;
```

### `sheet-table.ts`
**Purpose:** A generic class that turns a specific tab in a Google Sheet into a workable database table.
```typescript
// The contract for any table storage (allows swapping Sheets for Memory or a real DB).
interface TableStore<T> {
    findAll(): Promise<T[]>;
    findById(id: string): Promise<T | null>;
    append(row: T): Promise<T>;
    updateById(id: string, patch: Partial<T>): Promise<T | null>;
}

// The Google Sheets implementation of the table store.
class GoogleSheetsTable<T> implements TableStore<T> {
    // Reads the entire sheet tab, uses the first row as headers, 
    // and parses the remaining rows into typed objects.
    findAll(): Promise<T[]>;
    
    // Helper to find a specific row.
    findById(id: string): Promise<T | null>;
    
    // Appends a new row to the end of the sheet.
    append(row: T): Promise<T>;
    
    // Locates a row by its ID and updates specific columns.
    updateById(id: string, patch: Partial<T>): Promise<T | null>;
}
```

### `memory-table.ts`
**Purpose:** An in-memory implementation of `TableStore`.
```typescript
// Useful for writing unit tests without hitting the real Google Sheets API.
class MemoryTable<T> implements TableStore<T>
```

### `ideas.repo.ts`, `votes.repo.ts`, `logs.repo.ts`
**Purpose:** Domain-specific repositories that wrap a `TableStore` and provide typed, specific queries for business entities.
```typescript
class IdeasRepo {
    create(idea: Idea): Promise<Idea>;
    findAll(status?: IdeaStatus): Promise<Idea[]>;
    findById(id: string): Promise<Idea | null>;
    updateById(id: string, patch: Partial<Idea>): Promise<Idea | null>;
}

class VotesRepo {
    findByIdeaId(ideaId: string): Promise<Vote[]>;
    
    // Summarizes the up/down/unsure votes for an idea.
    tallyForIdea(ideaId: string): Promise<VoteTally>;
    
    // Finds a user's existing vote for an idea and updates it, or creates a new one.
    upsert(vote: Vote): Promise<VoteUpsertResult>;
}

class LogsRepo {
    append(entry: LogEntry): Promise<LogEntry>;
    findAll(): Promise<LogEntry[]>;
}
```
