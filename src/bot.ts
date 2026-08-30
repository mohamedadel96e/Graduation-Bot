import { Client, Collection, GatewayIntentBits } from 'discord.js';
import { ENV } from './config';
import { createCommands } from './commands';
import type { BotCommand, CommandContext } from './commands/types';
import { registerGuildCommands } from './discord/registerCommands';
import { DecisionService } from './services/decision-service';
import { IdeaService } from './services/idea-service';
import { DiscordLogger } from './services/logger';
import { getSheetsClient } from './sheets/client';
import { GoogleSheetsTable } from './sheets/sheet-table';
import { CachedTable } from './sheets/cached-table';
import { DecisionRepo } from './sheets/decision.repo';
import { GradesRepo } from './sheets/grades.repo';
import { IdeasRepo } from './sheets/ideas.repo';
import { LogsRepo } from './sheets/logs.repo';
import { TasksRepo } from './sheets/tasks.repo';
import { MilestonesRepo } from './sheets/milestones.repo';
import { StandupsRepo } from './sheets/standups.repo';
import {
    DECISION_COLUMNS,
    GRADE_COLUMNS,
    IDEA_COLUMNS,
    LOG_COLUMNS,
    TASK_COLUMNS,
    MILESTONE_COLUMNS,
    STANDUP_COLUMNS,
    type Decision,
    type Grade,
    type Idea,
    type LogEntry,
    type Task,
    type Milestone,
    type Standup,
} from './types';
import { TaskService } from './services/task-service';
import { MilestoneService } from './services/milestone-service';
import { StandupService } from './services/standup-service';
import { scheduleStandupDigest } from './cron/standup-digest';
import { setupReadyEvent } from './events/ready';
import { setupInteractionCreateEvent } from './events/interactionCreate';

export interface GradBot {
    client: Client;
    commands: BotCommand[];
    context: CommandContext;
    start(): Promise<void>;
}

export function createGradBot(env = ENV): GradBot {
    const client = new Client({
        intents: [GatewayIntentBits.Guilds],
    });
    const commands = createCommands();
    const commandMap = new Collection<string, BotCommand>(
        commands.map((command) => [command.data.name, command]),
    );

    // Create the Discord channel logger
    const discordLogger = new DiscordLogger(client, env.LOG_CHANNEL_ID, env.ERROR_CHANNEL_ID);

    // Create command context (includes sheets repos + logger)
    const context = createCommandContext(env, discordLogger);

    // Wire idea service logs → Discord channel
    context.ideas.onLog = (entry) => {
        discordLogger.logAction(entry).catch((err) => {
            console.error('Discord logger failed:', err);
        });
    };

    // Wire decision service logs → Discord channel
    context.decisions.onLog = (entry) => {
        discordLogger.logAction(entry).catch((err) => {
            console.error('Discord logger failed:', err);
        });
    };

    // Schedule Daily Digest Cron Job
    scheduleStandupDigest(client, context, discordLogger);

    // Prevent unhandled errors from crashing the process
    client.on('error', (error) => {
        console.error('Discord client error:', error);
    });

    // Setup Discord Events
    setupReadyEvent(client, discordLogger, env);
    setupInteractionCreateEvent(client, commandMap, context, discordLogger);

    return {
        client,
        commands,
        context,
        async start() {
            if (!env.DISCORD_TOKEN) {
                throw new Error('DISCORD_TOKEN is missing in the .env file.');
            }

            await registerGuildCommands(commands, env);
            await client.login(env.DISCORD_TOKEN);
        },
    };
}

// ─── Context Factory ─────────────────────────────────────────────────────────

function createCommandContext(env: typeof ENV, logger: DiscordLogger): CommandContext {
    const sheets = getSheetsClient(env);

    const logsRepo = new LogsRepo(new CachedTable(new GoogleSheetsTable<LogEntry>(sheets, 'Logs', LOG_COLUMNS, env.GOOGLE_SHEET_ID)));
    const ideasRepo = new IdeasRepo(new CachedTable(new GoogleSheetsTable<Idea>(sheets, 'Ideas', IDEA_COLUMNS, env.GOOGLE_SHEET_ID)));
    const gradesRepo = new GradesRepo(new CachedTable(new GoogleSheetsTable<Grade>(sheets, 'Grades', GRADE_COLUMNS, env.GOOGLE_SHEET_ID)));
    const decisionRepo = new DecisionRepo(new CachedTable(new GoogleSheetsTable<Decision>(sheets, 'Decisions', DECISION_COLUMNS, env.GOOGLE_SHEET_ID)));
    const tasksRepo = new TasksRepo(new CachedTable(new GoogleSheetsTable<Task>(sheets, 'Tasks', TASK_COLUMNS, env.GOOGLE_SHEET_ID)));
    const milestonesRepo = new MilestonesRepo(new CachedTable(new GoogleSheetsTable<Milestone>(sheets, 'Milestones', MILESTONE_COLUMNS, env.GOOGLE_SHEET_ID)));
    const standupsRepo = new StandupsRepo(new CachedTable(new GoogleSheetsTable<Standup>(sheets, 'Standups', STANDUP_COLUMNS, env.GOOGLE_SHEET_ID)));

    return {
        env,
        ideas: new IdeaService({
            ideas: ideasRepo,
            grades: gradesRepo,
            logs: logsRepo,
        }),
        decisions: new DecisionService({
            decision: decisionRepo,
            ideas: ideasRepo,
            logs: logsRepo,
        }),
        tasks: new TaskService({
            tasks: tasksRepo,
            logs: logsRepo,
        }),
        milestones: new MilestoneService({
            milestones: milestonesRepo,
            logs: logsRepo,
        }),
        standups: new StandupService({
            standups: standupsRepo,
            logs: logsRepo,
        }),
        logger,
    };
}
