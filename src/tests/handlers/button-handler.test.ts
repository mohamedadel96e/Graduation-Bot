import assert from 'node:assert/strict';
import { describe, it, mock } from 'node:test';
import { handleButtonSubmit } from '../../handlers/button-handler';
import { IdeaService } from '../../services/idea-service';
import { DecisionService } from '../../services/decision-service';
import { TaskService } from '../../services/task-service';
import { MilestoneService } from '../../services/milestone-service';
import { StandupService } from '../../services/standup-service';
import { MemoryTable } from '../../sheets/memory-table';
import { IdeasRepo } from '../../sheets/ideas.repo';
import { DecisionRepo } from '../../sheets/decision.repo';
import { GradesRepo } from '../../sheets/grades.repo';
import { TasksRepo } from '../../sheets/tasks.repo';
import { MilestonesRepo } from '../../sheets/milestones.repo';
import { StandupsRepo } from '../../sheets/standups.repo';
import { LogsRepo } from '../../sheets/logs.repo';
import type { CommandContext } from '../../commands/types';
import type { DiscordLogger } from '../../services/logger';
import type { Idea, Decision, Grade, Task, Milestone, Standup, LogEntry } from '../../types';

function createMockContext(): CommandContext {
    const logsRepo = new LogsRepo(new MemoryTable<LogEntry>());
    const sys = { newId: () => 'test-id', now: () => new Date().toISOString() };
    const ideasRepo = new IdeasRepo(new MemoryTable<Idea>());

    return {
        env: {
            DISCORD_TOKEN: 'test',
            DISCORD_CLIENT_ID: 'test',
            DISCORD_GUILD_ID: 'test',
            GOOGLE_SERVICE_ACCOUNT_EMAIL: '',
            GOOGLE_PRIVATE_KEY: '',
            GOOGLE_SHEET_ID: '',
            LOG_CHANNEL_ID: '',
            ERROR_CHANNEL_ID: '',
            DIGEST_CHANNEL_ID: '',
            DISCUSSION_CHANNEL_ID: '',
            VOTING_RESULTS_CHANNEL_ID: '',
            STANDUP_CHANNEL_ID: '',
            LEAD_ROLE_ID: '',
            ADMIN_ROLE_ID: '',
        },
        ideas: new IdeaService({ ideas: ideasRepo, grades: new GradesRepo(new MemoryTable<Grade>()), logs: logsRepo }, sys),
        decisions: new DecisionService({ decision: new DecisionRepo(new MemoryTable<Decision>()), ideas: ideasRepo, logs: logsRepo }, sys),
        tasks: new TaskService({ tasks: new TasksRepo(new MemoryTable<Task>()), logs: logsRepo }, sys),
        milestones: new MilestoneService({ milestones: new MilestonesRepo(new MemoryTable<Milestone>()), logs: logsRepo }, sys),
        standups: new StandupService({ standups: new StandupsRepo(new MemoryTable<Standup>()), logs: logsRepo }, sys),
        logger: {
            logAction: mock.fn(async () => {}),
            logError: mock.fn(async () => {}),
            logSystem: mock.fn(async () => {}),
        } as unknown as DiscordLogger,
    };
}

function createMockButtonInteraction(customId: string) {
    return {
        customId,
        user: { id: 'u1', globalName: 'TestUser', username: 'testuser' },
        showModal: mock.fn(async () => {}),
        deferReply: mock.fn(async () => {}),
        editReply: mock.fn(async () => {}),
        reply: mock.fn(async () => {}),
        deferred: false,
        replied: false,
        guild: null,
        client: { channels: { fetch: mock.fn(async () => null) } },
        message: { edit: mock.fn(async () => {}) },
    } as any;
}

describe('Button Handler', () => {
    it('Grade button shows grade modal -> interaction with customId="grade_id-1" -> showModal() called', async () => {
        const interaction = createMockButtonInteraction('grade_id-1');
        const context = createMockContext();
        
        await handleButtonSubmit(interaction, context, context.logger);
        
        assert.equal(interaction.showModal.mock.callCount(), 1);
        const modal = interaction.showModal.mock.calls[0].arguments[0];
        assert.equal(modal.data.custom_id, 'modal-idea-grade_id-1');
    });

    it('Comment button shows comment modal -> interaction with customId="add_comment_id-1" -> showModal() called', async () => {
        const interaction = createMockButtonInteraction('add_comment_id-1');
        const context = createMockContext();
        
        await handleButtonSubmit(interaction, context, context.logger);
        
        assert.equal(interaction.showModal.mock.callCount(), 1);
        const modal = interaction.showModal.mock.calls[0].arguments[0];
        assert.equal(modal.data.custom_id, 'modal-idea-comment_id-1');
    });

    it('View comments button defers and replies -> interaction with customId="comments_id-1" -> deferReply() called', async () => {
        const interaction = createMockButtonInteraction('comments_id-1');
        const context = createMockContext();
        
        await handleButtonSubmit(interaction, context, context.logger);
        
        assert.equal(interaction.deferReply.mock.callCount(), 1);
        assert.deepEqual(interaction.deferReply.mock.calls[0].arguments, [{ flags: ['Ephemeral'] }]);
    });

    it('Unknown button ID does nothing -> interaction with customId="unknown_btn" -> no handler called', async () => {
        const interaction = createMockButtonInteraction('unknown_btn');
        const context = createMockContext();
        
        await handleButtonSubmit(interaction, context, context.logger);
        
        assert.equal(interaction.showModal.mock.callCount(), 0);
        assert.equal(interaction.deferReply.mock.callCount(), 0);
        assert.equal(interaction.editReply.mock.callCount(), 0);
        assert.equal(interaction.reply.mock.callCount(), 0);
    });
});
