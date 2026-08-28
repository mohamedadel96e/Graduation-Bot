import type { CommandContext } from '../commands/types';
import type { DiscordLogger } from '../services/logger';
import { ideaGradeModal } from '../ui/modals/idea-grade';
import { ideaCommentModal } from '../ui/modals/idea-comment';

export async function handleButtonSubmit(interaction: any, context: CommandContext, logger: DiscordLogger) {
    if (interaction.customId.startsWith('grade_')) {
        const ideaId = interaction.customId.replace('grade_', '');
        await interaction.showModal(ideaGradeModal(ideaId));
    } else if (interaction.customId.startsWith('add_comment_')) {
        const ideaId = interaction.customId.replace('add_comment_', '');
        await interaction.showModal(ideaCommentModal(ideaId));
    } else if (interaction.customId.startsWith('comments_')) {
        const ideaId = interaction.customId.replace('comments_', '');
        await handleViewCommentsButton(interaction, ideaId, context, logger);
    }
}

async function handleViewCommentsButton(interaction: any, ideaId: string, context: CommandContext, logger: DiscordLogger) {
    try {
        await interaction.deferReply({ flags: ['Ephemeral'] });
        const comments = await context.ideas.getCommentsForIdea(ideaId);
        
        if (comments.length === 0) {
            await interaction.editReply({ content: 'There are no comments on this idea yet.' });
            return;
        }

        const lines = comments.map(c => `**${c.actor_name}** (${new Date(c.timestamp).toLocaleString()}):\n> ${c.text}`);
        
        let content = `**Comments:**\n\n${lines.join('\n\n')}`;
        if (content.length > 2000) {
            content = content.slice(0, 1950) + '\n\n... (some comments were truncated)';
        }

        await interaction.editReply({ content });
    } catch (error) {
        console.error('View comments button failed:', error);
        await logger.logError(error, 'Button: comments').catch(() => {});
        const msg = 'Failed to load comments.';
        if (interaction.deferred || interaction.replied) await interaction.editReply({ content: msg });
        else await interaction.reply({ content: msg, flags: ['Ephemeral'] });
    }
}
