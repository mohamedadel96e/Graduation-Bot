import { EmbedBuilder } from 'discord.js';
import type { Decision, Idea } from '../../types';
import { PALETTE, BOT_FOOTER } from '../design';

export function decisionEmbed(decision: Decision, idea: Idea): EmbedBuilder {
    return new EmbedBuilder()
        .setTitle(`Decision — ${idea.title}`)
        .setDescription(decision.reasoning || '_No reasoning provided yet._')
        .setColor(PALETTE.sand)
        .addFields(
            { name: 'Idea ID', value: `\`${idea.id}\``, inline: true },
            { name: 'Status', value: idea.status, inline: true },
            { name: 'Difficulty', value: idea.difficulty, inline: true },
            { name: 'Category', value: idea.category || 'Uncategorized', inline: true },
            { name: 'Tech Stack', value: idea.tech_stack || 'Not specified', inline: true },
            { name: 'Decided By', value: decision.decided_by_name || decision.decided_by, inline: true },
        )
        .setTimestamp(new Date(decision.decided_at))
        .setFooter({ text: BOT_FOOTER });
}

export function noDecisionEmbed(): EmbedBuilder {
    return new EmbedBuilder()
        .setTitle('Decision Status')
        .setDescription('No decision has been made yet.\nUse `/decide finalize <id>` to finalize an idea.')
        .setColor(PALETTE.forest)
        .setTimestamp(new Date())
        .setFooter({ text: BOT_FOOTER });
}
