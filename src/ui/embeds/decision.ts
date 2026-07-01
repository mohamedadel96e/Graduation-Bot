import { EmbedBuilder } from 'discord.js';
import type { Decision, Idea } from '../../types';

const MD3 = {
    primary: 0x6750a4,
    secondary: 0x625b71,
    tertiary: 0x7d5260,
    error: 0xb3261e,
    success: 0x386a20,
} as const;

export function decisionEmbed(decision: Decision, idea: Idea): EmbedBuilder {
    return new EmbedBuilder()
        .setTitle(`✅ Decision: ${idea.title}`)
        .setDescription(decision.reasoning || '_No reasoning provided yet._')
        .setColor(MD3.tertiary)
        .addFields(
            { name: '💡 Idea ID', value: idea.id, inline: true },
            { name: 'Status', value: idea.status, inline: true },
            { name: 'Difficulty', value: idea.difficulty, inline: true },
            { name: 'Tech Stack', value: idea.tech_stack || 'Not specified', inline: false },
            { name: '👤 Decided By', value: decision.decided_by_name || decision.decided_by, inline: true },
            { name: '📅 Decided At', value: new Date(decision.decided_at).toLocaleDateString(), inline: true },
        )
        .setTimestamp(new Date(decision.decided_at))
        .setFooter({ text: 'GradBot • Decision' });
}

export function noDecisionEmbed(): EmbedBuilder {
    return new EmbedBuilder()
        .setTitle('📋 Decision Status')
        .setDescription('No decision has been made yet.\nUse `/decide finalize <id>` to finalize an idea.')
        .setColor(MD3.secondary)
        .setTimestamp(new Date())
        .setFooter({ text: 'GradBot • Decision' });
}
