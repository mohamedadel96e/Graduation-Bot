import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { IdeaService } from '../services/idea-service';
import { IdeasRepo } from '../sheets/ideas.repo';
import { LogsRepo } from '../sheets/logs.repo';
import { MemoryTable } from '../sheets/memory-table';
import { VotesRepo } from '../sheets/votes.repo';
import type { Actor, Idea, LogEntry, Vote } from '../types';

describe('IdeaService', () => {
    it('creates an idea and records an audit log', async () => {
        const { service, logs } = createTestService();
        const actor: Actor = { id: 'u1', name: 'Mohamed' };

        const idea = await service.createIdea(
            {
                title: 'AI Study Planner',
                description: 'Plans graduation tasks and reminders.',
                techStack: 'Node.js, Discord.js',
                difficulty: 'Medium',
            },
            actor,
        );

        assert.equal(idea.id, 'id-1');
        assert.equal(idea.status, 'Active');
        assert.equal(idea.submitted_by, actor.id);

        const entries = await logs.findAll();
        assert.equal(entries.length, 1);
        assert.equal(entries[0].action_type, 'idea.create');
        assert.equal(entries[0].target_id, idea.id);
    });

    it('lists active ideas with vote tallies', async () => {
        const { service } = createTestService();
        const actor: Actor = { id: 'u1', name: 'Mohamed' };
        const voter: Actor = { id: 'u2', name: 'Sara' };

        const idea = await service.createIdea(
            {
                title: 'GradBot',
                description: 'Discord bot for project management.',
                techStack: 'TypeScript',
                difficulty: 'Easy',
            },
            actor,
        );
        await service.voteIdea(idea.id, 'up', voter);

        const rows = await service.listIdeas();
        assert.equal(rows.length, 1);
        assert.equal(rows[0].idea.title, 'GradBot');
        assert.deepEqual(rows[0].tally, { up: 1, down: 0, unsure: 0, total: 1 });
    });

    it('lets one user change their vote instead of creating duplicates', async () => {
        const { service, votes } = createTestService();
        const actor: Actor = { id: 'u1', name: 'Mohamed' };
        const voter: Actor = { id: 'u2', name: 'Sara' };

        const idea = await service.createIdea(
            {
                title: 'Project Tracker',
                description: 'Tracks tasks and milestones.',
                techStack: 'Google Sheets',
                difficulty: 'Hard',
            },
            actor,
        );

        await service.voteIdea(idea.id, 'up', voter);
        const updated = await service.voteIdea(idea.id, 'down', voter);

        assert.deepEqual(updated.tally, { up: 0, down: 1, unsure: 0, total: 1 });
        assert.equal((await votes.findByIdeaId(idea.id)).length, 1);
    });

    it('archives ideas and hides them from the default active list', async () => {
        const { service } = createTestService();
        const actor: Actor = { id: 'u1', name: 'Mohamed' };
        const idea = await service.createIdea(
            {
                title: 'Archive Me',
                description: 'Temporary idea.',
                techStack: '',
                difficulty: 'Easy',
            },
            actor,
        );

        const archived = await service.archiveIdea(idea.id, actor);
        const activeIdeas = await service.listIdeas();
        const archivedIdeas = await service.listIdeas('Archived');

        assert.equal(archived.status, 'Archived');
        assert.equal(activeIdeas.length, 0);
        assert.equal(archivedIdeas.length, 1);
    });

    it('adds a comment and logs it', async () => {
        const { service, logs } = createTestService();
        const actor: Actor = { id: 'u1', name: 'Alice' };

        const idea = await service.createIdea(
            {
                title: 'Commentable',
                description: 'We can comment on this.',
                techStack: '',
                difficulty: 'Easy',
            },
            actor,
        );

        await service.commentOnIdea(idea.id, 'This is a test comment', actor);
        
        const entries = await logs.findAll();
        // createIdea + commentOnIdea
        assert.equal(entries.length, 2);
        assert.equal(entries[1].action_type, 'idea.comment');
        assert.equal(entries[1].detail, 'This is a test comment');
    });

    it('updates the thread id', async () => {
        const { service, ideas } = createTestService();
        const actor: Actor = { id: 'u1', name: 'Alice' };

        const idea = await service.createIdea(
            {
                title: 'Threadable',
                description: 'Threads',
                techStack: '',
                difficulty: 'Easy',
            },
            actor,
        );

        await service.updateIdeaThread(idea.id, 'thread-123');
        
        const updated = await ideas.findById(idea.id);
        assert.equal(updated?.thread_id, 'thread-123');
    });
});

function createTestService() {
    let idCounter = 0;
    const ideas = new IdeasRepo(new MemoryTable<Idea>());
    const votes = new VotesRepo(new MemoryTable<Vote>());
    const logs = new LogsRepo(new MemoryTable<LogEntry>());
    const service = new IdeaService(
        { ideas, votes, logs },
        {
            newId: () => `id-${++idCounter}`,
            now: () => '2026-07-01T00:00:00.000Z',
        },
    );

    return { service, ideas, votes, logs };
}
