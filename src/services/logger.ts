import { Client, EmbedBuilder, TextChannel } from 'discord.js';
import type { LogEntry } from '../types';
import { PALETTE, BOT_FOOTER } from '../ui/design';

/**
 * Posts log entries to Discord channels (#bot-logs and #bot-errors).
 * This makes every action the bot takes visible to the team.
 */
export class DiscordLogger {
    private logChannel: TextChannel | null = null;
    private errorChannel: TextChannel | null = null;

    constructor(
        private readonly client: Client,
        private readonly logChannelId: string,
        private readonly errorChannelId: string,
    ) {}

    /**
     * Resolve channel references. Call once the client is ready.
     */
    async init(): Promise<void> {
        if (this.logChannelId) {
            try {
                const channel = await this.client.channels.fetch(this.logChannelId);
                if (channel?.isTextBased()) {
                    this.logChannel = channel as TextChannel;
                    console.log(`Logger bound to #${this.logChannel.name} for logs.`);
                }
            } catch (err) {
                console.warn(`Could not fetch log channel ${this.logChannelId}:`, err);
            }
        }

        if (this.errorChannelId) {
            try {
                const channel = await this.client.channels.fetch(this.errorChannelId);
                if (channel?.isTextBased()) {
                    this.errorChannel = channel as TextChannel;
                    console.log(`Logger bound to #${this.errorChannel.name} for errors.`);
                }
            } catch (err) {
                console.warn(`Could not fetch error channel ${this.errorChannelId}:`, err);
            }
        }
    }

    /**
     * Post a log entry to #bot-logs as a rich embed.
     */
    async logAction(entry: LogEntry): Promise<void> {
        if (!this.logChannel) return;

        const color = actionColor(entry.action_type);
        const embed = new EmbedBuilder()
            .setColor(color)
            .setTitle(formatActionType(entry.action_type))
            .setDescription(entry.detail || 'No detail.')
            .addFields(
                { name: 'Actor', value: entry.actor_name || entry.actor_id || 'System', inline: true },
                { name: 'Target', value: entry.target_id || '—', inline: true },
                { name: 'Log ID', value: entry.id, inline: true },
            )
            .setTimestamp(new Date(entry.timestamp))
            .setFooter({ text: `${BOT_FOOTER} | ${entry.action_type}` });

        if (entry.before) {
            embed.addFields({ name: 'Before', value: truncate(entry.before, 1024), inline: false });
        }
        if (entry.after) {
            embed.addFields({ name: 'After', value: truncate(entry.after, 1024), inline: false });
        }

        try {
            await this.logChannel.send({ embeds: [embed] });
        } catch (err) {
            console.error('Failed to post to log channel:', err);
        }
    }

    /**
     * Post an informational system message (e.g., startup, shutdown).
     */
    async logSystem(message: string): Promise<void> {
        if (!this.logChannel) return;

        const embed = new EmbedBuilder()
            .setColor(PALETTE.sage)
            .setTitle('System')
            .setDescription(message)
            .setTimestamp(new Date())
            .setFooter({ text: BOT_FOOTER });

        try {
            await this.logChannel.send({ embeds: [embed] });
        } catch (err) {
            console.error('Failed to post system log:', err);
        }
    }

    /**
     * Post an error to #bot-errors.
     */
    async logError(error: unknown, context?: string): Promise<void> {
        const channel = this.errorChannel ?? this.logChannel;
        if (!channel) return;

        const errorMessage = error instanceof Error ? error.message : String(error);
        const embed = new EmbedBuilder()
            .setColor(PALETTE.error)
            .setTitle('Error')
            .setDescription(truncate(errorMessage, 4096))
            .setTimestamp(new Date())
            .setFooter({ text: BOT_FOOTER });

        if (context) {
            embed.addFields({ name: 'Context', value: truncate(context, 1024), inline: false });
        }

        try {
            await channel.send({ embeds: [embed] });
        } catch (err) {
            console.error('Failed to post to error channel:', err);
        }
    }
}

function actionColor(actionType: string): number {
    if (actionType.includes('create') || actionType.includes('add')) return PALETTE.sage;
    if (actionType.includes('archive') || actionType.includes('delete')) return PALETTE.forest;
    if (actionType.includes('grade')) return PALETTE.sand;
    if (actionType.includes('finalize') || actionType.includes('decide')) return PALETTE.sage;
    if (actionType.includes('status') || actionType.includes('update')) return PALETTE.sand;
    return PALETTE.forest;
}

function formatActionType(actionType: string): string {
    return actionType
        .replace(/\./g, ' > ')
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase());
}

function truncate(text: string, maxLen: number): string {
    if (text.length <= maxLen) return text;
    return text.slice(0, maxLen - 3) + '...';
}
