import type { Task, TaskStatus } from '../types';
import type { TableStore } from './sheet-table';

export class TasksRepo {
    constructor(private readonly table: TableStore<Task>) {}

    create(task: Task): Promise<Task> {
        return this.table.append(task);
    }

    async findAll(status?: TaskStatus): Promise<Task[]> {
        const tasks = await this.table.findAll();
        return status ? tasks.filter((task) => task.status === status) : tasks;
    }

    findById(id: string): Promise<Task | null> {
        return this.table.findById(id);
    }

    updateById(id: string, patch: Partial<Task>): Promise<Task | null> {
        return this.table.updateById(id, patch);
    }

    deleteById(id: string): Promise<boolean> {
        return this.table.deleteById(id);
    }
}
