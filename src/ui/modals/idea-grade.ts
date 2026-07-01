import { ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } from 'discord.js';

export function ideaGradeModal(ideaId: string): ModalBuilder {
    const modal = new ModalBuilder()
        .setCustomId(`modal-idea-grade_${ideaId}`)
        .setTitle('Grade This Idea');

    const learningInput = new TextInputBuilder()
        .setCustomId('grade-learning')
        .setLabel('Learning Value (1-5)')
        .setPlaceholder('How much will this project teach the team?')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setMinLength(1)
        .setMaxLength(1);

    const impactInput = new TextInputBuilder()
        .setCustomId('grade-impact')
        .setLabel('Problem Impact (1-5)')
        .setPlaceholder('Does this solve a real-world problem?')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setMinLength(1)
        .setMaxLength(1);

    const feasibilityInput = new TextInputBuilder()
        .setCustomId('grade-feasibility')
        .setLabel('Feasibility (1-5)')
        .setPlaceholder('Can the team realistically build this?')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setMinLength(1)
        .setMaxLength(1);

    const innovationInput = new TextInputBuilder()
        .setCustomId('grade-innovation')
        .setLabel('Innovation (1-5)')
        .setPlaceholder('How original or creative is this idea?')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setMinLength(1)
        .setMaxLength(1);

    modal.addComponents(
        new ActionRowBuilder<TextInputBuilder>().addComponents(learningInput),
        new ActionRowBuilder<TextInputBuilder>().addComponents(impactInput),
        new ActionRowBuilder<TextInputBuilder>().addComponents(feasibilityInput),
        new ActionRowBuilder<TextInputBuilder>().addComponents(innovationInput),
    );

    return modal;
}
