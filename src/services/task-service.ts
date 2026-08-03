import { randomUUID } from 'node:crypto';
import type { TasksRepo } from '../sheets/tasks.repo';
import type { LogsRepo } from '../sheets/logs.repo';
import type { Actor, Task, TaskPriority, TaskStatus } from '../types';

export interface TaskServiceDeps {
    tasks: TasksRepo;
    logs: LogsRepo;
}

export interface TaskConfig {
    newId?: () => string;
    now?: () => string;
}

export class TaskService {
    private newId: () => string;
    private now: () => string;

    constructor(
        private deps: TaskServiceDeps,
        config: TaskConfig = {},
    ) {
        this.newId = config.newId ?? (() => randomUUID());
        this.now = config.now ?? (() => new Date().toISOString());
    }

    async createTask(
        params: { title: string; description: string; priority: TaskPriority },
        actor: Actor,
    ): Promise<Task> {
        const task: Task = {
            id: this.newId(),
            title: params.title,
            description: params.description,
            priority: params.priority,
            assignee: 'Unassigned',
            status: 'todo',
            created_at: this.now(),
            updated_at: this.now(),
        };

        const created = await this.deps.tasks.create(task);

        await this.deps.logs.append({
            id: this.newId(),
            timestamp: this.now(),
            actor_id: actor.id,
            actor_name: actor.name,
            action_type: 'task.create',
            target_id: task.id,
            before: '',
            after: JSON.stringify({
                title: task.title,
                priority: task.priority,
            }),
            detail: 'Task created',
        });

        return created;
    }

    async listTasks(status?: TaskStatus): Promise<Task[]> {
        return this.deps.tasks.findAll(status);
    }

    async getTask(id: string): Promise<Task | null> {
        return this.deps.tasks.findById(id);
    }

    async updateTaskStatus(id: string, status: TaskStatus, actor: Actor): Promise<Task> {
        const existing = await this.deps.tasks.findById(id);
        if (!existing) {
            throw new Error(`Task with id ${id} not found.`);
        }

        const updated = await this.deps.tasks.updateById(id, {
            status,
            updated_at: this.now(),
        });

        if (!updated) {
            throw new Error(`Failed to update task ${id}`);
        }

        await this.deps.logs.append({
            id: this.newId(),
            timestamp: this.now(),
            actor_id: actor.id,
            actor_name: actor.name,
            action_type: 'task.status_update',
            target_id: id,
            before: existing.status,
            after: status,
            detail: `Status changed to ${status}`,
        });

        return updated;
    }

    async assignTask(id: string, assignee: string, actor: Actor): Promise<Task> {
        const existing = await this.deps.tasks.findById(id);
        if (!existing) {
            throw new Error(`Task with id ${id} not found.`);
        }

        const updated = await this.deps.tasks.updateById(id, {
            assignee,
            updated_at: this.now(),
        });

        if (!updated) {
            throw new Error(`Failed to assign task ${id}`);
        }

        await this.deps.logs.append({
            id: this.newId(),
            timestamp: this.now(),
            actor_id: actor.id,
            actor_name: actor.name,
            action_type: 'task.assign',
            target_id: id,
            before: existing.assignee,
            after: assignee,
            detail: `Assigned to ${assignee}`,
        });

        return updated;
    }

    async deleteTask(id: string, actor: Actor): Promise<boolean> {
        const existing = await this.deps.tasks.findById(id);
        if (!existing) {
            return false;
        }

        const deleted = await this.deps.tasks.deleteById(id);

        if (deleted) {
            await this.deps.logs.append({
                id: this.newId(),
                timestamp: this.now(),
                actor_id: actor.id,
                actor_name: actor.name,
                action_type: 'task.delete',
                target_id: id,
                before: JSON.stringify({ title: existing.title }),
                after: '',
                detail: 'Task deleted',
            });
        }

        return deleted;
    }
}
