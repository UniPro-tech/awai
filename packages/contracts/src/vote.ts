import { z } from "zod";

export const VoteValueSchema = z.enum(["AGREE", "DISAGREE", "PASS"]);

export const SetVoteRequestSchema = z.object({
  value: VoteValueSchema,
});

export type SetVoteRequest = z.infer<typeof SetVoteRequestSchema>;

export const CurrentVoteResponseSchema = z.object({
  value: VoteValueSchema.nullable(),
});

export const VoteStatisticsResponseSchema = z.object({
  agree: z.int().nonnegative(),
  disagree: z.int().nonnegative(),
  pass: z.int().nonnegative(),
  total: z.int().nonnegative(),
});
