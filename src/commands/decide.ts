import { SlashCommandBuilder } from 'discord.js';
import { canManageProject } from '../permissions';
import { UserFacingError } from '../services/idea-service';
import { decisionEmbed, noDecisionEmbed } from '../ui/embeds/decision';
import type { BotCommand } from './types';

export const decideCommand: BotCommand = {
    data: new SlashCommandBuilder()
        .setName('decide')
        .setDescription('Manage the project decision.')
        .addSubcommand((subcommand) =>
            subcommand
                .setName('finalize')
                .setDescription('Finalize a project idea. Team Lead or Bot Admin only.')
                .addStringOption((option) => option.setName('id').setDescription('Idea ID.').setRequired(true)),
        )
        .addSubcommand((subcommand) =>
            subcommand
                .setName('reasoning')
                .setDescription('Add reasoning for the current decision. Team Lead or Bot Admin only.')
                .addStringOption((option) =>
                    option.setName('text').setDescription('The reasoning behind this decision.').setRequired(true),
                ),
        )
        .addSubcommand((subcommand) =>
            subcommand.setName('status').setDescription('View the current project decision.'),
        ),

    async execute(interaction, context) {
        try {
            const subcommand = interaction.options.getSubcommand();
            await interaction.deferReply();

            if (subcommand === 'finalize') {
                if (!canManageProject(interaction, context.env)) {
                    await interaction.editReply({ content: 'Only a Team Lead or Bot Admin can finalize ideas.' });
                    return;
                }

                const { decision, idea } = await context.decisions.finalize(
                    interaction.options.getString('id', true),
                    actorFromInteraction(interaction),
                );
                await interaction.editReply({ embeds: [decisionEmbed(decision, idea)] });
                return;
            }

            if (subcommand === 'reasoning') {
                if (!canManageProject(interaction, context.env)) {
                    await interaction.editReply({ content: 'Only a Team Lead or Bot Admin can update decision reasoning.' });
                    return;
                }

                const updated = await context.decisions.addReasoning(
                    interaction.options.getString('text', true),
                    actorFromInteraction(interaction),
                );

                const status = await context.decisions.getStatus();
                if (status) {
                    await interaction.editReply({ embeds: [decisionEmbed(status.decision, status.idea)] });
                } else {
                    await interaction.editReply({ content: 'Reasoning updated.', embeds: [noDecisionEmbed()] });
                }
                return;
            }

            if (subcommand === 'status') {
                const status = await context.decisions.getStatus();
                if (status) {
                    await interaction.editReply({ embeds: [decisionEmbed(status.decision, status.idea)] });
                } else {
                    await interaction.editReply({ embeds: [noDecisionEmbed()] });
                }
                return;
            }

            await interaction.editReply({ content: 'Unknown decide subcommand.' });
        } catch (error) {
            if (error instanceof UserFacingError) {
                await interaction.editReply({ content: error.message });
                return;
            }

            throw error;
        }
    },
};

function actorFromInteraction(interaction: { user: { id: string; username: string; globalName: string | null } }) {
    return {
        id: interaction.user.id,
        name: interaction.user.globalName ?? interaction.user.username,
    };
}
