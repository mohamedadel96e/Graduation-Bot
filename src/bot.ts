import { Client, Collection, Events, GatewayIntentBits } from 'discord.js';
import { ENV } from './config';
import { createCommands } from './commands';
import type { BotCommand, CommandContext } from './commands/types';
import { registerGuildCommands } from './discord/registerCommands';
import { DecisionService } from './services/decision-service';
import { IdeaService } from './services/idea-service';
import { DiscordLogger } from './services/logger';
import { getSheetsClient, testSheetConnection } from './sheets/client';
import { GoogleSheetsTable } from './sheets/sheet-table';
import { DecisionRepo } from './sheets/decision.repo';
import { IdeasRepo } from './sheets/ideas.repo';
import { LogsRepo } from './sheets/logs.repo';
import { VotesRepo } from './sheets/votes.repo';
import {
    DECISION_COLUMNS,
    IDEA_COLUMNS,
    LOG_COLUMNS,
    VOTE_COLUMNS,
    type Decision,
    type Idea,
    type LogEntry,
    type Vote,
} from './types';

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

    // Prevent unhandled errors from crashing the process
    client.on('error', (error) => {
        console.error('Discord client error:', error);
    });

    client.once(Events.ClientReady, async (readyClient) => {
        console.log(`Logged in as ${readyClient.user.tag}`);

        // Initialize the Discord logger (resolve channel references)
        await discordLogger.init();

        // Test Google Sheets connection
        if (env.GOOGLE_SHEET_ID && env.GOOGLE_PRIVATE_KEY && env.GOOGLE_SERVICE_ACCOUNT_EMAIL) {
            const sheetsOk = await testSheetConnection(env);
            if (sheetsOk) {
                await discordLogger.logSystem(
                    `**GradBot is online!** \n` +
                    `Connected to Google Sheets.\n` +
                    `Ready to manage your graduation project.\n\n` +
                    `Use \`/idea add\` to submit a new idea.`,
                );
            } else {
                await discordLogger.logError('Google Sheets connection failed on startup.', 'ClientReady');
            }
        } else {
            console.warn('Google Sheets configuration is missing from .env, skipping connection test.');
            await discordLogger.logSystem(
                `**GradBot is online!** ⚠️\n` +
                `Google Sheets is **not configured** — data will not be persisted.\n` +
                `Add GOOGLE_SHEET_ID, GOOGLE_PRIVATE_KEY, and GOOGLE_SERVICE_ACCOUNT_EMAIL to .env.`,
            );
        }
    });

    client.on(Events.InteractionCreate, async (interaction) => {
        if (interaction.isModalSubmit()) {
            if (interaction.customId === 'modal-idea-add') {
                await handleIdeaAddModal(interaction, context);
            }
            return;
        }

        if (interaction.isButton()) {
            if (interaction.customId.startsWith('vote-')) {
                await handleVoteButton(interaction, context);
            }
            return;
        }

        if (!interaction.isChatInputCommand()) {
            return;
        }

        const command = commandMap.get(interaction.commandName);

        if (!command) {
            await interaction.reply({ content: 'Unknown command.', flags: ['Ephemeral'] });
            return;
        }

        try {
            await command.execute(interaction, context);
        } catch (error) {
            console.error(`Command ${interaction.commandName} failed:`, error);

            // Log the error to #bot-errors
            await discordLogger.logError(error, `Command: /${interaction.commandName}`).catch(() => {});

            try {
                const content = 'Something went wrong while running that command.';
                if (interaction.deferred || interaction.replied) {
                    await interaction.editReply({ content });
                } else {
                    await interaction.reply({ content, flags: ['Ephemeral'] });
                }
            } catch {
                // Interaction is fully expired — nothing we can do
                console.error('Could not send error response to user (interaction expired).');
            }
        }
    });

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

import { ideaEmbed } from './ui/embeds/idea';
import { ideaVotingButtons } from './ui/components/idea-buttons';
import type { IdeaDifficulty, VoteValue } from './types';
import { UserFacingError } from './services/idea-service';

