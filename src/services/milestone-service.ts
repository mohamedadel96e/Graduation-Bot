import { randomUUID } from 'node:crypto';
import type { MilestonesRepo } from '../sheets/milestones.repo';
import type { LogsRepo } from '../sheets/logs.repo';
import type { Actor, Milestone, MilestoneStatus } from '../types';

export interface MilestoneServiceDeps {
    milestones: MilestonesRepo;
    logs: LogsRepo;
}

export interface MilestoneConfig {
    newId?: () => string;
    now?: () => string;
}

export class MilestoneService {
    private newId: () => string;
    private now: () => string;

    constructor(
        private deps: MilestoneServiceDeps,
        config: MilestoneConfig = {},
    ) {
        this.newId = config.newId ?? (() => randomUUID());
        this.now = config.now ?? (() => new Date().toISOString());
    }

    async createMilestone(
        params: { name: string; description: string; target_date: string },
        actor: Actor,
    ): Promise<Milestone> {
        const milestone: Milestone = {
            id: this.newId(),
            name: params.name,
            description: params.description,
            target_date: params.target_date,
            status: 'planned',
            progress: '0',
            created_at: this.now(),
        };

        const created = await this.deps.milestones.create(milestone);

        await this.deps.logs.append({
            id: this.newId(),
            timestamp: this.now(),
            actor_id: actor.id,
            actor_name: actor.name,
            action_type: 'milestone.create',
            target_id: milestone.id,
            before: '',
            after: JSON.stringify({
                name: milestone.name,
                target_date: milestone.target_date,
            }),
            detail: 'Milestone created',
        });

        return created;
    }

    async listMilestones(status?: MilestoneStatus): Promise<Milestone[]> {
        return this.deps.milestones.findAll(status);
    }

    async getMilestone(id: string): Promise<Milestone | null> {
        return this.deps.milestones.findById(id);
    }

    async updateProgress(id: string, progress: number, actor: Actor): Promise<Milestone> {
        const existing = await this.deps.milestones.findById(id);
        if (!existing) {
            throw new Error(`Milestone with id ${id} not found.`);
        }

        const clamp = Math.max(0, Math.min(100, progress));
        const progressStr = clamp.toString();

        // Auto-update status if it completes
        let newStatus = existing.status;
        if (clamp === 100 && existing.status !== 'archived') {
            newStatus = 'completed';
        } else if (clamp > 0 && clamp < 100 && existing.status === 'planned') {
            newStatus = 'active';
        }

        const updated = await this.deps.milestones.updateById(id, {
            progress: progressStr,
            status: newStatus,
        });

        if (!updated) {
            throw new Error(`Failed to update milestone ${id}`);
        }

        await this.deps.logs.append({
            id: this.newId(),
            timestamp: this.now(),
            actor_id: actor.id,
            actor_name: actor.name,
            action_type: 'milestone.progress',
            target_id: id,
            before: existing.progress,
            after: progressStr,
            detail: `Progress updated to ${progressStr}%`,
        });

        return updated;
    }

    async updateStatus(id: string, status: MilestoneStatus, actor: Actor): Promise<Milestone> {
        const existing = await this.deps.milestones.findById(id);
        if (!existing) {
            throw new Error(`Milestone with id ${id} not found.`);
        }

        const updated = await this.deps.milestones.updateById(id, {
            status,
        });

        if (!updated) {
            throw new Error(`Failed to update milestone ${id}`);
        }

        await this.deps.logs.append({
            id: this.newId(),
            timestamp: this.now(),
            actor_id: actor.id,
            actor_name: actor.name,
            action_type: 'milestone.status',
            target_id: id,
            before: existing.status,
            after: status,
            detail: `Status changed to ${status}`,
        });

        return updated;
    }
}
