import type { ChatInputCommandInteraction, GuildMemberRoleManager } from 'discord.js';
import type { ENV } from './config';

type EnvShape = typeof ENV;

export function canManageProject(interaction: ChatInputCommandInteraction, env: EnvShape): boolean {
    const configuredRoleIds = [env.ADMIN_ROLE_ID, env.LEAD_ROLE_ID].filter(Boolean);

    if (configuredRoleIds.length === 0) {
        return true;
    }

    const roles = interaction.member?.roles;

    if (Array.isArray(roles)) {
        return roles.some((roleId) => configuredRoleIds.includes(roleId));
    }

    const guildRoles = roles as GuildMemberRoleManager | undefined;
    return configuredRoleIds.some((roleId) => guildRoles?.cache.has(roleId));
}
