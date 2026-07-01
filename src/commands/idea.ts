import { SlashCommandBuilder, TextChannel } from 'discord.js';
import { canManageProject } from '../permissions';
import { UserFacingError } from '../services/idea-service';
import {
    IDEA_STATUSES,
    type Actor,
    type IdeaStatus,
} from '../types';
import { ideaEmbed, ideaListEmbed } from '../ui/embeds/idea';
import { ideaActionButtons } from '../ui/components/idea-buttons';
import { ideaAddModal } from '../ui/modals/idea-add';
import type { BotCommand } from './types';

export const ideaCommand: BotCommand = {
    data: new SlashCommandBuilder()
        .setName('idea')
        .setDescription('Manage graduation project ideas.')
        .addSubcommand((subcommand) =>
            subcommand
                .setName('add')
                .setDescription('Submit a new project idea (opens a form).')
        )
        .addSubcommand((subcommand) =>
            subcommand
                .setName('list')
                .setDescription('List project ideas.')
                .addStringOption((option) =>
                    option.setName('status').setDescription('Filter by status.').setRequired(false).addChoices(
                        ...IDEA_STATUSES.map((status) => ({ name: status, value: status })),
                    ),
                ),
        )
        .addSubcommand((subcommand) =>
            subcommand
                .setName('view')
                .setDescription('View a project idea with grades and comments.')
                .addStringOption((option) => option.setName('id').setDescription('Idea ID.').setRequired(true)),
        )
        .addSubcommand((subcommand) =>
            subcommand
                .setName('archive')
                .setDescription('Archive an idea. Team Lead or Bot Admin only.')
                .addStringOption((option) => option.setName('id').setDescription('Idea ID.').setRequired(true)),
        )
        .addSubcommand((subcommand) =>
            subcommand
                .setName('comment')
                .setDescription('Comment on a project idea.')
                .addStringOption((option) => option.setName('id').setDescription('Idea ID.').setRequired(true))
                .addStringOption((option) => option.setName('text').setDescription('Your comment.').setRequired(true)),
        ),

    async execute(interaction, context) {
        try {
            const subcommand = interaction.options.getSubcommand();

            if (subcommand === 'add') {
                await interaction.showModal(ideaAddModal());
                return;
            }

            // Defer reply for all other commands because Sheets API can be slow
            await interaction.deferReply();

            if (subcommand === 'list') {
                const status = (interaction.options.getString('status') ?? 'Active') as IdeaStatus;
                const rows = await context.ideas.listIdeas(status);
                await interaction.editReply({ embeds: [ideaListEmbed(rows, status)] });
                return;
            }

            if (subcommand === 'view') {
                const row = await context.ideas.getIdea(interaction.options.getString('id', true));
                await interaction.editReply({
                    embeds: [ideaEmbed(row)],
                    components: [ideaActionButtons(row.idea.id)],
                });
                return;
            }

            if (subcommand === 'archive') {
                if (!canManageProject(interaction, context.env)) {
                    await interaction.editReply({ content: 'Only a Team Lead or Bot Admin can archive ideas.' });
                    return;
                }

                const idea = await context.ideas.archiveIdea(
                    interaction.options.getString('id', true),
                    actorFromInteraction(interaction),
                );
                await interaction.editReply({ content: `Archived idea \`${idea.id}\`: **${idea.title}**` });
                return;
            }

            if (subcommand === 'comment') {
                const ideaId = interaction.options.getString('id', true);
                const text = interaction.options.getString('text', true);
                const actor = actorFromInteraction(interaction);

                const idea = await context.ideas.commentOnIdea(ideaId, text, actor);
                await interaction.editReply({ content: `Comment added on **${idea.title}**.` });

                // If the idea has a discussion thread, also post the comment there
                if (idea.thread_id && interaction.guild) {
                    try {
                        const channel = await interaction.guild.channels.fetch(idea.thread_id);
                        if (channel?.isTextBased()) {
                            await (channel as TextChannel).send(
                                `**${actor.name}** commented:\n> ${text}`,
                            );
                        }
                    } catch {
                        // Thread posting is best-effort
                    }
                }
                return;
            }

            await interaction.editReply({ content: 'Unknown subcommand.' });
        } catch (error) {
            if (error instanceof UserFacingError) {
                await interaction.editReply({ content: error.message });
                return;
            }

            throw error;
        }
    },
};

function actorFromInteraction(interaction: { user: { id: string; username: string; globalName: string | null } }): Actor {
    return {
        id: interaction.user.id,
        name: interaction.user.globalName ?? interaction.user.username,
    };
}
