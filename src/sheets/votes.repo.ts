import type { Vote, VoteTally, VoteValue } from '../types';
import type { TableStore } from './sheet-table';

export interface VoteUpsertResult {
    before: Vote | null;
    after: Vote;
}

export class VotesRepo {
    constructor(private readonly table: TableStore<Vote>) {}

    async findByIdeaId(ideaId: string): Promise<Vote[]> {
        const votes = await this.table.findAll();
        return votes.filter((vote) => vote.idea_id === ideaId);
    }

    async tallyForIdea(ideaId: string): Promise<VoteTally> {
        const tally: VoteTally = { up: 0, down: 0, unsure: 0, total: 0 };
        const votes = await this.findByIdeaId(ideaId);

        for (const vote of votes) {
            tally[vote.vote] += 1;
            tally.total += 1;
        }

        return tally;
    }

    async upsert(vote: Vote): Promise<VoteUpsertResult> {
        const votes = await this.table.findAll();
        const existing = votes.find(
            (row) => row.idea_id === vote.idea_id && row.user_id === vote.user_id,
        );

        if (!existing) {
            const created = await this.table.append(vote);
            return { before: null, after: created };
        }

        const updated = await this.table.updateById(existing.id, {
            vote: vote.vote as VoteValue,
        });

        if (!updated) {
            throw new Error(`Could not update vote ${existing.id}.`);
        }

        return { before: existing, after: updated };
    }
}
