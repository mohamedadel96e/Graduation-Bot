import { SlashCommandBuilder } from 'discord.js';
import type { BotCommand } from './types';
import { taskAddModal } from '../ui/modals/task-add';
import { taskEmbed, taskListEmbed } from '../ui/embeds/task';
import { canManageProject } from '../permissions';
import { TASK_STATUSES, type TaskStatus } from '../types';

export const taskCommand: BotCommand = {
    data: new SlashCommandBuilder()
        .setName('task')
        .setDescription('Manage project tasks')
        .addSubcommand((sub) =>
            sub.setName('add').setDescription('Create a new task (opens a modal)'),
        )
        .addSubcommand((sub) =>
            sub
                .setName('list')
                .setDescription('List all tasks')
                .addStringOption((opt) =>
                    opt
                        .setName('status')
                        .setDescription('Filter by status')
                        .setRequired(false)
                        .addChoices(
                            { name: 'Todo', value: 'todo' },
                            { name: 'In Progress', value: 'in-progress' },
                            { name: 'Done', value: 'done' },
                        ),
                ),
        )
        .addSubcommand((sub) =>
            sub
                .setName('status')
                .setDescription('Update a task status')
                .addStringOption((opt) => opt.setName('id').setDescription('Task ID').setRequired(true))
                .addStringOption((opt) =>
                    opt
                        .setName('status')
                        .setDescription('New status')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Todo', value: 'todo' },
                            { name: 'In Progress', value: 'in-progress' },
                            { name: 'Done', value: 'done' },
                        ),
                ),
        )
        .addSubcommand((sub) =>
            sub
                .setName('assign')
                .setDescription('Assign a task to someone')
                .addStringOption((opt) => opt.setName('id').setDescription('Task ID').setRequired(true))
                .addUserOption((opt) => opt.setName('assignee').setDescription('User to assign to').setRequired(true)),
        )
        .addSubcommand((sub) =>
            sub
                .setName('delete')
                .setDescription('Delete a task (Requires Lead/Admin role)')
                .addStringOption((opt) => opt.setName('id').setDescription('Task ID').setRequired(true)),
        ),

    async execute(interaction, context) {
        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'add') {
            await interaction.showModal(taskAddModal());
            return;
        }

        if (subcommand === 'list') {
            await interaction.deferReply();
            const status = interaction.options.getString('status') as TaskStatus | null;
            
            // Re-fetch tasks, applying status filter if provided
            const tasks = await context.tasks.listTasks(status ?? undefined);
            
            await interaction.editReply({ embeds: [taskListEmbed(tasks, status ?? undefined)] });
            return;
        }

        if (subcommand === 'status') {
            await interaction.deferReply();
            const id = interaction.options.getString('id', true);
            const status = interaction.options.getString('status', true) as TaskStatus;

            const actor = {
                id: interaction.user.id,
                name: interaction.user.globalName ?? interaction.user.username,
            };

            try {
                const updated = await context.tasks.updateTaskStatus(id, status, actor);
                await interaction.editReply({
                    content: `Task **${updated.title}** status updated to \`${status}\`.`,
                    embeds: [taskEmbed(updated)],
                });
            } catch (err: any) {
                await interaction.editReply({ content: err.message || 'Failed to update task status.' });
            }
            return;
        }

        if (subcommand === 'assign') {
            await interaction.deferReply();
            const id = interaction.options.getString('id', true);
            const assigneeUser = interaction.options.getUser('assignee', true);

            const actor = {
                id: interaction.user.id,
                name: interaction.user.globalName ?? interaction.user.username,
            };

            const assigneeName = assigneeUser.globalName ?? assigneeUser.username;

            try {
                const updated = await context.tasks.assignTask(id, `<@${assigneeUser.id}> (${assigneeName})`, actor);
                await interaction.editReply({
                    content: `Task **${updated.title}** assigned to <@${assigneeUser.id}>.`,
                    embeds: [taskEmbed(updated)],
                });
            } catch (err: any) {
                await interaction.editReply({ content: err.message || 'Failed to assign task.' });
            }
            return;
        }

        if (subcommand === 'delete') {
            if (!canManageProject(interaction, context.env)) {
                await interaction.reply({
                    content: 'You do not have permission to delete tasks. Only team leads and admins can do this.',
                    flags: ['Ephemeral'],
                });
                return;
            }

            await interaction.deferReply();
            const id = interaction.options.getString('id', true);
            const actor = {
                id: interaction.user.id,
                name: interaction.user.globalName ?? interaction.user.username,
            };

            try {
                const deleted = await context.tasks.deleteTask(id, actor);
                if (deleted) {
                    await interaction.editReply({ content: `Task \`${id}\` has been deleted.` });
                } else {
                    await interaction.editReply({ content: `Task \`${id}\` not found or could not be deleted.` });
                }
            } catch (err: any) {
                await interaction.editReply({ content: err.message || 'Failed to delete task.' });
            }
            return;
        }
    },
};
