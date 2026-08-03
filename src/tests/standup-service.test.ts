import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { StandupService } from '../services/standup-service';
import { StandupsRepo } from '../sheets/standups.repo';
import { LogsRepo } from '../sheets/logs.repo';
import { MemoryTable } from '../sheets/memory-table';
import type { Actor, Standup, LogEntry } from '../types';

describe('StandupService', () => {
    it('creates a new standup and logs it', async () => {
        const { service, logs } = createTestService('2026-08-01T12:00:00.000Z');
        const actor: Actor = { id: 'u1', name: 'Mohamed' };

        const standup = await service.submitStandup(
            {
                what_done: 'Finished the backend',
                what_next: 'Working on frontend',
                blockers: 'None',
            },
            actor,
        );

        assert.equal(standup.id, 'id-1');
        assert.equal(standup.user_id, 'u1');
        assert.equal(standup.date, '2026-08-01');
        assert.equal(standup.what_done, 'Finished the backend');

        const entries = await logs.findAll();
        assert.equal(entries.length, 1);
        assert.equal(entries[0].action_type, 'standup.create');
        assert.equal(entries[0].target_id, standup.id);
    });

    it('overwrites an existing standup on the same day and logs an update', async () => {
        const { service, logs } = createTestService('2026-08-01T12:00:00.000Z');
        const actor: Actor = { id: 'u1', name: 'Mohamed' };

        await service.submitStandup(
            { what_done: 'D1', what_next: 'N1', blockers: 'B1' },
            actor,
        );

        const updated = await service.submitStandup(
            { what_done: 'D2', what_next: 'N2', blockers: 'B2' },
            actor,
        );

        // ID should remain the same
        assert.equal(updated.id, 'id-1');
        assert.equal(updated.what_done, 'D2');

        const all = await service.getStandupsByDate('2026-08-01');
        assert.equal(all.length, 1);

        const entries = await logs.findAll();
        assert.equal(entries.length, 2);
        assert.equal(entries[0].action_type, 'standup.create');
        assert.equal(entries[1].action_type, 'standup.update');
    });

    it('creates a new standup if the day changes', async () => {
        let currentTime = '2026-08-01T12:00:00.000Z';
        let idCounter = 0;
        const standups = new StandupsRepo(new MemoryTable<Standup>());
        const logs = new LogsRepo(new MemoryTable<LogEntry>());
        const service = new StandupService(
            { standups, logs },
            {
                newId: () => `id-${++idCounter}`,
                now: () => currentTime,
            },
        );

        const actor: Actor = { id: 'u1', name: 'Mohamed' };

        await service.submitStandup(
            { what_done: 'Day 1 Done', what_next: 'Day 1 Next', blockers: 'None' },
            actor,
        );

        // Shift time to next day
        currentTime = '2026-08-02T12:00:00.000Z';

        const day2Standup = await service.submitStandup(
            { what_done: 'Day 2 Done', what_next: 'Day 2 Next', blockers: 'None' },
            actor,
        );

        assert.equal(day2Standup.id, 'id-3'); // id-2 was log entry
        assert.equal(day2Standup.date, '2026-08-02');

        const d1 = await service.getStandupsByDate('2026-08-01');
        assert.equal(d1.length, 1);
        
        const d2 = await service.getStandupsByDate('2026-08-02');
        assert.equal(d2.length, 1);
    });
});

function createTestService(nowTime = '2026-08-01T00:00:00.000Z') {
    let idCounter = 0;
    const standups = new StandupsRepo(new MemoryTable<Standup>());
    const logs = new LogsRepo(new MemoryTable<LogEntry>());
    const service = new StandupService(
        { standups, logs },
        {
            newId: () => `id-${++idCounter}`,
            now: () => nowTime,
        },
    );

    return { service, standups, logs };
}
