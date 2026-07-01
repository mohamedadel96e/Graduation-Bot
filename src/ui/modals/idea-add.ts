import { ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } from 'discord.js';

export function ideaAddModal(): ModalBuilder {
    const modal = new ModalBuilder()
        .setCustomId('modal-idea-add')
        .setTitle('Submit a Project Idea');

    const titleInput = new TextInputBuilder()
        .setCustomId('idea-title')
        .setLabel('Title')
        .setPlaceholder('Short, catchy title for the idea')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setMaxLength(80);

    const descriptionInput = new TextInputBuilder()
        .setCustomId('idea-description')
        .setLabel('Description')
        .setPlaceholder('What does the project do and why does it matter?')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true);

    const difficultyInput = new TextInputBuilder()
        .setCustomId('idea-difficulty')
        .setLabel('Difficulty (Easy, Medium, or Hard)')
        .setPlaceholder('Easy, Medium, or Hard')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

    const categoryInput = new TextInputBuilder()
        .setCustomId('idea-category')
        .setLabel('Category')
        .setPlaceholder('B2B, Fintech, EdTech, HealthTech, Social, Dev Tools, Other')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

    modal.addComponents(
        new ActionRowBuilder<TextInputBuilder>().addComponents(titleInput),
        new ActionRowBuilder<TextInputBuilder>().addComponents(descriptionInput),
        new ActionRowBuilder<TextInputBuilder>().addComponents(difficultyInput),
        new ActionRowBuilder<TextInputBuilder>().addComponents(categoryInput),
    );

    return modal;
}
