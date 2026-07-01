export type SheetRow = Record<string, string>;

export const IDEA_COLUMNS = [
    'id',
    'title',
    'description',
    'tech_stack',
    'difficulty',
    'category',
    'submitted_by',
    'submitted_by_name',
    'status',
    'thread_id',
    'created_at',
    'updated_at',
] as const;

export const GRADE_COLUMNS = [
    'id',
    'idea_id',
    'user_id',
    'user_name',
    'learning',
    'impact',
    'feasibility',
    'innovation',
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

export const PROJECT_CATEGORIES = ['B2B', 'Fintech', 'EdTech', 'HealthTech', 'Social', 'Dev Tools', 'Other'] as const;
export type ProjectCategory = (typeof PROJECT_CATEGORIES)[number];

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
    category: ProjectCategory;
    submitted_by: string;
    submitted_by_name: string;
    status: IdeaStatus;
    thread_id: string;
    created_at: string;
    updated_at: string;
}

export interface Grade extends SheetRow {
    id: string;
    idea_id: string;
    user_id: string;
    user_name: string;
    learning: string;
    impact: string;
    feasibility: string;
    innovation: string;
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

export interface GradeSummary {
    learning: number;
    impact: number;
    feasibility: number;
    innovation: number;
    overall: number;
    count: number;
}

export interface CommentEntry {
    actor_name: string;
    text: string;
    timestamp: string;
}

export interface IdeaWithGrades {
    idea: Idea;
    grades: GradeSummary;
    comments: CommentEntry[];
}
