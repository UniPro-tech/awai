import { z } from "zod";
import { AuthorVisibilitySchema, IdSchema, PublicAuthorSchema } from "./common.js";

export const StatementIdentityPolicySchema = z.enum([
  "OPTIONAL",
  "ANONYMOUS_REQUIRED",
  "IDENTIFIED_REQUIRED",
]);

export const TopicStatusSchema = z.enum(["DRAFT", "OPEN", "CLOSED", "ARCHIVED"]);

export const CreateTopicRequestSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().max(10_000).default(""),
  authorVisibility: AuthorVisibilitySchema.default("IDENTIFIED"),
  statementIdentityPolicy: StatementIdentityPolicySchema.default("OPTIONAL"),
  categoryId: IdSchema.nullable().default(null),
  tags: z.array(z.string().trim().min(1).max(50)).max(10).default([]),
});

export type CreateTopicRequest = z.infer<typeof CreateTopicRequestSchema>;

export const TopicResponseSchema = z.object({
  id: IdSchema,
  title: z.string(),
  description: z.string(),
  author: PublicAuthorSchema,
  statementIdentityPolicy: StatementIdentityPolicySchema,
  status: TopicStatusSchema,
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export type TopicResponse = z.infer<typeof TopicResponseSchema>;

export const TopicListResponseSchema = z.object({
  items: z.array(TopicResponseSchema),
});
