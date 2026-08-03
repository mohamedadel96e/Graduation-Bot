import { EmbedBuilder } from 'discord.js';
import type { Task } from '../../types';
import { PALETTE } from '../design';

function getStatusColor(status: Task['status']): number {
    switch (status) {
        case 'todo':
            return PALETTE.forest;
        case 'in-progress':
            return PALETTE.sand;
        case 'done':
            return PALETTE.sage;
        default:
            return PALETTE.forest;
    }
}

export function taskEmbed(task: Task): EmbedBuilder {
    return new EmbedBuilder()
        .setColor(getStatusColor(task.status))
        .setTitle(task.title)
        .setDescription(task.description || 'No description provided.')
        .addFields(
            { name: 'ID', value: `\`${task.id}\``, inline: true },
            { name: 'Status', value: task.status, inline: true },
            { name: 'Priority', value: task.priority, inline: true },
            { name: 'Assignee', value: task.assignee, inline: true },
        )
        .setFooter({ text: `Created at ${new Date(task.created_at).toLocaleString()}` });
}

export function taskListEmbed(tasks: Task[], statusFilter?: string): EmbedBuilder {
    const title = statusFilter ? `Tasks (${statusFilter})` : 'All Tasks';
    
    if (tasks.length === 0) {
        return new EmbedBuilder()
            .setColor(PALETTE.forest)
            .setTitle(title)
            .setDescription('No tasks found.');
    }

    const embed = new EmbedBuilder()
        .setColor(PALETTE.sage)
        .setTitle(title);

    const descriptionLines = tasks.map(
        (t) => `**[${t.status}]** ${t.title} (\`${t.id}\`) - ${t.assignee} - Priority: ${t.priority}`
    );

    embed.setDescription(descriptionLines.join('\n'));

    return embed;
}
