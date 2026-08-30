import type { ChatInputCommandInteraction, GuildMemberRoleManager } from 'discord.js';
import type { ENV } from './config';

type EnvShape = typeof ENV;

export function canManageProject(interaction: ChatInputCommandInteraction, env: EnvShape): { allowed: boolean; message: string } {
    const isOwner = interaction.guild?.ownerId === interaction.user.id;
    if (isOwner) {
        return { allowed: true, message: '' };
    }

    const hasAdminPermission = interaction.memberPermissions?.has('Administrator');
    if (hasAdminPermission) {
        return { allowed: true, message: '' };
    }

    const configuredRoleIds = [env.ADMIN_ROLE_ID, env.LEAD_ROLE_ID].filter(Boolean);

    if (configuredRoleIds.length === 0) {
        return { 
            allowed: false, 
            message: 'Permission denied: No admin/lead roles are configured in the bot environment, and you are not a server administrator.' 
        };
    }

    const roles = interaction.member?.roles;
    let hasRole = false;

    if (Array.isArray(roles)) {
        hasRole = roles.some((roleId) => configuredRoleIds.includes(roleId));
    } else {
        const guildRoles = roles as GuildMemberRoleManager | undefined;
        hasRole = configuredRoleIds.some((roleId) => guildRoles?.cache.has(roleId));
    }

    if (hasRole) {
        return { allowed: true, message: '' };
    }

    return { 
        allowed: false, 
        message: 'Permission denied: You need a Team Lead or Admin role, or Administrator permissions to perform this action.' 
    };
}
