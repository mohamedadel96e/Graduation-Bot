export type SheetRow = Record<string, string>;

export const IDEA_COLUMNS = [
    'id',
    'title',
    'description',
    'tech_stack',
    'difficulty',
    'submitted_by',
    'submitted_by_name',
    'status',
    'thread_id',
    'created_at',
    'updated_at',
] as const;

export const VOTE_COLUMNS = [
    'id',
    'idea_id',
    'user_id',
    'vote',
    'created_at',
] as const;

export const LOG_COLUMNS = [
    'id',
    'timestamp',
    'actor_id',
    'actor_name',
    'action_type',
    'target_id',
    'before',
    'after',
    'detail',
] as const;

export const DECISION_COLUMNS = ['id', 'idea_id', 'reasoning', 'decided_by', 'decided_by_name', 'decided_at'] as const;

export const IDEA_DIFFICULTIES = ['Easy', 'Medium', 'Hard'] as const;
export type IdeaDifficulty = (typeof IDEA_DIFFICULTIES)[number];

export const IDEA_STATUSES = ['Active', 'Finalized', 'Archived'] as const;
export type IdeaStatus = (typeof IDEA_STATUSES)[number];

export const VOTE_VALUES = ['up', 'down', 'unsure'] as const;
export type VoteValue = (typeof VOTE_VALUES)[number];

export interface Actor {
    id: string;
    name: string;
}

export interface Idea extends SheetRow {
    id: string;
    title: string;
    description: string;
    tech_stack: string;
    difficulty: IdeaDifficulty;
    submitted_by: string;
    submitted_by_name: string;
    status: IdeaStatus;
    thread_id: string;
    created_at: string;
    updated_at: string;
}

export interface Vote extends SheetRow {
    id: string;
    idea_id: string;
    user_id: string;
    vote: VoteValue;
    created_at: string;
}

export interface LogEntry extends SheetRow {
    id: string;
    timestamp: string;
    actor_id: string;
    actor_name: string;
    action_type: string;
    target_id: string;
    before: string;
    after: string;
    detail: string;
}

export interface Decision extends SheetRow {
    id: string;
    idea_id: string;
    reasoning: string;
    decided_by: string;
    decided_by_name: string;
    decided_at: string;
}

export interface VoteTally {
    up: number;
    down: number;
    unsure: number;
    total: number;
}

export interface IdeaWithTally {
    idea: Idea;
    tally: VoteTally;
}
