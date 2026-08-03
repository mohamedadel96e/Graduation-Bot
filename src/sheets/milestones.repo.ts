import type { Milestone, MilestoneStatus } from '../types';
import type { TableStore } from './sheet-table';

export class MilestonesRepo {
    constructor(private readonly table: TableStore<Milestone>) {}

    create(milestone: Milestone): Promise<Milestone> {
        return this.table.append(milestone);
    }

    async findAll(status?: MilestoneStatus): Promise<Milestone[]> {
        const milestones = await this.table.findAll();
        return status ? milestones.filter((m) => m.status === status) : milestones;
    }

    findById(id: string): Promise<Milestone | null> {
        return this.table.findById(id);
    }

    updateById(id: string, patch: Partial<Milestone>): Promise<Milestone | null> {
        return this.table.updateById(id, patch);
    }
}
