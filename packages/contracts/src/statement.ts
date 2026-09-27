import { z } from "zod";
import { AuthorVisibilitySchema, IdSchema, PublicAuthorSchema } from "./common.js";

export const CreateStatementRequestSchema = z.object({
  body: z.string().trim().min(1).max(5_000),
  authorVisibility: AuthorVisibilitySchema,
});

export type CreateStatementRequest = z.infer<typeof CreateStatementRequestSchema>;

export const StatementResponseSchema = z.object({
  id: IdSchema,
  topicId: IdSchema,
  body: z.string(),
  author: PublicAuthorSchema,
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export type StatementResponse = z.infer<typeof StatementResponseSchema>;
