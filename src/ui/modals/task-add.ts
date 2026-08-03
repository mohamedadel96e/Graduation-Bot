import { ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } from 'discord.js';

export function taskAddModal(): ModalBuilder {
    const modal = new ModalBuilder()
        .setCustomId('modal-task-add')
        .setTitle('Create New Task');

    const titleInput = new TextInputBuilder()
        .setCustomId('task-title')
        .setLabel('Task Title')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('e.g., Implement login page')
        .setRequired(true)
        .setMaxLength(100);

    const descriptionInput = new TextInputBuilder()
        .setCustomId('task-description')
        .setLabel('Description')
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder('Details about the task...')
        .setRequired(true)
        .setMaxLength(1000);

    const priorityInput = new TextInputBuilder()
        .setCustomId('task-priority')
        .setLabel('Priority (High, Medium, Low)')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Medium')
        .setRequired(true)
        .setMaxLength(10);

    modal.addComponents(
        new ActionRowBuilder<TextInputBuilder>().addComponents(titleInput),
        new ActionRowBuilder<TextInputBuilder>().addComponents(descriptionInput),
        new ActionRowBuilder<TextInputBuilder>().addComponents(priorityInput),
    );

    return modal;
}
