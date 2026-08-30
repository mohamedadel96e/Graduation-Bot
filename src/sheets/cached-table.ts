import type { SheetRow } from '../types';
import type { TableStore } from './sheet-table';

export class CachedTable<T extends SheetRow> implements TableStore<T> {
    private cache: T[] | null = null;
    private lastFetchTime = 0;
    private readonly ttlMs: number;
    private syncTimer: NodeJS.Timeout | null = null;

    // Metrics
    public cacheHits = 0;
    public cacheMisses = 0;
    public apiCalls = 0;

    constructor(
        private readonly underlying: TableStore<T>,
        ttlSeconds = 60
    ) {
        this.ttlMs = ttlSeconds * 1000;
        this.startBackgroundSync();
    }

    private startBackgroundSync() {
        if (this.syncTimer) {
            clearInterval(this.syncTimer);
        }
        this.syncTimer = setInterval(async () => {
            try {
                this.apiCalls++;
                this.cache = await this.underlying.findAll();
                this.lastFetchTime = Date.now();
            } catch (error) {
                console.error(`[CachedTable] Background sync failed:`, error);
            }
        }, this.ttlMs);
    }

    public stopBackgroundSync() {
        if (this.syncTimer) {
            clearInterval(this.syncTimer);
            this.syncTimer = null;
        }
    }

    public async invalidate(): Promise<void> {
        this.cache = null;
        this.lastFetchTime = 0;
        await this.ensureCache();
    }

    private async ensureCache(): Promise<T[]> {
        const now = Date.now();
        if (this.cache && (now - this.lastFetchTime < this.ttlMs)) {
            this.cacheHits++;
            return this.cache;
        }

        this.cacheMisses++;
        this.apiCalls++;
        this.cache = await this.underlying.findAll();
        this.lastFetchTime = now;
        return this.cache;
    }

    async findAll(): Promise<T[]> {
        return this.ensureCache();
    }

    async findById(id: string): Promise<T | null> {
        const rows = await this.ensureCache();
        return rows.find((row) => row.id === id) ?? null;
    }

    async append(row: T): Promise<T> {
        this.apiCalls++;
        const result = await this.underlying.append(row);
        
        // Write-through cache
        if (this.cache) {
            this.cache.push(result);
        }
        
        return result;
    }

    async updateById(id: string, patch: Partial<T>): Promise<T | null> {
        this.apiCalls++;
        const result = await this.underlying.updateById(id, patch);
        
        // Write-through cache
        if (result && this.cache) {
            const index = this.cache.findIndex(r => r.id === id);
            if (index !== -1) {
                this.cache[index] = result;
            } else {
                // Somehow it wasn't in cache, let's just invalidate to be safe
                this.cache = null;
            }
        }
        
        return result;
    }

    async deleteById(id: string): Promise<boolean> {
        this.apiCalls++;
        const success = await this.underlying.deleteById(id);
        
        // Write-through cache
        if (success && this.cache) {
            this.cache = this.cache.filter(r => r.id !== id);
        }
        
        return success;
    }
}
