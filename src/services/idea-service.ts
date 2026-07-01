import { randomUUID } from 'node:crypto';
import type {
    Actor,
    CommentEntry,
    Grade,
    Idea,
    IdeaDifficulty,
    IdeaStatus,
    IdeaWithGrades,
    LogEntry,
    ProjectCategory,
} from '../types';
import { IdeasRepo } from '../sheets/ideas.repo';
import { LogsRepo } from '../sheets/logs.repo';
import { GradesRepo } from '../sheets/grades.repo';

interface IdAndClock {
    newId(): string;
    now(): string;
}

export interface IdeaServiceRepos {
    ideas: IdeasRepo;
    grades: GradesRepo;
    logs: LogsRepo;
}

export interface CreateIdeaInput {
    title: string;
    description: string;
    techStack: string;
    difficulty: IdeaDifficulty;
    category: ProjectCategory;
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
            category: input.category,
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

    async listIdeas(status: IdeaStatus = 'Active'): Promise<IdeaWithGrades[]> {
        const ideas = await this.repos.ideas.findAll(status);
        return Promise.all(
            ideas.map(async (idea) => ({
                idea,
                grades: await this.repos.grades.summarizeForIdea(idea.id),
                comments: await this.getCommentsForIdea(idea.id),
            })),
        );
    }

    async getIdea(id: string): Promise<IdeaWithGrades> {
        const idea = await this.requireIdea(id);
        return {
            idea,
            grades: await this.repos.grades.summarizeForIdea(idea.id),
            comments: await this.getCommentsForIdea(idea.id),
        };
    }

    async gradeIdea(
        id: string,
        values: { learning: number; impact: number; feasibility: number; innovation: number },
        actor: Actor,
    ): Promise<IdeaWithGrades> {
        const idea = await this.requireIdea(id);

        if (idea.status !== 'Active') {
            throw new UserFacingError(`Idea ${id} is ${idea.status.toLowerCase()} and cannot be graded.`);
        }

        const grade: Grade = {
            id: this.ids.newId(),
            idea_id: idea.id,
            user_id: actor.id,
            user_name: actor.name,
            learning: String(values.learning),
            impact: String(values.impact),
            feasibility: String(values.feasibility),
            innovation: String(values.innovation),
            created_at: this.ids.now(),
        };

        const result = await this.repos.grades.upsert(grade);

        await this.log(
            actor,
            'idea.grade',
            idea.id,
            result.before ?? '',
            result.after,
            `${actor.name} graded "${idea.title}" — L:${values.learning} I:${values.impact} F:${values.feasibility} N:${values.innovation}.`,
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

    async getCommentsForIdea(ideaId: string): Promise<CommentEntry[]> {
        const allLogs = await this.repos.logs.findAll();
        return allLogs
            .filter((entry) => entry.action_type === 'idea.comment' && entry.target_id === ideaId)
            .map((entry) => ({
                actor_name: entry.actor_name,
                text: entry.detail,
                timestamp: entry.timestamp,
            }));
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
