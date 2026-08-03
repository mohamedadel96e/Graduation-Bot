import { ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } from 'discord.js';

export function standupModal(): ModalBuilder {
    const modal = new ModalBuilder()
        .setCustomId('modal-standup')
        .setTitle('Daily Standup');

    const doneInput = new TextInputBuilder()
        .setCustomId('standup-what-done')
        .setLabel('What did you complete today?')
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder('e.g., Finished the database schema...')
        .setRequired(true)
        .setMinLength(10)
        .setMaxLength(1000);

    const nextInput = new TextInputBuilder()
        .setCustomId('standup-what-next')
        .setLabel('What will you do next?')
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder('e.g., Will start on the API endpoints...')
        .setRequired(true)
        .setMinLength(10)
        .setMaxLength(1000);

    const blockersInput = new TextInputBuilder()
        .setCustomId('standup-blockers')
        .setLabel('Any blockers or help needed?')
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder('e.g., None! / Blocked by PR #123')
        .setRequired(true)
        .setMinLength(10)
        .setMaxLength(1000);

    modal.addComponents(
        new ActionRowBuilder<TextInputBuilder>().addComponents(doneInput),
        new ActionRowBuilder<TextInputBuilder>().addComponents(nextInput),
        new ActionRowBuilder<TextInputBuilder>().addComponents(blockersInput),
    );

    return modal;
}
