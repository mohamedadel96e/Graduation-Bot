import { ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } from 'discord.js';

export function milestoneAddModal(): ModalBuilder {
    const modal = new ModalBuilder()
        .setCustomId('modal-milestone-add')
        .setTitle('Create New Milestone');

    const nameInput = new TextInputBuilder()
        .setCustomId('milestone-name')
        .setLabel('Milestone Name')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('e.g., Phase 1: MVP')
        .setRequired(true)
        .setMaxLength(100);

    const targetDateInput = new TextInputBuilder()
        .setCustomId('milestone-target-date')
        .setLabel('Target Date (DD/MM/YYYY)')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('e.g., 31/12/2026')
        .setRequired(true)
        .setMaxLength(10);

    const descriptionInput = new TextInputBuilder()
        .setCustomId('milestone-description')
        .setLabel('Description')
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder('Details about this milestone...')
        .setRequired(true)
        .setMaxLength(1000);

    modal.addComponents(
        new ActionRowBuilder<TextInputBuilder>().addComponents(nameInput),
        new ActionRowBuilder<TextInputBuilder>().addComponents(targetDateInput),
        new ActionRowBuilder<TextInputBuilder>().addComponents(descriptionInput),
    );

    return modal;
}
