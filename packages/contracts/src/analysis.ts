import { z } from "zod";
import { IdSchema } from "./common.js";
import { StatementResponseSchema } from "./statement.js";

export const AnalysisRunStatusSchema = z.enum(["RUNNING", "COMPLETED", "FAILED"]);

export const AnalysisRunSummarySchema = z.object({
  id: IdSchema,
  status: AnalysisRunStatusSchema,
  algorithmVersion: z.string(),
  participantCount: z.int().nonnegative(),
  statementCount: z.int().nonnegative(),
  completedAt: z.iso.datetime().nullable(),
  createdAt: z.iso.datetime(),
});

export type AnalysisRunSummary = z.infer<typeof AnalysisRunSummarySchema>;

export const AnalysisGroupSchema = z.object({
  ordinal: z.int().nonnegative(),
  participantCount: z.int().nonnegative(),
  centroid: z.object({ x: z.number(), y: z.number() }),
});

export type AnalysisGroup = z.infer<typeof AnalysisGroupSchema>;

export const AnalysisPointSchema = z.object({
  x: z.number(),
  y: z.number(),
  groupOrdinal: z.int().nonnegative().nullable(),
});

export type AnalysisPoint = z.infer<typeof AnalysisPointSchema>;

export const AnalysisStatementResultKindSchema = z.enum([
  "CONSENSUS_AGREE",
  "CONSENSUS_DISAGREE",
  "REPRESENTATIVE_AGREE",
  "REPRESENTATIVE_DISAGREE",
]);

export const AnalysisStatementResultSchema = z.object({
  statement: StatementResponseSchema,
  groupOrdinal: z.int().nonnegative().nullable(),
  kind: AnalysisStatementResultKindSchema,
  score: z.number(),
  rank: z.int().positive(),
});

export const AnalysisVoteCountsSchema = z.object({
  agree: z.int().nonnegative(),
  disagree: z.int().nonnegative(),
  pass: z.int().nonnegative(),
  total: z.int().nonnegative(),
});

export type AnalysisVoteCounts = z.infer<typeof AnalysisVoteCountsSchema>;

export const AnalysisGroupVoteDistributionSchema = AnalysisVoteCountsSchema.extend({
  groupOrdinal: z.int().nonnegative(),
});

export const AnalysisStatementVoteDistributionSchema = z.object({
  statement: StatementResponseSchema,
  overall: AnalysisVoteCountsSchema,
  groups: z.array(AnalysisGroupVoteDistributionSchema),
});

export type AnalysisStatementVoteDistribution = z.infer<
  typeof AnalysisStatementVoteDistributionSchema
>;

export const AnalysisRunResponseSchema = AnalysisRunSummarySchema.extend({
  groups: z.array(AnalysisGroupSchema),
  points: z.array(AnalysisPointSchema),
  viewerPoint: AnalysisPointSchema.nullable(),
  statementResults: z.array(AnalysisStatementResultSchema),
  voteDistributions: z.array(AnalysisStatementVoteDistributionSchema),
});

export type AnalysisRunResponse = z.infer<typeof AnalysisRunResponseSchema>;

export const AnalysisRunListResponseSchema = z.object({
  items: z.array(AnalysisRunSummarySchema),
});
