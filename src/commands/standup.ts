import { SlashCommandBuilder } from 'discord.js';
import type { BotCommand } from './types';
import { standupModal } from '../ui/modals/standup';

export const standupCommand: BotCommand = {
    data: new SlashCommandBuilder()
        .setName('standup')
        .setDescription('Submit your daily standup (opens a modal)'),

    async execute(interaction) {
        // Just show the modal immediately
        await interaction.showModal(standupModal());
    },
};
