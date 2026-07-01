import { REST, Routes } from 'discord.js';
import type { ENV } from '../config';
import type { BotCommand } from '../commands/types';

export async function registerGuildCommands(commands: BotCommand[], env: typeof ENV): Promise<void> {
    if (!env.DISCORD_TOKEN || !env.DISCORD_CLIENT_ID || !env.DISCORD_GUILD_ID) {
        console.warn('Discord command registration skipped. DISCORD_TOKEN, DISCORD_CLIENT_ID, or DISCORD_GUILD_ID is missing.');
        return;
    }

    const rest = new REST({ version: '10' }).setToken(env.DISCORD_TOKEN);
    await rest.put(Routes.applicationGuildCommands(env.DISCORD_CLIENT_ID, env.DISCORD_GUILD_ID), {
        body: commands.map((command) => command.data.toJSON()),
    });
}
