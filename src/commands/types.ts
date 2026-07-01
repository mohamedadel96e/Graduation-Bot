import type {
    ChatInputCommandInteraction,
    SlashCommandBuilder,
    SlashCommandSubcommandsOnlyBuilder,
} from 'discord.js';
import type { ENV } from '../config';
import type { DecisionService } from '../services/decision-service';
import type { IdeaService } from '../services/idea-service';
import type { DiscordLogger } from '../services/logger';

export interface CommandContext {
    env: typeof ENV;
    ideas: IdeaService;
    decisions: DecisionService;
    logger: DiscordLogger;
}

export interface BotCommand {
    data: SlashCommandBuilder | SlashCommandSubcommandsOnlyBuilder;
    execute(interaction: ChatInputCommandInteraction, context: CommandContext): Promise<void>;
}
