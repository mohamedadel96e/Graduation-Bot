import type { Decision } from '../types';
import type { TableStore } from './sheet-table';

export class DecisionRepo {
    constructor(private readonly table: TableStore<Decision>) {}

    create(decision: Decision): Promise<Decision> {
        return this.table.append(decision);
    }

    async findLatest(): Promise<Decision | null> {
        const all = await this.table.findAll();
        return all.length > 0 ? all[all.length - 1] : null;
    }

    async updateReasoning(ideaId: string, reasoning: string): Promise<Decision | null> {
        const all = await this.table.findAll();
        const decision = all.find((d) => d.idea_id === ideaId);

        if (!decision) {
            return null;
        }

        return this.table.updateById(decision.id, { reasoning });
    }
}
