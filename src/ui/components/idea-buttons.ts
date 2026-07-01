import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

export function ideaActionButtons(ideaId: string): ActionRowBuilder<ButtonBuilder> {
    const gradeButton = new ButtonBuilder()
        .setCustomId(`grade_${ideaId}`)
        .setLabel('Grade This Idea')
        .setStyle(ButtonStyle.Primary);

    return new ActionRowBuilder<ButtonBuilder>().addComponents(gradeButton);
}
