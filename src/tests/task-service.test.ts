import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { TaskService } from '../services/task-service';
import { TasksRepo } from '../sheets/tasks.repo';
import { LogsRepo } from '../sheets/logs.repo';
import { MemoryTable } from '../sheets/memory-table';
import type { Actor, Task, LogEntry } from '../types';

describe('TaskService', () => {
    it('creates a task and records an audit log', async () => {
        const { service, logs } = createTestService();
        const actor: Actor = { id: 'u1', name: 'Mohamed' };

        const task = await service.createTask(
            {
                title: 'Write tests',
                description: 'Test the task service',
                priority: 'High',
            },
            actor,
        );

        assert.equal(task.id, 'id-1');
        assert.equal(task.title, 'Write tests');
        assert.equal(task.priority, 'High');
        assert.equal(task.status, 'todo');
        assert.equal(task.assignee, 'Unassigned');

        const entries = await logs.findAll();
        assert.equal(entries.length, 1);
        assert.equal(entries[0].action_type, 'task.create');
        assert.equal(entries[0].target_id, task.id);
    });

    it('lists tasks with optional status filter', async () => {
        const { service } = createTestService();
        const actor: Actor = { id: 'u1', name: 'Mohamed' };

        const task1 = await service.createTask({ title: 'Task 1', description: 'Desc 1', priority: 'Medium' }, actor);
        const task2 = await service.createTask({ title: 'Task 2', description: 'Desc 2', priority: 'Low' }, actor);

        await service.updateTaskStatus(task2.id, 'done', actor);

        const allTasks = await service.listTasks();
        assert.equal(allTasks.length, 2);

        const doneTasks = await service.listTasks('done');
        assert.equal(doneTasks.length, 1);
        assert.equal(doneTasks[0].title, 'Task 2');
    });

    it('updates task status and logs it', async () => {
        const { service, logs } = createTestService();
        const actor: Actor = { id: 'u1', name: 'Mohamed' };

        const task = await service.createTask({ title: 'T1', description: 'D1', priority: 'High' }, actor);
        await service.updateTaskStatus(task.id, 'in-progress', actor);

        const updated = await service.getTask(task.id);
        assert.equal(updated?.status, 'in-progress');

        const entries = await logs.findAll();
        assert.equal(entries.length, 2);
        assert.equal(entries[1].action_type, 'task.status_update');
        assert.equal(entries[1].before, 'todo');
        assert.equal(entries[1].after, 'in-progress');
    });

    it('assigns a task to a user and logs it', async () => {
        const { service, logs } = createTestService();
        const actor: Actor = { id: 'u1', name: 'Mohamed' };

        const task = await service.createTask({ title: 'T1', description: 'D1', priority: 'High' }, actor);
        await service.assignTask(task.id, '<@123> (Ahmed)', actor);

        const updated = await service.getTask(task.id);
        assert.equal(updated?.assignee, '<@123> (Ahmed)');

        const entries = await logs.findAll();
        assert.equal(entries.length, 2);
        assert.equal(entries[1].action_type, 'task.assign');
        assert.equal(entries[1].after, '<@123> (Ahmed)');
    });

    it('deletes a task and logs it', async () => {
        const { service, tasks, logs } = createTestService();
        const actor: Actor = { id: 'u1', name: 'Mohamed' };

        const task = await service.createTask({ title: 'T1', description: 'D1', priority: 'High' }, actor);
        const deleted = await service.deleteTask(task.id, actor);

        assert.equal(deleted, true);
        const found = await tasks.findById(task.id);
        assert.equal(found, null);

        const entries = await logs.findAll();
        assert.equal(entries.length, 2);
        assert.equal(entries[1].action_type, 'task.delete');
    });
});

function createTestService() {
    let idCounter = 0;
    const tasks = new TasksRepo(new MemoryTable<Task>());
    const logs = new LogsRepo(new MemoryTable<LogEntry>());
    const service = new TaskService(
        { tasks, logs },
        {
            newId: () => `id-${++idCounter}`,
            now: () => '2026-08-01T00:00:00.000Z',
        },
    );

    return { service, tasks, logs };
}
