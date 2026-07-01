import { randomUUID } from 'node:crypto';
import type {
    Actor,
    Idea,
    IdeaDifficulty,
    IdeaStatus,
    IdeaWithTally,
    LogEntry,
    Vote,
    VoteValue,
} from '../types';
import { IdeasRepo } from '../sheets/ideas.repo';
import { LogsRepo } from '../sheets/logs.repo';
import { VotesRepo } from '../sheets/votes.repo';

interface IdAndClock {
    newId(): string;
    now(): string;
}

export interface IdeaServiceRepos {
    ideas: IdeasRepo;
    votes: VotesRepo;
    logs: LogsRepo;
}

export interface CreateIdeaInput {
    title: string;
    description: string;
    techStack: string;
    difficulty: IdeaDifficulty;
}

export class UserFacingError extends Error {}

export class IdeaService {
    public onLog?: (entry: LogEntry) => void;

    constructor(
        private readonly repos: IdeaServiceRepos,
        private readonly ids: IdAndClock = defaultIdAndClock,
    ) {}

    async createIdea(input: CreateIdeaInput, actor: Actor): Promise<Idea> {
        const title = requireText(input.title, 'Idea title');
        const description = requireText(input.description, 'Idea description');
        const now = this.ids.now();
        const idea: Idea = {
            id: this.ids.newId(),
            title,
            description,
            tech_stack: input.techStack.trim(),
            difficulty: input.difficulty,
            submitted_by: actor.id,
            submitted_by_name: actor.name,
            status: 'Active',
            thread_id: '',
            created_at: now,
            updated_at: now,
        };

        await this.repos.ideas.create(idea);
        await this.log(actor, 'idea.create', idea.id, '', idea, `Created idea "${idea.title}".`);

        return idea;
    }

    async listIdeas(status: IdeaStatus = 'Active'): Promise<IdeaWithTally[]> {
        const ideas = await this.repos.ideas.findAll(status);
        return Promise.all(
            ideas.map(async (idea) => ({
                idea,
                tally: await this.repos.votes.tallyForIdea(idea.id),
            })),
        );
    }

    async getIdea(id: string): Promise<IdeaWithTally> {
        const idea = await this.requireIdea(id);
        return {
            idea,
            tally: await this.repos.votes.tallyForIdea(idea.id),
        };
    }

    async voteIdea(id: string, voteValue: VoteValue, actor: Actor): Promise<IdeaWithTally> {
        const idea = await this.requireIdea(id);

        if (idea.status !== 'Active') {
            throw new UserFacingError(`Idea ${id} is ${idea.status.toLowerCase()} and cannot be voted on.`);
        }

        const vote: Vote = {
            id: this.ids.newId(),
            idea_id: idea.id,
            user_id: actor.id,
            vote: voteValue,
            created_at: this.ids.now(),
        };
        const result = await this.repos.votes.upsert(vote);

        await this.log(
            actor,
            'idea.vote',
            idea.id,
            result.before ?? '',
            result.after,
            `${actor.name} voted ${voteValue} on "${idea.title}".`,
        );

        return this.getIdea(idea.id);
    }

    async archiveIdea(id: string, actor: Actor): Promise<Idea> {
        const before = await this.requireIdea(id);
        const after = await this.repos.ideas.updateById(id, {
            status: 'Archived',
            updated_at: this.ids.now(),
        });

        if (!after) {
            throw new UserFacingError(`Idea ${id} was not found.`);
        }

        await this.log(actor, 'idea.archive', id, before, after, `Archived idea "${after.title}".`);
        return after;
    }

    async commentOnIdea(id: string, text: string, actor: Actor): Promise<Idea> {
        const idea = await this.requireIdea(id);
        await this.log(actor, 'idea.comment', idea.id, '', '', text);
        return idea;
    }

    async updateIdeaThread(ideaId: string, threadId: string): Promise<void> {
        await this.repos.ideas.updateById(ideaId, { thread_id: threadId });
    }

    private async requireIdea(id: string): Promise<Idea> {
        const idea = await this.repos.ideas.findById(id.trim());

        if (!idea) {
            throw new UserFacingError(`Idea ${id} was not found.`);
        }

        return idea;
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

        // Fire callback for external consumers (e.g. Discord channel logger)
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

function requireText(value: string, label: string): string {
    const trimmed = value.trim();

    if (!trimmed) {
        throw new UserFacingError(`${label} is required.`);
    }

    return trimmed;
}

function serializeLogValue(value: unknown): string {
    if (value === null || value === undefined || value === '') {
        return '';
    }

    if (typeof value === 'string') {
        return value;
    }

    return JSON.stringify(value);
}
