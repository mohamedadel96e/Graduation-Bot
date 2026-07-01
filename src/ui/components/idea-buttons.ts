import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

export function ideaVotingButtons(ideaId: string): ActionRowBuilder<ButtonBuilder> {
    const upButton = new ButtonBuilder()
        .setCustomId(`vote-up_${ideaId}`)
        .setLabel('👍 Upvote')
        .setStyle(ButtonStyle.Success); // Represents MD3 success/primary

    const downButton = new ButtonBuilder()
        .setCustomId(`vote-down_${ideaId}`)
        .setLabel('👎 Downvote')
        .setStyle(ButtonStyle.Danger); // Represents MD3 error

    const unsureButton = new ButtonBuilder()
        .setCustomId(`vote-unsure_${ideaId}`)
        .setLabel('🤔 Unsure')
        .setStyle(ButtonStyle.Secondary); // Represents MD3 secondary

    return new ActionRowBuilder<ButtonBuilder>().addComponents(upButton, downButton, unsureButton);
}
