import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { MilestoneService } from '../services/milestone-service';
import { MilestonesRepo } from '../sheets/milestones.repo';
import { LogsRepo } from '../sheets/logs.repo';
import { MemoryTable } from '../sheets/memory-table';
import type { Actor, Milestone, LogEntry } from '../types';

describe('MilestoneService', () => {
    it('creates a milestone and records an audit log', async () => {
        const { service, logs } = createTestService();
        const actor: Actor = { id: 'u1', name: 'Mohamed' };

        const milestone = await service.createMilestone(
            {
                name: 'Phase 1',
                description: 'Initial release',
                target_date: '31/12/2026',
            },
            actor,
        );

        assert.equal(milestone.id, 'id-1');
        assert.equal(milestone.name, 'Phase 1');
        assert.equal(milestone.target_date, '31/12/2026');
        assert.equal(milestone.status, 'planned');
        assert.equal(milestone.progress, '0');

        const entries = await logs.findAll();
        assert.equal(entries.length, 1);
        assert.equal(entries[0].action_type, 'milestone.create');
        assert.equal(entries[0].target_id, milestone.id);
    });

    it('lists milestones with optional status filter', async () => {
        const { service } = createTestService();
        const actor: Actor = { id: 'u1', name: 'Mohamed' };

        const m1 = await service.createMilestone({ name: 'M1', description: 'Desc 1', target_date: '01/01/2026' }, actor);
        const m2 = await service.createMilestone({ name: 'M2', description: 'Desc 2', target_date: '02/01/2026' }, actor);

        await service.updateStatus(m2.id, 'completed', actor);

        const all = await service.listMilestones();
        assert.equal(all.length, 2);

        const completed = await service.listMilestones('completed');
        assert.equal(completed.length, 1);
        assert.equal(completed[0].name, 'M2');
    });

    it('updates milestone progress and auto-updates status', async () => {
        const { service, logs } = createTestService();
        const actor: Actor = { id: 'u1', name: 'Mohamed' };

        const m = await service.createMilestone({ name: 'M1', description: 'D1', target_date: '01/01/2026' }, actor);
        
        // Progress > 0 && < 100 sets status to 'active'
        await service.updateProgress(m.id, 50, actor);
        let updated = await service.getMilestone(m.id);
        assert.equal(updated?.progress, '50');
        assert.equal(updated?.status, 'active');

        // Progress == 100 sets status to 'completed'
        await service.updateProgress(m.id, 100, actor);
        updated = await service.getMilestone(m.id);
        assert.equal(updated?.progress, '100');
        assert.equal(updated?.status, 'completed');

        const entries = await logs.findAll();
        assert.equal(entries.length, 3);
        assert.equal(entries[1].action_type, 'milestone.progress');
        assert.equal(entries[1].after, '50');
        assert.equal(entries[2].action_type, 'milestone.progress');
        assert.equal(entries[2].after, '100');
    });

    it('updates milestone status directly', async () => {
        const { service, logs } = createTestService();
        const actor: Actor = { id: 'u1', name: 'Mohamed' };

        const m = await service.createMilestone({ name: 'M1', description: 'D1', target_date: '01/01/2026' }, actor);
        await service.updateStatus(m.id, 'archived', actor);

        const updated = await service.getMilestone(m.id);
        assert.equal(updated?.status, 'archived');

        const entries = await logs.findAll();
        assert.equal(entries.length, 2);
        assert.equal(entries[1].action_type, 'milestone.status');
        assert.equal(entries[1].after, 'archived');
    });
});

function createTestService() {
    let idCounter = 0;
    const milestones = new MilestonesRepo(new MemoryTable<Milestone>());
    const logs = new LogsRepo(new MemoryTable<LogEntry>());
    const service = new MilestoneService(
        { milestones, logs },
        {
            newId: () => `id-${++idCounter}`,
            now: () => '2026-08-01T00:00:00.000Z',
        },
    );

    return { service, milestones, logs };
}
