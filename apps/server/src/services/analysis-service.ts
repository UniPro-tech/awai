import type { AnalysisRunResponse, AnalysisRunSummary } from "@private-polis/contracts";
import { and, asc, desc, eq } from "drizzle-orm";
import type { Database } from "../db/client.js";
import {
  analysisGroups,
  analysisPoints,
  analysisRuns,
  analysisStatementResults,
  appUsers,
  statements,
} from "../db/schema.js";
import { presentStatement } from "../presenters/statement.js";

export interface AnalysisService {
  latest(topicId: string): Promise<AnalysisRunResponse | undefined>;
  listRuns(topicId: string): Promise<AnalysisRunSummary[]>;
  getRun(topicId: string, runId: string): Promise<AnalysisRunResponse | undefined>;
}

const runSelection = {
  id: analysisRuns.id,
  status: analysisRuns.status,
  algorithmVersion: analysisRuns.algorithmVersion,
  participantCount: analysisRuns.participantCount,
  statementCount: analysisRuns.statementCount,
  completedAt: analysisRuns.completedAt,
  createdAt: analysisRuns.createdAt,
};

function summarize(run: {
  id: string;
  status: "RUNNING" | "COMPLETED" | "FAILED";
  algorithmVersion: string;
  participantCount: number;
  statementCount: number;
  completedAt: Date | null;
  createdAt: Date;
}): AnalysisRunSummary {
  return {
    ...run,
    completedAt: run.completedAt?.toISOString() ?? null,
    createdAt: run.createdAt.toISOString(),
  };
}

export function createPostgresAnalysisService(database: Database): AnalysisService {
  async function getRun(topicId: string, runId: string): Promise<AnalysisRunResponse | undefined> {
    const [run] = await database
      .select(runSelection)
      .from(analysisRuns)
      .where(and(eq(analysisRuns.id, runId), eq(analysisRuns.topicId, topicId)))
      .limit(1);
    if (!run) return undefined;

    const [groups, points, statementResults] = await Promise.all([
      database
        .select({
          ordinal: analysisGroups.ordinal,
          participantCount: analysisGroups.participantCount,
          centroidX: analysisGroups.centroidX,
          centroidY: analysisGroups.centroidY,
        })
        .from(analysisGroups)
        .where(eq(analysisGroups.analysisRunId, runId))
        .orderBy(asc(analysisGroups.ordinal)),
      database
        .select({
          x: analysisPoints.x,
          y: analysisPoints.y,
          groupOrdinal: analysisGroups.ordinal,
        })
        .from(analysisPoints)
        .leftJoin(analysisGroups, eq(analysisPoints.groupId, analysisGroups.id))
        .where(eq(analysisPoints.analysisRunId, runId)),
      database
        .select({
          id: statements.id,
          topicId: statements.topicId,
          authorUserId: statements.authorUserId,
          authorDisplayName: appUsers.displayName,
          body: statements.body,
          authorVisibility: statements.authorVisibility,
          createdAt: statements.createdAt,
          updatedAt: statements.updatedAt,
          deletedAt: statements.deletedAt,
          groupOrdinal: analysisGroups.ordinal,
          kind: analysisStatementResults.kind,
          score: analysisStatementResults.score,
          rank: analysisStatementResults.rank,
        })
        .from(analysisStatementResults)
        .innerJoin(statements, eq(analysisStatementResults.statementId, statements.id))
        .innerJoin(appUsers, eq(statements.authorUserId, appUsers.id))
        .leftJoin(analysisGroups, eq(analysisStatementResults.groupId, analysisGroups.id))
        .where(eq(analysisStatementResults.analysisRunId, runId))
        .orderBy(asc(analysisStatementResults.kind), asc(analysisStatementResults.rank)),
    ]);

    return {
      ...summarize(run),
      groups: groups.map((group) => ({
        ordinal: group.ordinal,
        participantCount: group.participantCount,
        centroid: { x: group.centroidX, y: group.centroidY },
      })),
      points: points.map((point) => ({
        x: point.x,
        y: point.y,
        groupOrdinal: point.groupOrdinal,
      })),
      statementResults: statementResults.map((result) => ({
        statement: presentStatement(result),
        groupOrdinal: result.groupOrdinal,
        kind: result.kind as AnalysisRunResponse["statementResults"][number]["kind"],
        score: result.score,
        rank: result.rank,
      })),
    };
  }

  return {
    async latest(topicId) {
      const [run] = await database
        .select({ id: analysisRuns.id })
        .from(analysisRuns)
        .where(and(eq(analysisRuns.topicId, topicId), eq(analysisRuns.status, "COMPLETED")))
        .orderBy(desc(analysisRuns.createdAt))
        .limit(1);
      return run ? getRun(topicId, run.id) : undefined;
    },
    async listRuns(topicId) {
      const runs = await database
        .select(runSelection)
        .from(analysisRuns)
        .where(eq(analysisRuns.topicId, topicId))
        .orderBy(desc(analysisRuns.createdAt));
      return runs.map(summarize);
    },
    getRun,
  };
}

export function createMemoryAnalysisService(): AnalysisService {
  return {
    latest: async () => undefined,
    listRuns: async () => [],
    getRun: async () => undefined,
  };
}
