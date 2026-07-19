import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { IdeaService } from '../services/idea-service';
import { IdeasRepo } from '../sheets/ideas.repo';
import { LogsRepo } from '../sheets/logs.repo';
import { GradesRepo } from '../sheets/grades.repo';
import { MemoryTable } from '../sheets/memory-table';
import type { Actor, Idea, LogEntry, Grade } from '../types';

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
                category: 'EdTech',
            },
            actor,
        );

        assert.equal(idea.id, 'id-1');
        assert.equal(idea.status, 'Active');
        assert.equal(idea.submitted_by, actor.id);
        assert.equal(idea.category, 'EdTech');

        const entries = await logs.findAll();
        assert.equal(entries.length, 1);
        assert.equal(entries[0].action_type, 'idea.create');
        assert.equal(entries[0].target_id, idea.id);
    });

    it('lists active ideas with grade summaries', async () => {
        const { service } = createTestService();
        const actor: Actor = { id: 'u1', name: 'Mohamed' };
        const grader: Actor = { id: 'u2', name: 'Sara' };

        const idea = await service.createIdea(
            {
                title: 'GradBot',
                description: 'Discord bot for project management.',
                techStack: 'TypeScript',
                difficulty: 'Easy',
                category: 'Dev Tools',
            },
            actor,
        );
        await service.gradeIdea(idea.id, { learning: 4, impact: 3, feasibility: 5, innovation: 2 }, grader);

        const rows = await service.listIdeas();
        assert.equal(rows.length, 1);
        assert.equal(rows[0].idea.title, 'GradBot');
        assert.equal(rows[0].grades.count, 1);
        assert.equal(rows[0].grades.learning, 4);
        assert.equal(rows[0].grades.overall, 3.5);
    });

    it('lets one user update their grade instead of creating duplicates', async () => {
        const { service, grades } = createTestService();
        const actor: Actor = { id: 'u1', name: 'Mohamed' };
        const grader: Actor = { id: 'u2', name: 'Sara' };

        const idea = await service.createIdea(
            {
                title: 'Project Tracker',
                description: 'Tracks tasks and milestones.',
                techStack: 'Google Sheets',
                difficulty: 'Hard',
                category: 'B2B',
            },
            actor,
        );

        await service.gradeIdea(idea.id, { learning: 3, impact: 3, feasibility: 3, innovation: 3 }, grader);
        const updated = await service.gradeIdea(idea.id, { learning: 5, impact: 5, feasibility: 5, innovation: 5 }, grader);

        assert.equal(updated.grades.count, 1);
        assert.equal(updated.grades.overall, 5);
        assert.equal((await grades.findByIdeaId(idea.id)).length, 1);
    });

    it('grades an idea without any discord wiring', async () => {
        const { service, ideas, grades, logs } = createTestService();
        const author: Actor = { id: 'u1', name: 'Mohamed' };
        const grader: Actor = { id: 'u2', name: 'Sara' };

        const idea = await service.createIdea(
            {
                title: 'Discord-Free Grade Test',
                description: 'Ensures grading only touches local stores.',
                techStack: 'TypeScript',
                difficulty: 'Medium',
                category: 'Other',
            },
            author,
        );

        const result = await service.gradeIdea(
            idea.id,
            { learning: 2, impact: 4, feasibility: 5, innovation: 3 },
            grader,
        );

        assert.equal(result.grades.count, 1);
        assert.equal(result.grades.overall, 3.5);

        const storedIdea = await ideas.findById(idea.id);
        assert.equal(storedIdea?.voting_message_id, '');

        const storedGrades = await grades.findByIdeaId(idea.id);
        assert.equal(storedGrades.length, 1);

        const entries = await logs.findAll();
        assert.equal(entries.length, 2);
        assert.equal(entries[1].action_type, 'idea.grade');
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
                category: 'Other',
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
                category: 'Other',
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

    it('retrieves comments for an idea', async () => {
        const { service } = createTestService();
        const actor: Actor = { id: 'u1', name: 'Alice' };

        const idea = await service.createIdea(
            {
                title: 'Discussion',
                description: 'Has comments.',
                techStack: '',
                difficulty: 'Medium',
                category: 'Social',
            },
            actor,
        );

        await service.commentOnIdea(idea.id, 'First comment', actor);
        await service.commentOnIdea(idea.id, 'Second comment', actor);

        const comments = await service.getCommentsForIdea(idea.id);
        assert.equal(comments.length, 2);
        assert.equal(comments[0].text, 'First comment');
        assert.equal(comments[1].text, 'Second comment');
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
                category: 'Other',
            },
            actor,
        );

        await service.updateIdeaThread(idea.id, 'thread-123');

        const updated = await ideas.findById(idea.id);
        assert.equal(updated?.thread_id, 'thread-123');
    });

    it('includes grades and comments in getIdea result', async () => {
        const { service } = createTestService();
        const author: Actor = { id: 'u1', name: 'Alice' };
        const grader: Actor = { id: 'u2', name: 'Bob' };

        const idea = await service.createIdea(
            {
                title: 'Full View',
                description: 'View with grades and comments.',
                techStack: 'React',
                difficulty: 'Hard',
                category: 'Fintech',
            },
            author,
        );

        await service.gradeIdea(idea.id, { learning: 4, impact: 5, feasibility: 3, innovation: 4 }, grader);
        await service.commentOnIdea(idea.id, 'Looks great!', grader);

        const result = await service.getIdea(idea.id);
        assert.equal(result.grades.count, 1);
        assert.equal(result.grades.impact, 5);
        assert.equal(result.comments.length, 1);
        assert.equal(result.comments[0].text, 'Looks great!');
    });
});

function createTestService() {
    let idCounter = 0;
    const ideas = new IdeasRepo(new MemoryTable<Idea>());
    const grades = new GradesRepo(new MemoryTable<Grade>());
    const logs = new LogsRepo(new MemoryTable<LogEntry>());
    const service = new IdeaService(
        { ideas, grades, logs },
        {
            newId: () => `id-${++idCounter}`,
            now: () => '2026-07-01T00:00:00.000Z',
        },
    );

    return { service, ideas, grades, logs };
}
