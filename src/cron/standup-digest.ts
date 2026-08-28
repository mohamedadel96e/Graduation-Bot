import cron from 'node-cron';
import { Client, TextChannel } from 'discord.js';
import type { CommandContext } from '../commands/types';
import type { DiscordLogger } from '../services/logger';
import { ENV } from '../config';

export function scheduleStandupDigest(client: Client, context: CommandContext, discordLogger: DiscordLogger) {
    cron.schedule('0 0 * * *', async () => {
        try {
            console.log('Running daily standup digest cron job...');
            
            const channelId = context.env.STANDUP_CHANNEL_ID;
            if (!channelId) {
                console.error('STANDUP_CHANNEL_ID is not set in environment.');
                return;
            }

            const channel = await client.channels.fetch(channelId);
            if (!channel || !channel.isTextBased()) {
                console.error(`Could not find text channel with ID ${channelId} for standup digest.`);
                return;
            }

            const d = new Date();
            d.setDate(d.getDate() - 1);
            const year = d.getUTCFullYear();
            const month = String(d.getUTCMonth() + 1).padStart(2, '0');
            const day = String(d.getUTCDate()).padStart(2, '0');
            const targetDateStr = `${year}-${month}-${day}`;

            const standups = await context.standups.getStandupsByDate(targetDateStr);
            const textChannel = channel as TextChannel;

            if (standups.length === 0) {
                await textChannel.send(`No standups were submitted for ${targetDateStr}.`);
                return;
            }

            let digest = `**Daily Standup Digest for ${targetDateStr}**\n\n`;
            for (const s of standups) {
                digest += `**<@${s.user_id}>**\n`;
                digest += `**Done:** ${s.what_done}\n`;
                digest += `**Next:** ${s.what_next}\n`;
                digest += `**Blockers:** ${s.blockers}\n\n`;
            }

            await textChannel.send({ content: digest });
        } catch (error) {
            console.error('Failed to run daily standup digest:', error);
            discordLogger.logError(error, 'Cron: daily-standup-digest').catch(() => {});
        }
    }, {
        timezone: 'UTC'
    });
}
