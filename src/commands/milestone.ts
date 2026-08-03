import { SlashCommandBuilder } from 'discord.js';
import type { BotCommand } from './types';
import { milestoneAddModal } from '../ui/modals/milestone-add';
import { milestoneEmbed, milestoneListEmbed } from '../ui/embeds/milestone';
import { MILESTONE_STATUSES, type MilestoneStatus } from '../types';

export const milestoneCommand: BotCommand = {
    data: new SlashCommandBuilder()
        .setName('milestone')
        .setDescription('Manage project milestones')
        .addSubcommand((sub) =>
            sub.setName('add').setDescription('Create a new milestone (opens a modal)'),
        )
        .addSubcommand((sub) =>
            sub
                .setName('list')
                .setDescription('List all milestones')
                .addStringOption((opt) =>
                    opt
                        .setName('status')
                        .setDescription('Filter by status')
                        .setRequired(false)
                        .addChoices(
                            { name: 'Planned', value: 'planned' },
                            { name: 'Active', value: 'active' },
                            { name: 'Completed', value: 'completed' },
                            { name: 'Archived', value: 'archived' },
                        ),
                ),
        )
        .addSubcommand((sub) =>
            sub
                .setName('progress')
                .setDescription('Update milestone progress')
                .addStringOption((opt) => opt.setName('id').setDescription('Milestone ID').setRequired(true))
                .addIntegerOption((opt) =>
                    opt
                        .setName('percentage')
                        .setDescription('Completion percentage (0-100)')
                        .setRequired(true)
                        .setMinValue(0)
                        .setMaxValue(100),
                ),
        ),

    async execute(interaction, context) {
        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'add') {
            await interaction.showModal(milestoneAddModal());
            return;
        }

        if (subcommand === 'list') {
            await interaction.deferReply();
            const status = interaction.options.getString('status') as MilestoneStatus | null;
            
            const milestones = await context.milestones.listMilestones(status ?? undefined);
            
            await interaction.editReply({ embeds: [milestoneListEmbed(milestones, status ?? undefined)] });
            return;
        }

        if (subcommand === 'progress') {
            await interaction.deferReply();
            const id = interaction.options.getString('id', true);
            const percentage = interaction.options.getInteger('percentage', true);

            const actor = {
                id: interaction.user.id,
                name: interaction.user.globalName ?? interaction.user.username,
            };

            try {
                const updated = await context.milestones.updateProgress(id, percentage, actor);
                await interaction.editReply({
                    content: `Milestone **${updated.name}** progress updated.`,
                    embeds: [milestoneEmbed(updated)],
                });
            } catch (err: any) {
                await interaction.editReply({ content: err.message || 'Failed to update milestone progress.' });
            }
            return;
        }
    },
};
