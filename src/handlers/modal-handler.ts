import { TextChannel, ModalSubmitInteraction } from 'discord.js';
import type { CommandContext } from '../commands/types';
import type { DiscordLogger } from '../services/logger';
import { UserFacingError } from '../services/idea-service';
import { ideaEmbed } from '../ui/embeds/idea';
import { ideaActionButtons } from '../ui/components/idea-buttons';
import { IDEA_DIFFICULTIES, PROJECT_CATEGORIES, IdeaDifficulty, ProjectCategory } from '../types';

export async function handleModalSubmit(
    interaction: ModalSubmitInteraction,
    context: CommandContext,
    logger: DiscordLogger,
) {
    if (interaction.customId === 'modal-idea-add') {
        await handleIdeaAddModal(interaction, context, logger);
    } else if (interaction.customId.startsWith('modal-idea-grade_')) {
        await handleIdeaGradeModal(interaction, context, logger);
    } else if (interaction.customId.startsWith('modal-idea-comment_')) {
        await handleIdeaCommentModal(interaction, context, logger);
    } else if (interaction.customId === 'modal-task-add') {
        await handleTaskAddModal(interaction, context, logger);
    } else if (interaction.customId === 'modal-milestone-add') {
        await handleMilestoneAddModal(interaction, context, logger);
    } else if (interaction.customId === 'modal-standup') {
        await handleStandupModal(interaction, context, logger);
    }
}

