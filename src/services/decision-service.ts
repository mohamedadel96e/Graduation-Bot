import { randomUUID } from 'node:crypto';
import type { Actor, Decision, Idea, LogEntry } from '../types';
import type { DecisionRepo } from '../sheets/decision.repo';
import type { IdeasRepo } from '../sheets/ideas.repo';
import type { LogsRepo } from '../sheets/logs.repo';
import { UserFacingError } from './idea-service';

interface IdAndClock {
    newId(): string;
    now(): string;
}

export interface DecisionServiceRepos {
    decision: DecisionRepo;
    ideas: IdeasRepo;
    logs: LogsRepo;
}

export class DecisionService {
    public onLog?: (entry: LogEntry) => void;

    constructor(
        private readonly repos: DecisionServiceRepos,
        private readonly ids: IdAndClock = defaultIdAndClock,
    ) {}

    async finalize(ideaId: string, actor: Actor): Promise<{ decision: Decision; idea: Idea }> {
        const idea = await this.repos.ideas.findById(ideaId.trim());

        if (!idea) {
            throw new UserFacingError(`Idea ${ideaId} was not found.`);
        }

        if (idea.status !== 'Active') {
            throw new UserFacingError(`Idea ${ideaId} is ${idea.status.toLowerCase()} and cannot be finalized.`);
        }

        // Check if a decision already exists for this idea
        const existing = await this.repos.decision.findLatest();
        if (existing && existing.idea_id === ideaId) {
            throw new UserFacingError(`Idea ${ideaId} has already been finalized.`);
        }

        const now = this.ids.now();

        const decision: Decision = {
            id: this.ids.newId(),
            idea_id: idea.id,
            reasoning: '',
            decided_by: actor.id,
            decided_by_name: actor.name,
            decided_at: now,
        };

        await this.repos.decision.create(decision);

        const updatedIdea = await this.repos.ideas.updateById(idea.id, {
            status: 'Finalized',
            updated_at: now,
        });

        if (!updatedIdea) {
            throw new UserFacingError(`Failed to update idea ${ideaId} status.`);
        }

        await this.log(actor, 'decision.finalize', idea.id, idea, updatedIdea, `Finalized idea "${idea.title}".`);

        return { decision, idea: updatedIdea };
    }

    async addReasoning(reasoning: string, actor: Actor): Promise<Decision> {
        const latest = await this.repos.decision.findLatest();

        if (!latest) {
            throw new UserFacingError('No decision exists yet. Finalize an idea first.');
        }

        const updated = await this.repos.decision.updateReasoning(latest.idea_id, reasoning);

        if (!updated) {
            throw new UserFacingError('Failed to update decision reasoning.');
        }

        await this.log(actor, 'decision.reasoning', latest.idea_id, latest, updated, `Updated reasoning for decision on idea "${latest.idea_id}".`);

        return updated;
    }

    async getStatus(): Promise<{ decision: Decision; idea: Idea } | null> {
        const decision = await this.repos.decision.findLatest();

        if (!decision) {
            return null;
        }

        const idea = await this.repos.ideas.findById(decision.idea_id);

        if (!idea) {
            return null;
        }

        return { decision, idea };
    }

    private async log(
        actor: Actor,
        actionType: string,
        targetId: string,
        before: unknown,
        after: unknown,
        detail: string,
    ): Promise<LogEntry> {
        const entry: LogEntry = {
            id: this.ids.newId(),
            timestamp: this.ids.now(),
            actor_id: actor.id,
            actor_name: actor.name,
            action_type: actionType,
            target_id: targetId,
            before: serializeLogValue(before),
            after: serializeLogValue(after),
            detail,
        };

        const saved = await this.repos.logs.append(entry);

        if (this.onLog) {
            try {
                this.onLog(saved);
            } catch {
                // swallow callback errors — don't break the command flow
            }
        }

        return saved;
    }
}

const defaultIdAndClock: IdAndClock = {
    newId: () => randomUUID().slice(0, 8),
    now: () => new Date().toISOString(),
};

function serializeLogValue(value: unknown): string {
    if (value === null || value === undefined || value === '') {
        return '';
    }

    if (typeof value === 'string') {
        return value;
    }

    return JSON.stringify(value);
}
