import { Client, Collection, Events, GatewayIntentBits, TextChannel } from 'discord.js';
import { ENV } from './config';
import { createCommands } from './commands';
import type { BotCommand, CommandContext } from './commands/types';
import { registerGuildCommands } from './discord/registerCommands';
import { DecisionService } from './services/decision-service';
import { IdeaService, UserFacingError } from './services/idea-service';
import { DiscordLogger } from './services/logger';
import { getSheetsClient, testSheetConnection } from './sheets/client';
import { GoogleSheetsTable } from './sheets/sheet-table';
import { DecisionRepo } from './sheets/decision.repo';
import { GradesRepo } from './sheets/grades.repo';
import { IdeasRepo } from './sheets/ideas.repo';
import { LogsRepo } from './sheets/logs.repo';
import {
    DECISION_COLUMNS,
    GRADE_COLUMNS,
    IDEA_COLUMNS,
    IDEA_DIFFICULTIES,
    LOG_COLUMNS,
    PROJECT_CATEGORIES,
    type Decision,
    type Grade,
    type Idea,
    type IdeaDifficulty,
    type LogEntry,
    type ProjectCategory,
} from './types';
import { ideaEmbed } from './ui/embeds/idea';
import { ideaActionButtons } from './ui/components/idea-buttons';
import { ideaGradeModal } from './ui/modals/idea-grade';

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
                    `**GradBot is online!**\n` +
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
                `**GradBot is online!**\n` +
                `Google Sheets is **not configured** — data will not be persisted.\n` +
                `Add GOOGLE_SHEET_ID, GOOGLE_PRIVATE_KEY, and GOOGLE_SERVICE_ACCOUNT_EMAIL to .env.`,
            );
        }
    });

    client.on(Events.InteractionCreate, async (interaction) => {
        // Handle modal submissions
        if (interaction.isModalSubmit()) {
            if (interaction.customId === 'modal-idea-add') {
                await handleIdeaAddModal(interaction, context, discordLogger);
            } else if (interaction.customId.startsWith('modal-idea-grade_')) {
                await handleIdeaGradeModal(interaction, context, discordLogger);
            }
            return;
        }

        // Handle button clicks
        if (interaction.isButton()) {
            if (interaction.customId.startsWith('grade_')) {
                const ideaId = interaction.customId.replace('grade_', '');
                await interaction.showModal(ideaGradeModal(ideaId));
            } else if (interaction.customId.startsWith('comments_')) {
                const ideaId = interaction.customId.replace('comments_', '');
                await handleViewCommentsButton(interaction, ideaId, context, discordLogger);
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

// ─── Modal Handlers ──────────────────────────────────────────────────────────

async function handleIdeaAddModal(interaction: any, context: CommandContext, logger: DiscordLogger) {
    try {
        await interaction.deferReply();
        const title = interaction.fields.getTextInputValue('idea-title');
        const description = interaction.fields.getTextInputValue('idea-description');
        const rawDifficulty = interaction.fields.getTextInputValue('idea-difficulty').trim();
        const rawCategory = interaction.fields.getTextInputValue('idea-category').trim();

        // Validate difficulty
        const difficulty = normalizeDifficulty(rawDifficulty);
        if (!difficulty) {
            await interaction.editReply({ content: `Invalid difficulty "${rawDifficulty}". Use: Easy, Medium, or Hard.` });
            return;
        }

        // Validate category
        const category = normalizeCategory(rawCategory);
        if (!category) {
            await interaction.editReply({ content: `Invalid category "${rawCategory}". Use: ${PROJECT_CATEGORIES.join(', ')}.` });
            return;
        }

        const actor = {
            id: interaction.user.id,
            name: interaction.user.globalName ?? interaction.user.username,
        };

        const idea = await context.ideas.createIdea(
            { title, description, techStack: '', difficulty, category },
            actor,
        );

        const detailed = await context.ideas.getIdea(idea.id);
        await interaction.editReply({
            content: `Idea **${idea.title}** submitted successfully. Check <#${context.env.DISCUSSION_CHANNEL_ID}> for the discussion thread.`,
        });

        if (context.env.DISCUSSION_CHANNEL_ID) {
            try {
                const discussionChannel = await interaction.client.channels.fetch(context.env.DISCUSSION_CHANNEL_ID);
                if (discussionChannel?.isTextBased()) {
                    const textChannel = discussionChannel as TextChannel;
                    const message = await textChannel.send({
                        content: `Discussion thread for Idea: **${idea.title}**`,
                        embeds: [ideaEmbed(detailed)],
                        components: [ideaActionButtons(idea.id)],
                    });
                    const threadName = `Discussion: ${idea.title}`.slice(0, 100);
                    const thread = await message.startThread({ name: threadName });
                    await context.ideas.updateIdeaThread(idea.id, thread.id);
                }
            } catch (err) {
                console.error('Thread creation failed in discussion channel:', err);
            }
        }
    } catch (error) {
        console.error('Idea add modal failed:', error);
        await logger.logError(error, 'Modal: idea-add').catch(() => {});
        const msg = error instanceof UserFacingError ? error.message : 'Failed to add idea.';
        if (interaction.deferred || interaction.replied) await interaction.editReply({ content: msg });
        else await interaction.reply({ content: msg, flags: ['Ephemeral'] });
    }
}

async function handleIdeaGradeModal(interaction: any, context: CommandContext, logger: DiscordLogger) {
    try {
        await interaction.deferReply({ flags: ['Ephemeral'] });

        // customId is like 'modal-idea-grade_id-123'
        const ideaId = interaction.customId.replace('modal-idea-grade_', '');

        const rawL = interaction.fields.getTextInputValue('grade-learning');
        const rawI = interaction.fields.getTextInputValue('grade-impact');
        const rawF = interaction.fields.getTextInputValue('grade-feasibility');
        const rawN = interaction.fields.getTextInputValue('grade-innovation');

        const learning = parseGradeValue(rawL);
        const impact = parseGradeValue(rawI);
        const feasibility = parseGradeValue(rawF);
        const innovation = parseGradeValue(rawN);

        if (learning === null || impact === null || feasibility === null || innovation === null) {
            await interaction.editReply({ content: 'All grades must be a number between 1 and 5.' });
            return;
        }

        const actor = {
            id: interaction.user.id,
            name: interaction.user.globalName ?? interaction.user.username,
        };

        const row = await context.ideas.gradeIdea(ideaId, { learning, impact, feasibility, innovation }, actor);
        await interaction.editReply({ content: `Grade saved for **${row.idea.title}** (Overall: ${row.grades.overall.toFixed(1)}/5).` });

        // Update the original message's embed to reflect the new grades
        try {
            await interaction.message.edit({
                embeds: [ideaEmbed(row)],
                components: [ideaActionButtons(row.idea.id)],
            });
        } catch {
            // Best effort update of original embed
        }

        // Update the voting results channel message
        if (context.env.VOTING_RESULTS_CHANNEL_ID) {
            try {
                const resultsChannel = await interaction.client.channels.fetch(context.env.VOTING_RESULTS_CHANNEL_ID);
                if (resultsChannel?.isTextBased()) {
                    const textChannel = resultsChannel as TextChannel;
                    if (row.idea.voting_message_id) {
                        try {
                            const votingMessage = await textChannel.messages.fetch(row.idea.voting_message_id);
                            await votingMessage.edit({
                                embeds: [ideaEmbed(row)],
                                components: [ideaActionButtons(row.idea.id)],
                            });
                        } catch (err) {
                            console.error('Could not fetch existing voting message:', err);
                        }
                    } else {
                        const votingMessage = await textChannel.send({
                            embeds: [ideaEmbed(row)],
                            components: [ideaActionButtons(row.idea.id)],
                        });
                        await context.ideas.updateVotingMessageId(row.idea.id, votingMessage.id);
                    }
                }
            } catch (err) {
                console.error('Voting results channel update failed:', err);
            }
        }
    } catch (error) {
        console.error('Grade modal failed:', error);
        await logger.logError(error, 'Modal: idea-grade').catch(() => {});
        const msg = error instanceof UserFacingError ? error.message : 'Failed to save grade.';
        if (interaction.deferred || interaction.replied) await interaction.editReply({ content: msg });
        else await interaction.reply({ content: msg, flags: ['Ephemeral'] });
    }
}

async function handleViewCommentsButton(interaction: any, ideaId: string, context: CommandContext, logger: DiscordLogger) {
    try {
        await interaction.deferReply({ flags: ['Ephemeral'] });
        const comments = await context.ideas.getCommentsForIdea(ideaId);
        
        if (comments.length === 0) {
            await interaction.editReply({ content: 'There are no comments on this idea yet.' });
            return;
        }

        const lines = comments.map(c => `**${c.actor_name}** (${new Date(c.timestamp).toLocaleString()}):\n> ${c.text}`);
        
        // Discord max message length is 2000, so we slice if it gets too long
        let content = `**Comments:**\n\n${lines.join('\n\n')}`;
        if (content.length > 2000) {
            content = content.slice(0, 1950) + '\n\n... (some comments were truncated)';
        }

        await interaction.editReply({ content });
    } catch (error) {
        console.error('View comments button failed:', error);
        await logger.logError(error, 'Button: comments').catch(() => {});
        const msg = 'Failed to load comments.';
        if (interaction.deferred || interaction.replied) await interaction.editReply({ content: msg });
        else await interaction.reply({ content: msg, flags: ['Ephemeral'] });
    }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function normalizeDifficulty(raw: string): IdeaDifficulty | null {
    const lower = raw.toLowerCase();
    for (const d of IDEA_DIFFICULTIES) {
        if (d.toLowerCase() === lower) return d;
    }
    return null;
}

function normalizeCategory(raw: string): ProjectCategory | null {
    const lower = raw.toLowerCase().replace(/\s+/g, '');
    for (const c of PROJECT_CATEGORIES) {
        if (c.toLowerCase().replace(/\s+/g, '') === lower) return c;
    }
    return null;
}

function parseGradeValue(raw: string): number | null {
    const n = Number(raw.trim());
    if (Number.isNaN(n) || n < 1 || n > 5 || !Number.isInteger(n)) return null;
    return n;
}

// ─── Context Factory ─────────────────────────────────────────────────────────

function createCommandContext(env: typeof ENV, logger: DiscordLogger): CommandContext {
    const sheets = getSheetsClient(env);

    const logsRepo = new LogsRepo(new GoogleSheetsTable<LogEntry>(sheets, 'Logs', LOG_COLUMNS, env.GOOGLE_SHEET_ID));
    const ideasRepo = new IdeasRepo(new GoogleSheetsTable<Idea>(sheets, 'Ideas', IDEA_COLUMNS, env.GOOGLE_SHEET_ID));
    const gradesRepo = new GradesRepo(new GoogleSheetsTable<Grade>(sheets, 'Grades', GRADE_COLUMNS, env.GOOGLE_SHEET_ID));
    const decisionRepo = new DecisionRepo(new GoogleSheetsTable<Decision>(sheets, 'Decisions', DECISION_COLUMNS, env.GOOGLE_SHEET_ID));

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
        logger,
    };
}
