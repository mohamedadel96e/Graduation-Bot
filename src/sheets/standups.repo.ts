import type { Standup } from '../types';
import type { TableStore } from './sheet-table';

export class StandupsRepo {
    constructor(private readonly table: TableStore<Standup>) {}

    create(standup: Standup): Promise<Standup> {
        return this.table.append(standup);
    }

    async findAll(): Promise<Standup[]> {
        return this.table.findAll();
    }

    async findByUserAndDate(userId: string, date: string): Promise<Standup | null> {
        const standups = await this.table.findAll();
        return standups.find((s) => s.user_id === userId && s.date === date) || null;
    }

    updateById(id: string, patch: Partial<Standup>): Promise<Standup | null> {
        return this.table.updateById(id, patch);
    }
}
