import { EmbedBuilder } from 'discord.js';
import type { Milestone } from '../../types';
import { PALETTE, progressBar } from '../design';

function getMilestoneStatusColor(status: Milestone['status'], isPastDue: boolean): number {
    if (isPastDue && status !== 'completed' && status !== 'archived') {
        return PALETTE.error;
    }
    
    switch (status) {
        case 'planned':
            return PALETTE.forest;
        case 'active':
            return PALETTE.sand;
        case 'completed':
            return PALETTE.sage;
        case 'archived':
            return PALETTE.forest;
        default:
            return PALETTE.forest;
    }
}

function parseDate(dateStr: string): Date | null {
    // DD/MM/YYYY
    const parts = dateStr.split('/');
    if (parts.length === 3) {
        const d = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10) - 1;
        const y = parseInt(parts[2], 10);
        const date = new Date(y, m, d);
        if (!isNaN(date.getTime())) return date;
    }
    return null;
}

function isPastDue(dateStr: string): boolean {
    const target = parseDate(dateStr);
    if (!target) return false;
    
    // Set to end of the target day
    target.setHours(23, 59, 59, 999);
    return new Date().getTime() > target.getTime();
}

export function milestoneEmbed(milestone: Milestone): EmbedBuilder {
    const pastDue = isPastDue(milestone.target_date);
    const numProgress = parseInt(milestone.progress, 10) || 0;
    
    let statusText = milestone.status;
    if (pastDue && milestone.status !== 'completed' && milestone.status !== 'archived') {
        statusText += ' ⚠️ (Past Due)';
    }

    return new EmbedBuilder()
        .setColor(getMilestoneStatusColor(milestone.status, pastDue))
        .setTitle(milestone.name)
        .setDescription(milestone.description || 'No description provided.')
        .addFields(
            { name: 'ID', value: `\`${milestone.id}\``, inline: true },
            { name: 'Status', value: statusText, inline: true },
            { name: 'Target Date', value: milestone.target_date, inline: true },
            { name: 'Progress', value: progressBar(numProgress), inline: false },
        )
        .setFooter({ text: `Created at ${new Date(milestone.created_at).toLocaleString()}` });
}

export function milestoneListEmbed(milestones: Milestone[], statusFilter?: string): EmbedBuilder {
    const title = statusFilter ? `Milestones (${statusFilter})` : 'All Milestones';
    
    if (milestones.length === 0) {
        return new EmbedBuilder()
            .setColor(PALETTE.forest)
            .setTitle(title)
            .setDescription('No milestones found.');
    }

    const embed = new EmbedBuilder()
        .setColor(PALETTE.sage)
        .setTitle(title);

    const descriptionLines = milestones.map((m) => {
        const pastDue = isPastDue(m.target_date);
        const pastDueMarker = (pastDue && m.status !== 'completed' && m.status !== 'archived') ? '⚠️' : '';
        const numProgress = parseInt(m.progress, 10) || 0;
        
        return `**[${m.status}]** ${m.name} (\`${m.id}\`) ${pastDueMarker}\n` +
               `Target: ${m.target_date} | ${progressBar(numProgress)}\n`;
    });

    embed.setDescription(descriptionLines.join('\n'));

    return embed;
}
