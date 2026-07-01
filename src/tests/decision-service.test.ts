import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { DecisionService } from '../services/decision-service';
import { IdeasRepo } from '../sheets/ideas.repo';
import { DecisionRepo } from '../sheets/decision.repo';
import { LogsRepo } from '../sheets/logs.repo';
import { MemoryTable } from '../sheets/memory-table';
import type { Actor, Idea, LogEntry, Decision } from '../types';

describe('DecisionService', () => {
    it('finalizes an idea and creates a decision', async () => {
        const { service, ideas, logs } = createTestService();
        const actor: Actor = { id: 'u1', name: 'Alice' };

        // Pre-seed an idea
        const ideaRow: Idea = {
            id: 'id-1',
            title: 'Test',
            description: 'Test desc',
            difficulty: 'Easy',
            tech_stack: '',
            status: 'Active',
            submitted_by: 'u2',
            submitted_by_name: 'Bob',
            thread_id: '',
            created_at: '2026-07-01T00:00:00.000Z',
            updated_at: '2026-07-01T00:00:00.000Z',
        };
        await ideas.create(ideaRow);

        const { decision, idea } = await service.finalize('id-1', actor);

        assert.equal(idea.status, 'Finalized');
        assert.equal(decision.idea_id, 'id-1');
        assert.equal(decision.decided_by, 'u1');

        const entries = await logs.findAll();
        assert.equal(entries.length, 1);
        assert.equal(entries[0].action_type, 'decision.finalize');
    });

    it('adds reasoning to a decision', async () => {
        const { service, ideas } = createTestService();
        const actor: Actor = { id: 'u1', name: 'Alice' };

        const ideaRow: Idea = {
            id: 'id-1',
            title: 'Test',
            description: 'Test desc',
            difficulty: 'Easy',
            tech_stack: '',
            status: 'Active',
            submitted_by: 'u2',
            submitted_by_name: 'Bob',
            thread_id: '',
            created_at: '2026-07-01T00:00:00.000Z',
            updated_at: '2026-07-01T00:00:00.000Z',
        };
        await ideas.create(ideaRow);

        await service.finalize('id-1', actor);
        const updated = await service.addReasoning('Because it is great', actor);

        assert.equal(updated.reasoning, 'Because it is great');
    });

    it('gets the current status', async () => {
        const { service, ideas } = createTestService();
        const actor: Actor = { id: 'u1', name: 'Alice' };

        // Pre-seed an idea
        const ideaRow: Idea = {
            id: 'id-2',
            title: 'Test 2',
            description: 'Test desc 2',
            difficulty: 'Easy',
            tech_stack: '',
            status: 'Active',
            submitted_by: 'u2',
            submitted_by_name: 'Bob',
            thread_id: '',
            created_at: '2026-07-01T00:00:00.000Z',
            updated_at: '2026-07-01T00:00:00.000Z',
        };
        await ideas.create(ideaRow);

        const before = await service.getStatus();
        assert.equal(before, null);

        await service.finalize('id-2', actor);

        const after = await service.getStatus();
        assert.notEqual(after, null);
        assert.equal(after?.idea.id, 'id-2');
    });
});

function createTestService() {
    let idCounter = 0;
    const ideas = new IdeasRepo(new MemoryTable<Idea>());
    const decision = new DecisionRepo(new MemoryTable<Decision>());
    const logs = new LogsRepo(new MemoryTable<LogEntry>());
    const service = new DecisionService(
        { decision, ideas, logs },
        {
            newId: () => `id-${++idCounter}`,
            now: () => '2026-07-01T00:00:00.000Z',
        },
    );

    return { service, ideas, decision, logs };
}
