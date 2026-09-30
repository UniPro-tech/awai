import type { AnalysisRunResponse, AnalysisRunSummary } from "@private-polis/contracts";
import { and, asc, desc, eq } from "drizzle-orm";
import type { Database } from "../db/client.js";
import {
  analysisGroups,
  analysisPoints,
  analysisRuns,
  analysisStatementResults,
  analysisStatementVoteCounts,
  appUsers,
  statements,
  votes,
} from "../db/schema.js";
import { presentStatement } from "../presenters/statement.js";

export interface AnalysisService {
  latest(topicId: string, viewerUserId: string): Promise<AnalysisRunResponse | undefined>;
  listRuns(topicId: string): Promise<AnalysisRunSummary[]>;
  getRun(
    topicId: string,
    runId: string,
    viewerUserId: string,
  ): Promise<AnalysisRunResponse | undefined>;
}

type GroupPosition = AnalysisRunResponse["groups"][number];
type RankedStatement = AnalysisRunResponse["statementResults"][number];
type ViewerVote = { statementId: string; value: "AGREE" | "DISAGREE" | "PASS" };

export function estimateViewerPoint(
  groups: GroupPosition[],
  results: RankedStatement[],
  viewerVotes: ViewerVote[],
): AnalysisRunResponse["viewerPoint"] {
  const voteByStatement = new Map(
    viewerVotes.map((vote) => [vote.statementId, vote.value] as const),
  );
  let hasDirectionalEvidence = false;
  const scoredGroups = groups.map((group) => {
    let weightedSimilarity = 0;
    let totalWeight = 0;
    for (const result of results) {
      if (
        result.groupOrdinal !== group.ordinal ||
        !result.kind.startsWith("REPRESENTATIVE_")
      ) {
        continue;
      }
      const vote = voteByStatement.get(result.statement.id);
      if (!vote || vote === "PASS") continue;
      hasDirectionalEvidence = true;
      const expected = result.kind.endsWith("_AGREE") ? "AGREE" : "DISAGREE";
      const weight = Math.max(result.score, 0.01);
      weightedSimilarity += (vote === expected ? 1 : -1) * weight;
      totalWeight += weight;
    }
    return {
      group,
      similarity: totalWeight === 0 ? 0 : weightedSimilarity / totalWeight,
    };
  });
  if (!hasDirectionalEvidence || scoredGroups.length === 0) return null;

  const strongest = scoredGroups.reduce((best, entry) =>
    entry.similarity > best.similarity ? entry : best,
  );
  const weights = scoredGroups.map((entry) => Math.exp(entry.similarity * 2));
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);

  return {
    x: scoredGroups.reduce(
      (sum, entry, index) => sum + entry.group.centroid.x * weights[index]!,
      0,
    ) / totalWeight,
    y: scoredGroups.reduce(
      (sum, entry, index) => sum + entry.group.centroid.y * weights[index]!,
      0,
    ) / totalWeight,
    groupOrdinal: strongest.group.ordinal,
  };
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
  async function getRun(
    topicId: string,
    runId: string,
    viewerUserId: string,
  ): Promise<AnalysisRunResponse | undefined> {
    const [run] = await database
      .select(runSelection)
      .from(analysisRuns)
      .where(and(eq(analysisRuns.id, runId), eq(analysisRuns.topicId, topicId)))
      .limit(1);
    if (!run) return undefined;

    const [groups, points, statementResults, voteCountRows, viewerVotes] = await Promise.all([
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
          agree: analysisStatementVoteCounts.agreeCount,
          disagree: analysisStatementVoteCounts.disagreeCount,
          pass: analysisStatementVoteCounts.passCount,
        })
        .from(analysisStatementVoteCounts)
        .innerJoin(
          statements,
          eq(analysisStatementVoteCounts.statementId, statements.id),
        )
        .innerJoin(appUsers, eq(statements.authorUserId, appUsers.id))
        .leftJoin(
          analysisGroups,
          eq(analysisStatementVoteCounts.groupId, analysisGroups.id),
        )
        .where(eq(analysisStatementVoteCounts.analysisRunId, runId))
        .orderBy(asc(statements.createdAt), asc(analysisGroups.ordinal)),
      database
        .select({ statementId: votes.statementId, value: votes.value })
        .from(votes)
        .innerJoin(statements, eq(votes.statementId, statements.id))
        .where(and(eq(votes.userId, viewerUserId), eq(statements.topicId, topicId))),
    ]);

    const presentedGroups = groups.map((group) => ({
      ordinal: group.ordinal,
      participantCount: group.participantCount,
      centroid: { x: group.centroidX, y: group.centroidY },
    }));
    const presentedResults = statementResults.map((result) => ({
      statement: presentStatement(result),
      groupOrdinal: result.groupOrdinal,
      kind: result.kind as AnalysisRunResponse["statementResults"][number]["kind"],
      score: result.score,
      rank: result.rank,
    }));
    const voteDistributions = new Map<
      string,
      AnalysisRunResponse["voteDistributions"][number]
    >();
    for (const row of voteCountRows) {
      const distribution = voteDistributions.get(row.id) ?? {
        statement: presentStatement(row),
        overall: { agree: 0, disagree: 0, pass: 0, total: 0 },
        groups: [],
      };
      const counts = {
        agree: row.agree,
        disagree: row.disagree,
        pass: row.pass,
        total: row.agree + row.disagree + row.pass,
      };
      if (row.groupOrdinal === null) {
        distribution.overall = counts;
      } else {
        distribution.groups.push({ groupOrdinal: row.groupOrdinal, ...counts });
      }
      voteDistributions.set(row.id, distribution);
    }

    return {
      ...summarize(run),
      groups: presentedGroups,
      points: points.map((point) => ({
        x: point.x,
        y: point.y,
        groupOrdinal: point.groupOrdinal,
      })),
      viewerPoint: estimateViewerPoint(presentedGroups, presentedResults, viewerVotes),
      statementResults: presentedResults,
      voteDistributions: [...voteDistributions.values()],
    };
  }

  return {
    async latest(topicId, viewerUserId) {
      const [run] = await database
        .select({ id: analysisRuns.id })
        .from(analysisRuns)
        .where(and(eq(analysisRuns.topicId, topicId), eq(analysisRuns.status, "COMPLETED")))
        .orderBy(desc(analysisRuns.createdAt))
        .limit(1);
      return run ? getRun(topicId, run.id, viewerUserId) : undefined;
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
