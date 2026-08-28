import { Collection, Events, Interaction } from 'discord.js';
import type { BotCommand, CommandContext } from '../commands/types';
import type { DiscordLogger } from '../services/logger';
import { handleModalSubmit } from '../handlers/modal-handler';
import { handleButtonSubmit } from '../handlers/button-handler';

export function setupInteractionCreateEvent(
    client: any,
    commandMap: Collection<string, BotCommand>,
    context: CommandContext,
    discordLogger: DiscordLogger
) {
    client.on(Events.InteractionCreate, async (interaction: Interaction) => {
        // Handle modal submissions
        if (interaction.isModalSubmit()) {
            await handleModalSubmit(interaction, context, discordLogger);
            return;
        }

        // Handle button clicks
        if (interaction.isButton()) {
            await handleButtonSubmit(interaction, context, discordLogger);
            return;
        }

        if (!interaction.isChatInputCommand()) {
            return;
        }

        const command = commandMap.get(interaction.commandName);

        if (!command) {
            await interaction.reply({ content: 'Unknown command.', flags: ['Ephemeral'] });
            return;
        }

        try {
            await command.execute(interaction, context);
        } catch (error) {
            console.error(`Command ${interaction.commandName} failed:`, error);

            // Log the error to #bot-errors
            await discordLogger.logError(error, `Command: /${interaction.commandName}`).catch(() => {});

            try {
                const content = 'Something went wrong while running that command.';
                if (interaction.deferred || interaction.replied) {
                    await interaction.editReply({ content });
                } else {
                    await interaction.reply({ content, flags: ['Ephemeral'] });
                }
            } catch {
                // Interaction is fully expired — nothing we can do
                console.error('Could not send error response to user (interaction expired).');
            }
        }
    });
}