async function handleIdeaAddModal(
    interaction: ModalSubmitInteraction,
    context: CommandContext,
    logger: DiscordLogger,
) {
    try {
        await interaction.deferReply();
        const title = interaction.fields.getTextInputValue('idea-title');
        const description = interaction.fields.getTextInputValue('idea-description');
        const rawDifficulty = interaction.fields.getTextInputValue('idea-difficulty').trim();
        const rawCategory = interaction.fields.getTextInputValue('idea-category').trim();

        const difficulty = normalizeDifficulty(rawDifficulty);
        if (!difficulty) {
            await interaction.editReply({
                content: `Invalid difficulty "${rawDifficulty}". Use: Easy, Medium, or Hard.`,
            });
            return;
        }

        const category = normalizeCategory(rawCategory);
        if (!category) {
            await interaction.editReply({
                content: `Invalid category "${rawCategory}". Use: ${PROJECT_CATEGORIES.join(', ')}.`,
            });
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
                const discussionChannel = await interaction.client.channels.fetch(
                    context.env.DISCUSSION_CHANNEL_ID,
                );
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
        if (interaction.deferred || interaction.replied)
            await interaction.editReply({ content: msg });
        else await interaction.reply({ content: msg, flags: ['Ephemeral'] });
    }
}

async function handleIdeaGradeModal(
    interaction: ModalSubmitInteraction,
    context: CommandContext,
    logger: DiscordLogger,
) {
    try {
        await interaction.deferReply({ flags: ['Ephemeral'] });
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
            await interaction.editReply({
                content: 'All grades must be a number between 1 and 5.',
            });
            return;
        }

        const actor = {
            id: interaction.user.id,
            name: interaction.user.globalName ?? interaction.user.username,
        };

        const row = await context.ideas.gradeIdea(
            ideaId,
            { learning, impact, feasibility, innovation },
            actor,
        );
        await interaction.editReply({
            content: `Grade saved for **${row.idea.title}** (Overall: ${row.grades.overall.toFixed(1)}/5).`,
        });

        try {
            if (interaction.message) {
                await interaction.message.edit({
                    embeds: [ideaEmbed(row)],
                    components: [ideaActionButtons(row.idea.id)],
                });
            }
        } catch {
            // Best effort
        }

        if (context.env.VOTING_RESULTS_CHANNEL_ID) {
            try {
                const resultsChannel = await interaction.client.channels.fetch(
                    context.env.VOTING_RESULTS_CHANNEL_ID,
                );
                if (resultsChannel?.isTextBased()) {
                    const textChannel = resultsChannel as TextChannel;
                    if (row.idea.voting_message_id) {
                        try {
                            const votingMessage = await textChannel.messages.fetch(
                                row.idea.voting_message_id,
                            );
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
        if (interaction.deferred || interaction.replied)
            await interaction.editReply({ content: msg });
        else await interaction.reply({ content: msg, flags: ['Ephemeral'] });
    }
}

async function handleIdeaCommentModal(
    interaction: ModalSubmitInteraction,
    context: CommandContext,
    logger: DiscordLogger,
) {
    try {
        await interaction.deferReply({ flags: ['Ephemeral'] });
        const ideaId = interaction.customId.replace('modal-idea-comment_', '');
        const text = interaction.fields.getTextInputValue('comment-text').trim();

        if (!text) {
            await interaction.editReply({ content: 'Comment cannot be empty.' });
            return;
        }

        const actor = {
            id: interaction.user.id,
            name: interaction.user.globalName ?? interaction.user.username,
        };

        const idea = await context.ideas.commentOnIdea(ideaId, text, actor);
        await interaction.editReply({ content: `Comment added to **${idea.title}**.` });

        if (idea.thread_id && interaction.guild) {
            try {
                const channel = await interaction.guild.channels.fetch(idea.thread_id);
                if (channel?.isTextBased()) {
                    await (channel as TextChannel).send(`**${actor.name}** commented:\n> ${text}`);
                }
            } catch (err) {
                console.error('Thread posting failed for comment modal:', err);
            }
        }

        try {
            const row = await context.ideas.getIdea(idea.id);
            try {
                if (interaction.message) {
                    await interaction.message.edit({
                        embeds: [ideaEmbed(row)],
                        components: [ideaActionButtons(row.idea.id)],
                    });
                }
            } catch {
                // Ignore message edit errors if the original message was deleted or inaccessible
            }

            if (context.env.VOTING_RESULTS_CHANNEL_ID && row.idea.voting_message_id) {
                try {
                    const resultsChannel = await interaction.client.channels.fetch(
                        context.env.VOTING_RESULTS_CHANNEL_ID,
                    );
                    if (resultsChannel?.isTextBased()) {
                        const textChannel = resultsChannel as TextChannel;
                        const votingMessage = await textChannel.messages.fetch(
                            row.idea.voting_message_id,
                        );
                        await votingMessage.edit({
                            embeds: [ideaEmbed(row)],
                            components: [ideaActionButtons(row.idea.id)],
                        });
                    }
                } catch (err) {
                    console.error('Could not update voting card with comment:', err);
                }
            }
        } catch (err) {
            console.error('Could not refresh embed with comment:', err);
        }
    } catch (error) {
        console.error('Comment modal failed:', error);
        await logger.logError(error, 'Modal: idea-comment').catch(() => {});
        const msg = error instanceof UserFacingError ? error.message : 'Failed to add comment.';
        if (interaction.deferred || interaction.replied)
            await interaction.editReply({ content: msg });
        else await interaction.reply({ content: msg, flags: ['Ephemeral'] });
    }
}

async function handleTaskAddModal(
    interaction: ModalSubmitInteraction,
    context: CommandContext,
    logger: DiscordLogger,
) {
    try {
        await interaction.deferReply({ flags: ['Ephemeral'] });
        const title = interaction.fields.getTextInputValue('task-title');
        const description = interaction.fields.getTextInputValue('task-description');
        const rawPriority = interaction.fields.getTextInputValue('task-priority').trim();

        let priority: 'High' | 'Medium' | 'Low' = 'Medium';
        const lowerP = rawPriority.toLowerCase();
        if (lowerP === 'high') priority = 'High';
        else if (lowerP === 'low') priority = 'Low';
        else if (lowerP !== 'medium') {
            await interaction.editReply({
                content: `Invalid priority "${rawPriority}". Use: High, Medium, or Low.`,
            });
            return;
        }

        const actor = {
            id: interaction.user.id,
            name: interaction.user.globalName ?? interaction.user.username,
        };

        const task = await context.tasks.createTask({ title, description, priority }, actor);

        await interaction.editReply({
            content: `Task **${task.title}** created successfully. Use \`/task list\` to view all tasks.`,
        });
    } catch (error) {
        console.error('Task add modal failed:', error);
        await logger.logError(error, 'Modal: task-add').catch(() => {});
        const msg = 'Failed to add task.';
        if (interaction.deferred || interaction.replied)
            await interaction.editReply({ content: msg });
        else await interaction.reply({ content: msg, flags: ['Ephemeral'] });
    }
}

async function handleMilestoneAddModal(
    interaction: ModalSubmitInteraction,
    context: CommandContext,
    logger: DiscordLogger,
) {
    try {
        await interaction.deferReply({ flags: ['Ephemeral'] });
        const name = interaction.fields.getTextInputValue('milestone-name');
        const description = interaction.fields.getTextInputValue('milestone-description');
        const targetDate = interaction.fields.getTextInputValue('milestone-target-date').trim();

        const datePattern = /^(\d{2})\/(\d{2})\/(\d{4})$/;
        if (!datePattern.test(targetDate)) {
            await interaction.editReply({ content: 'Invalid date format. Please use DD/MM/YYYY.' });
            return;
        }

        const actor = {
            id: interaction.user.id,
            name: interaction.user.globalName ?? interaction.user.username,
        };

        const milestone = await context.milestones.createMilestone(
            { name, description, target_date: targetDate },
            actor,
        );

        await interaction.editReply({
            content: `Milestone **${milestone.name}** created successfully. Use \`/milestone list\` to view all milestones.`,
        });
    } catch (error) {
        console.error('Milestone add modal failed:', error);
        await logger.logError(error, 'Modal: milestone-add').catch(() => {});
        const msg = 'Failed to add milestone.';
        if (interaction.deferred || interaction.replied)
            await interaction.editReply({ content: msg });
        else await interaction.reply({ content: msg, flags: ['Ephemeral'] });
    }
}

async function handleStandupModal(
    interaction: ModalSubmitInteraction,
    context: CommandContext,
    logger: DiscordLogger,
) {
    try {
        await interaction.deferReply({ flags: ['Ephemeral'] });
        const whatDone = interaction.fields.getTextInputValue('standup-what-done').trim();
        const whatNext = interaction.fields.getTextInputValue('standup-what-next').trim();
        const blockers = interaction.fields.getTextInputValue('standup-blockers').trim();

        if (whatDone.length < 10 || whatNext.length < 10 || blockers.length < 10) {
            await interaction.editReply({
                content: 'Each field must be at least 10 characters long.',
            });
            return;
        }

        const actor = {
            id: interaction.user.id,
            name: interaction.user.globalName ?? interaction.user.username,
        };

        await context.standups.submitStandup(
            { what_done: whatDone, what_next: whatNext, blockers },
            actor,
        );

        await interaction.editReply({
            content: 'Your daily standup has been recorded successfully.',
        });
    } catch (error) {
        console.error('Standup modal failed:', error);
        await logger.logError(error, 'Modal: standup').catch(() => {});
        const msg = 'Failed to record standup.';
        if (interaction.deferred || interaction.replied)
            await interaction.editReply({ content: msg });
        else await interaction.reply({ content: msg, flags: ['Ephemeral'] });
    }
}

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
