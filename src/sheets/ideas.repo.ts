import type { Idea, IdeaStatus } from '../types';
import type { TableStore } from './sheet-table';

export class IdeasRepo {
    constructor(private readonly table: TableStore<Idea>) {}

    create(idea: Idea): Promise<Idea> {
        return this.table.append(idea);
    }

    async findAll(status?: IdeaStatus): Promise<Idea[]> {
        const ideas = await this.table.findAll();
        return status ? ideas.filter((idea) => idea.status === status) : ideas;
    }

    findById(id: string): Promise<Idea | null> {
        return this.table.findById(id);
    }

    updateById(id: string, patch: Partial<Idea>): Promise<Idea | null> {
        return this.table.updateById(id, patch);
    }
}
