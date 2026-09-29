import { z } from "zod";
import { IdSchema } from "./common.js";

export const VoteValueSchema = z.enum(["AGREE", "DISAGREE", "PASS"]);

export const SetVoteRequestSchema = z.object({
  value: VoteValueSchema,
});

export type SetVoteRequest = z.infer<typeof SetVoteRequestSchema>;

export const CurrentVoteResponseSchema = z.object({
  value: VoteValueSchema.nullable(),
});

export type CurrentVoteResponse = z.infer<typeof CurrentVoteResponseSchema>;

export const CurrentTopicVoteSchema = z.object({
  statementId: IdSchema,
  value: VoteValueSchema,
});

export const CurrentTopicVoteListResponseSchema = z.object({
  items: z.array(CurrentTopicVoteSchema),
});

export type CurrentTopicVoteListResponse = z.infer<
  typeof CurrentTopicVoteListResponseSchema
>;

export const VoteStatisticsResponseSchema = z.object({
  agree: z.int().nonnegative(),
  disagree: z.int().nonnegative(),
  pass: z.int().nonnegative(),
  total: z.int().nonnegative(),
});

export type VoteStatisticsResponse = z.infer<typeof VoteStatisticsResponseSchema>;
