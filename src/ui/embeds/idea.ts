import { EmbedBuilder } from 'discord.js';
import type { IdeaWithGrades } from '../../types';
import { statusColor, gradeBar, BOT_FOOTER } from '../design';

export function ideaEmbed({ idea, grades, comments }: IdeaWithGrades): EmbedBuilder {
    const embed = new EmbedBuilder()
        .setTitle(idea.title)
        .setDescription(idea.description)
        .setColor(statusColor(idea.status))
        .addFields(
            { name: 'ID', value: `\`${idea.id}\``, inline: true },
            { name: 'Status', value: idea.status, inline: true },
            { name: 'Difficulty', value: idea.difficulty || 'Unset', inline: true },
            { name: 'Category', value: idea.category || 'Uncategorized', inline: true },
            { name: 'Tech Stack', value: idea.tech_stack || 'Not specified', inline: true },
            { name: 'Submitted By', value: idea.submitted_by_name || idea.submitted_by, inline: true },
        )
        .setTimestamp(new Date(idea.created_at))
        .setFooter({ text: BOT_FOOTER });

    // Grades section
    if (grades.count > 0) {
        embed.addFields(
            { name: '\u200B', value: `**Evaluation** (${grades.count} ${grades.count === 1 ? 'review' : 'reviews'})`, inline: false },
            { name: 'Learning Value', value: gradeBar(grades.learning), inline: true },
            { name: 'Problem Impact', value: gradeBar(grades.impact), inline: true },
            { name: 'Feasibility', value: gradeBar(grades.feasibility), inline: true },
            { name: 'Innovation', value: gradeBar(grades.innovation), inline: true },
            { name: 'Overall Score', value: `**${grades.overall.toFixed(1)} / 5.0**`, inline: true },
        );
    } else {
        embed.addFields(
            { name: '\u200B', value: '**Evaluation** — No reviews yet. Click the button below to grade this idea.', inline: false },
        );
    }

    // Comments section
    if (comments.length > 0) {
        const shown = comments.slice(-5);
        const commentLines = shown
            .map((c) => `**${c.actor_name}:** ${c.text}`)
            .join('\n');
        const header = comments.length > 5
            ? `Comments (showing last 5 of ${comments.length})`
            : `Comments (${comments.length})`;
        embed.addFields({ name: header, value: commentLines, inline: false });
    }

    return embed;
}

export function ideaListEmbed(rows: IdeaWithGrades[], status: string, guildId?: string | null): EmbedBuilder {
    const embed = new EmbedBuilder()
        .setTitle(`Ideas — ${status}`)
        .setColor(statusColor(status))
        .setTimestamp(new Date())
        .setFooter({ text: BOT_FOOTER });

    if (rows.length === 0) {
        return embed.setDescription('No ideas found.');
    }

    return embed.setDescription(
        rows
            .slice(0, 20)
            .map(({ idea, grades }) => {
                const score = grades.count > 0 ? `${grades.overall.toFixed(1)}/5` : 'Unrated';
                const cat = idea.category ? `[${idea.category}]` : '';
                const titleText = idea.thread_id && guildId
                    ? `[**${idea.title}**](https://discord.com/channels/${guildId}/${idea.thread_id})`
                    : `**${idea.title}**`;
                return `\`${idea.id}\` ${titleText} ${cat}\n${idea.difficulty} · ${score} · ${idea.tech_stack || 'No stack'}`;
            })
            .join('\n\n'),
    );
}
