import type { LogEntry } from '../types';
import type { TableStore } from './sheet-table';

export class LogsRepo {
    constructor(private readonly table: TableStore<LogEntry>) {}

    append(entry: LogEntry): Promise<LogEntry> {
        return this.table.append(entry);
    }

    findAll(): Promise<LogEntry[]> {
        return this.table.findAll();
    }
}
