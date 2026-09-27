import type { VoteStatisticsResponse } from "@private-polis/contracts";

type VoteValue = "AGREE" | "DISAGREE" | "PASS";

interface VoteRecord {
  statementId: string;
  userId: string;
  value: VoteValue;
}

const votes = new Map<string, VoteRecord>();

function key(statementId: string, userId: string): string {
  return `${statementId}:${userId}`;
}

export const voteService = {
  setVote(statementId: string, userId: string, value: VoteValue): void {
    votes.set(key(statementId, userId), { statementId, userId, value });
  },

  getCurrentUserVote(statementId: string, userId: string): VoteValue | null {
    return votes.get(key(statementId, userId))?.value ?? null;
  },

  getVoteStatistics(statementId: string): VoteStatisticsResponse {
    const statistics = { agree: 0, disagree: 0, pass: 0, total: 0 };
    for (const vote of votes.values()) {
      if (vote.statementId !== statementId) continue;
      statistics.total += 1;
      if (vote.value === "AGREE") statistics.agree += 1;
      if (vote.value === "DISAGREE") statistics.disagree += 1;
      if (vote.value === "PASS") statistics.pass += 1;
    }
    return statistics;
  },

  clearForTests(): void {
    votes.clear();
  },
};