async function handleIdeaAddModal(interaction: any, context: CommandContext) {
    try {
        await interaction.deferReply();
        const title = interaction.fields.getTextInputValue('idea-title');
        const description = interaction.fields.getTextInputValue('idea-description');
        const difficulty = interaction.fields.getTextInputValue('idea-difficulty') as IdeaDifficulty;
        const techStack = interaction.fields.getTextInputValue('idea-tech-stack');

        const actor = {
            id: interaction.user.id,
            name: interaction.user.globalName ?? interaction.user.username,
        };

        const idea = await context.ideas.createIdea(
            { title, description, techStack, difficulty },
            actor,
        );

        const detailed = await context.ideas.getIdea(idea.id);
        const message = await interaction.editReply({ 
            embeds: [ideaEmbed(detailed)],
            components: [ideaVotingButtons(idea.id)]
        });

        try {
            const thread = await message.startThread({ name: `Discussion: ${idea.title}` });
            await context.ideas.updateIdeaThread(idea.id, thread.id);
        } catch {
            // Best effort
        }
    } catch (error) {
        console.error('Modal failed:', error);
        if (error instanceof UserFacingError) {
            if (interaction.deferred || interaction.replied) await interaction.editReply({ content: error.message });
            else await interaction.reply({ content: error.message, flags: ['Ephemeral'] });
        } else {
            if (interaction.deferred || interaction.replied) await interaction.editReply({ content: 'Failed to add idea.' });
            else await interaction.reply({ content: 'Failed to add idea.', flags: ['Ephemeral'] });
        }
    }
}

async function handleVoteButton(interaction: any, context: CommandContext) {
    try {
        await interaction.deferReply({ flags: ['Ephemeral'] });
        
        // customId is like 'vote-up_id-123'
        const [action, ideaId] = interaction.customId.split('_');
        const voteValue = action.replace('vote-', '') as VoteValue;

        const actor = {
            id: interaction.user.id,
            name: interaction.user.globalName ?? interaction.user.username,
        };

        const row = await context.ideas.voteIdea(ideaId, voteValue, actor);
        await interaction.editReply({ content: `Vote saved: ${voteValue}` });

        // Update the original message's embed to reflect the new tally
        try {
            await interaction.message.edit({ embeds: [ideaEmbed(row)] });
        } catch {
            // Best effort update
        }
    } catch (error) {
        console.error('Button failed:', error);
        if (error instanceof UserFacingError) {
            if (interaction.deferred || interaction.replied) await interaction.editReply({ content: error.message });
            else await interaction.reply({ content: error.message, flags: ['Ephemeral'] });
        } else {
            if (interaction.deferred || interaction.replied) await interaction.editReply({ content: 'Failed to vote.' });
            else await interaction.reply({ content: 'Failed to vote.', flags: ['Ephemeral'] });
        }
    }
}

function createCommandContext(env: typeof ENV, logger: DiscordLogger): CommandContext {
    const sheets = getSheetsClient(env);

    const logsRepo = new LogsRepo(new GoogleSheetsTable<LogEntry>(sheets, 'Logs', LOG_COLUMNS, env.GOOGLE_SHEET_ID));
    const ideasRepo = new IdeasRepo(new GoogleSheetsTable<Idea>(sheets, 'Ideas', IDEA_COLUMNS, env.GOOGLE_SHEET_ID));
    const votesRepo = new VotesRepo(new GoogleSheetsTable<Vote>(sheets, 'Votes', VOTE_COLUMNS, env.GOOGLE_SHEET_ID));
    const decisionRepo = new DecisionRepo(new GoogleSheetsTable<Decision>(sheets, 'Decisions', DECISION_COLUMNS, env.GOOGLE_SHEET_ID));

    return {
        env,
        ideas: new IdeaService({
            ideas: ideasRepo,
            votes: votesRepo,
            logs: logsRepo,
        }),
        decisions: new DecisionService({
            decision: decisionRepo,
            ideas: ideasRepo,
            logs: logsRepo,
        }),
        logger,
    };
}
