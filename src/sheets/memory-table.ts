import type { SheetRow } from '../types';
import type { TableStore } from './sheet-table';

export class MemoryTable<T extends SheetRow> implements TableStore<T> {
    private readonly rows: T[];

    constructor(seed: T[] = []) {
        this.rows = seed.map((row) => ({ ...row }));
    }

    async findAll(): Promise<T[]> {
        return this.rows.map((row) => ({ ...row }));
    }

    async findById(id: string): Promise<T | null> {
        const row = this.rows.find((item) => item.id === id);
        return row ? { ...row } : null;
    }

    async append(row: T): Promise<T> {
        this.rows.push({ ...row });
        return { ...row };
    }

    async updateById(id: string, patch: Partial<T>): Promise<T | null> {
        const index = this.rows.findIndex((row) => row.id === id);

        if (index === -1) {
            return null;
        }

        this.rows[index] = { ...this.rows[index], ...patch };
        return { ...this.rows[index] };
    }
}
