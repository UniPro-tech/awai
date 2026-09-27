import { sql } from "drizzle-orm";
import type { Database } from "../db/client.js";
import { analysisJobs } from "../db/schema.js";

export interface AnalysisQueue {
  enqueue(topicId: string): Promise<void>;
}

export function createPostgresAnalysisQueue(database: Database): AnalysisQueue {
  return {
    async enqueue(topicId) {
      const availableAt = new Date(Date.now() + 10_000);
      await database
        .insert(analysisJobs)
        .values({ topicId, availableAt })
        .onConflictDoUpdate({
          target: analysisJobs.topicId,
          targetWhere: sql`${analysisJobs.status} = 'PENDING'`,
          set: { availableAt, updatedAt: new Date() },
        });
    },
  };
}

export function createMemoryAnalysisQueue(): AnalysisQueue {
  return { enqueue: async () => undefined };
}
