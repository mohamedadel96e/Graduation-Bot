import { ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } from 'discord.js';

export function ideaCommentModal(ideaId: string): ModalBuilder {
    const modal = new ModalBuilder()
        .setCustomId(`modal-idea-comment_${ideaId}`)
        .setTitle('Add a Comment');

    const commentInput = new TextInputBuilder()
        .setCustomId('comment-text')
        .setLabel('Your Comment')
        .setPlaceholder('Type your feedback or thoughts here...')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true)
        .setMaxLength(1000);

    modal.addComponents(
        new ActionRowBuilder<TextInputBuilder>().addComponents(commentInput),
    );

    return modal;
}
