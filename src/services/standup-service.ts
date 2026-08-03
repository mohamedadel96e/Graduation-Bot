import { randomUUID } from 'node:crypto';
import type { StandupsRepo } from '../sheets/standups.repo';
import type { LogsRepo } from '../sheets/logs.repo';
import type { Actor, Standup } from '../types';

export interface StandupServiceDeps {
    standups: StandupsRepo;
    logs: LogsRepo;
}

export interface StandupConfig {
    newId?: () => string;
    now?: () => string;
}

export class StandupService {
    private newId: () => string;
    private now: () => string;

    constructor(
        private deps: StandupServiceDeps,
        config: StandupConfig = {},
    ) {
        this.newId = config.newId ?? (() => randomUUID());
        this.now = config.now ?? (() => new Date().toISOString());
    }

    /**
     * Returns the current date in YYYY-MM-DD format
     */
    private getTodayDateString(): string {
        const d = new Date(this.now());
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    async submitStandup(
        params: { what_done: string; what_next: string; blockers: string },
        actor: Actor,
    ): Promise<Standup> {
        const dateStr = this.getTodayDateString();

        const existing = await this.deps.standups.findByUserAndDate(actor.id, dateStr);

        let standup: Standup;

        if (existing) {
            // Overwrite existing
            const updated = await this.deps.standups.updateById(existing.id, {
                what_done: params.what_done,
                what_next: params.what_next,
                blockers: params.blockers,
            });
            if (!updated) {
                throw new Error('Failed to update existing standup');
            }
            standup = updated;
        } else {
            // Create new
            const newStandup: Standup = {
                id: this.newId(),
                user_id: actor.id,
                date: dateStr,
                what_done: params.what_done,
                what_next: params.what_next,
                blockers: params.blockers,
                created_at: this.now(),
            };
            standup = await this.deps.standups.create(newStandup);
        }

        await this.deps.logs.append({
            id: this.newId(),
            timestamp: this.now(),
            actor_id: actor.id,
            actor_name: actor.name,
            action_type: existing ? 'standup.update' : 'standup.create',
            target_id: standup.id,
            before: '',
            after: JSON.stringify({
                what_done: standup.what_done,
                what_next: standup.what_next,
                blockers: standup.blockers,
            }),
            detail: `Standup submitted for ${dateStr}`,
        });

        return standup;
    }

    async getStandupsByDate(dateStr: string): Promise<Standup[]> {
        const all = await this.deps.standups.findAll();
        return all.filter((s) => s.date === dateStr);
    }
}
