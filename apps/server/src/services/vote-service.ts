import type { VoteStatisticsResponse } from "@private-polis/contracts";
import { and, eq } from "drizzle-orm";
import type { Database } from "../db/client.js";
import { votes } from "../db/schema.js";
import type { AnalysisQueue } from "./analysis-queue.js";

export type VoteValue = "AGREE" | "DISAGREE" | "PASS";

export interface VoteService {
  setVote(statementId: string, topicId: string, userId: string, value: VoteValue): Promise<void>;
  getCurrentUserVote(statementId: string, userId: string): Promise<VoteValue | null>;
  getVoteStatistics(statementId: string): Promise<VoteStatisticsResponse>;
}

function statistics(values: VoteValue[]): VoteStatisticsResponse {
  const result = { agree: 0, disagree: 0, pass: 0, total: 0 };
  for (const value of values) {
    result.total += 1;
    if (value === "AGREE") result.agree += 1;
    if (value === "DISAGREE") result.disagree += 1;
    if (value === "PASS") result.pass += 1;
  }
  return result;
}

export function createPostgresVoteService(
  database: Database,
  analysisQueue: AnalysisQueue,
): VoteService {
  return {
    async setVote(statementId, topicId, userId, value) {
      await database
        .insert(votes)
        .values({ statementId, userId, value })
        .onConflictDoUpdate({
          target: [votes.statementId, votes.userId],
          set: { value, updatedAt: new Date() },
        });
      await analysisQueue.enqueue(topicId);
    },

    async getCurrentUserVote(statementId, userId) {
      const [vote] = await database
        .select({ value: votes.value })
        .from(votes)
        .where(and(eq(votes.statementId, statementId), eq(votes.userId, userId)))
        .limit(1);
      return vote?.value ?? null;
    },

    async getVoteStatistics(statementId) {
      const rows = await database
        .select({ value: votes.value })
        .from(votes)
        .where(eq(votes.statementId, statementId));
      return statistics(rows.map((row) => row.value));
    },
  };
}

export interface MemoryVoteService extends VoteService {
  clearForTests(): void;
}

export function createMemoryVoteService(analysisQueue: AnalysisQueue): MemoryVoteService {
  const records = new Map<string, { statementId: string; userId: string; value: VoteValue }>();
  const key = (statementId: string, userId: string) => `${statementId}:${userId}`;
  return {
    async setVote(statementId, topicId, userId, value) {
      records.set(key(statementId, userId), { statementId, userId, value });
      await analysisQueue.enqueue(topicId);
    },
    async getCurrentUserVote(statementId, userId) {
      return records.get(key(statementId, userId))?.value ?? null;
    },
    async getVoteStatistics(statementId) {
      return statistics(
        [...records.values()]
          .filter((vote) => vote.statementId === statementId)
          .map((vote) => vote.value),
      );
    },
    clearForTests() {
      records.clear();
    },
  };
}
