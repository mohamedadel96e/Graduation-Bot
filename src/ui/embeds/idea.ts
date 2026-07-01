import { EmbedBuilder } from 'discord.js';
import type { IdeaWithTally } from '../../types';

const MD3 = {
    primary: 0x6750a4,
    secondary: 0x625b71,
    tertiary: 0x7d5260,
    error: 0xb3261e,
    success: 0x386a20,
} as const;

function statusColor(status: string): number {
    switch (status) {
        case 'Active':
            return MD3.primary;
        case 'Finalized':
            return MD3.tertiary;
        case 'Archived':
            return MD3.error;
        default:
            return MD3.secondary;
    }
}

function statusIcon(status: string): string {
    switch (status) {
        case 'Active':
            return '💡';
        case 'Finalized':
            return '✅';
        case 'Archived':
            return '📦';
        default:
            return '📋';
    }
}

export function ideaEmbed({ idea, tally }: IdeaWithTally): EmbedBuilder {
    return new EmbedBuilder()
        .setTitle(`${statusIcon(idea.status)} ${idea.title}`)
        .setDescription(idea.description)
        .setColor(statusColor(idea.status))
        .addFields(
            { name: '🆔 ID', value: idea.id, inline: true },
            { name: 'Status', value: idea.status, inline: true },
            { name: 'Difficulty', value: idea.difficulty, inline: true },
            { name: 'Tech Stack', value: idea.tech_stack || 'Not specified', inline: false },
            { name: 'Votes', value: formatTally(tally), inline: false },
            { name: '👤 Submitted By', value: idea.submitted_by_name || idea.submitted_by, inline: true },
        )
        .setTimestamp(new Date(idea.created_at))
        .setFooter({ text: 'GradBot • Ideas' });
}

export function ideaListEmbed(rows: IdeaWithTally[], status: string): EmbedBuilder {
    const embed = new EmbedBuilder()
        .setTitle(`${statusIcon(status)} Ideas: ${status}`)
        .setColor(statusColor(status))
        .setTimestamp(new Date())
        .setFooter({ text: 'GradBot • Ideas' });

    if (rows.length === 0) {
        return embed.setDescription('No ideas found yet.');
    }

    return embed.setDescription(
        rows
            .slice(0, 20)
            .map(({ idea, tally }) => {
                return `\`${idea.id}\` **${idea.title}** (${idea.difficulty})\n${formatTally(tally)} — ${idea.tech_stack || 'No stack'}`;
            })
            .join('\n\n'),
    );
}

function formatTally(tally: { up: number; down: number; unsure: number; total: number }): string {
    return `👍 ${tally.up} | 👎 ${tally.down} | 🤔 ${tally.unsure}`;
}
