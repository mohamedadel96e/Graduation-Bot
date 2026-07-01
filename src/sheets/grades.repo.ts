import type { Grade, GradeSummary } from '../types';
import type { TableStore } from './sheet-table';

export interface GradeUpsertResult {
    before: Grade | null;
    after: Grade;
}

export class GradesRepo {
    constructor(private readonly table: TableStore<Grade>) {}

    async findByIdeaId(ideaId: string): Promise<Grade[]> {
        const all = await this.table.findAll();
        return all.filter((g) => g.idea_id === ideaId);
    }

    async summarizeForIdea(ideaId: string): Promise<GradeSummary> {
        const grades = await this.findByIdeaId(ideaId);
        const empty: GradeSummary = { learning: 0, impact: 0, feasibility: 0, innovation: 0, overall: 0, count: 0 };

        if (grades.length === 0) return empty;

        let learning = 0;
        let impact = 0;
        let feasibility = 0;
        let innovation = 0;

        for (const g of grades) {
            learning    += Number(g.learning)    || 0;
            impact      += Number(g.impact)      || 0;
            feasibility += Number(g.feasibility) || 0;
            innovation  += Number(g.innovation)  || 0;
        }

        const n = grades.length;
        const avgL = learning / n;
        const avgI = impact / n;
        const avgF = feasibility / n;
        const avgN = innovation / n;
        const overall = (avgL + avgI + avgF + avgN) / 4;

        return {
            learning: avgL,
            impact: avgI,
            feasibility: avgF,
            innovation: avgN,
            overall,
            count: n,
        };
    }

    /**
     * Upserts a grade — one grade per user per idea.
     * If the user already graded, their existing grade is updated.
     */
    async upsert(grade: Grade): Promise<GradeUpsertResult> {
        const all = await this.table.findAll();
        const existing = all.find(
            (row) => row.idea_id === grade.idea_id && row.user_id === grade.user_id,
        );

        if (!existing) {
            const created = await this.table.append(grade);
            return { before: null, after: created };
        }

        const updated = await this.table.updateById(existing.id, {
            learning: grade.learning,
            impact: grade.impact,
            feasibility: grade.feasibility,
            innovation: grade.innovation,
        });

        if (!updated) {
            throw new Error(`Could not update grade ${existing.id}.`);
        }

        return { before: existing, after: updated };
    }
}
