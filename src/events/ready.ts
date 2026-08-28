import { Events, Client } from 'discord.js';
import type { DiscordLogger } from '../services/logger';
import { testSheetConnection } from '../sheets/client';
import { ENV } from '../config';

export function setupReadyEvent(client: Client, discordLogger: DiscordLogger, env: typeof ENV) {
    client.once(Events.ClientReady, async (readyClient) => {
        console.log(`Logged in as ${readyClient.user.tag}`);

        // Initialize the Discord logger (resolve channel references)
        await discordLogger.init();

        // Test Google Sheets connection
        if (env.GOOGLE_SHEET_ID && env.GOOGLE_PRIVATE_KEY && env.GOOGLE_SERVICE_ACCOUNT_EMAIL) {
            const sheetsOk = await testSheetConnection(env);
            if (sheetsOk) {
                await discordLogger.logSystem(
                    `**GradBot is online!**\n` +
                        `Connected to Google Sheets.\n` +
                        `Ready to manage your graduation project.\n\n` +
                        `Use \`/idea add\` to submit a new idea.`,
                );
            } else {
                await discordLogger.logError(
                    'Google Sheets connection failed on startup.',
                    'ClientReady',
                );
            }
        } else {
            console.warn(
                'Google Sheets configuration is missing from .env, skipping connection test.',
            );
            await discordLogger.logSystem(
                `**GradBot is online!**\n` +
                    `Google Sheets is **not configured** — data will not be persisted.\n` +
                    `Add GOOGLE_SHEET_ID, GOOGLE_PRIVATE_KEY, and GOOGLE_SERVICE_ACCOUNT_EMAIL to .env.`,
            );
        }
    });
}
