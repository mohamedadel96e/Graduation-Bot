import { ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } from 'discord.js';

export function ideaAddModal(): ModalBuilder {
    const modal = new ModalBuilder()
        .setCustomId('modal-idea-add')
        .setTitle('💡 Submit a Project Idea');

    const titleInput = new TextInputBuilder()
        .setCustomId('idea-title')
        .setLabel('Title')
        .setPlaceholder('Short, catchy title for the idea')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setMaxLength(120);

    const descriptionInput = new TextInputBuilder()
        .setCustomId('idea-description')
        .setLabel('Description')
        .setPlaceholder('What does the project do and why does it matter?')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true);

    const difficultyInput = new TextInputBuilder()
        .setCustomId('idea-difficulty')
        .setLabel('Difficulty (Easy, Medium, or Hard)')
        .setPlaceholder('Easy, Medium, Hard')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

    const techStackInput = new TextInputBuilder()
        .setCustomId('idea-tech-stack')
        .setLabel('Tech Stack')
        .setPlaceholder('e.g., React, Node.js, PostgreSQL (optional)')
        .setStyle(TextInputStyle.Short)
        .setRequired(false);

    modal.addComponents(
        new ActionRowBuilder<TextInputBuilder>().addComponents(titleInput),
        new ActionRowBuilder<TextInputBuilder>().addComponents(descriptionInput),
        new ActionRowBuilder<TextInputBuilder>().addComponents(difficultyInput),
        new ActionRowBuilder<TextInputBuilder>().addComponents(techStackInput),
    );

    return modal;
}
