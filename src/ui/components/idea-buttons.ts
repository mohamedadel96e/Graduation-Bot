import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

export function ideaActionButtons(ideaId: string): ActionRowBuilder<ButtonBuilder> {
    const gradeButton = new ButtonBuilder()
        .setCustomId(`grade_${ideaId}`)
        .setLabel('Grade This Idea')
        .setStyle(ButtonStyle.Primary);
    const commentsButton = new ButtonBuilder()
        .setCustomId(`comments_${ideaId}`)
        .setLabel('View Comments')
        .setStyle(ButtonStyle.Secondary);
    const addCommentButton = new ButtonBuilder()
        .setCustomId(`add_comment_${ideaId}`)
        .setLabel('Add Comment')
        .setStyle(ButtonStyle.Secondary);

    return new ActionRowBuilder<ButtonBuilder>().addComponents(gradeButton, addCommentButton, commentsButton);
}
