import { z } from "zod";
import { AuthorVisibilitySchema, IdSchema, PublicAuthorSchema } from "./common.js";
import { TaxonomyItemResponseSchema } from "./taxonomy.js";

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

export const UpdateTopicRequestSchema = z
  .object({
    status: TopicStatusSchema.optional(),
    statementIdentityPolicy: StatementIdentityPolicySchema.optional(),
  })
  .refine(
    (value) => value.status !== undefined || value.statementIdentityPolicy !== undefined,
    { message: "At least one field is required." },
  );

export type UpdateTopicRequest = z.infer<typeof UpdateTopicRequestSchema>;

export const ChangeTopicOwnerRequestSchema = z.object({
  ownerUserId: IdSchema,
});

export type ChangeTopicOwnerRequest = z.infer<typeof ChangeTopicOwnerRequestSchema>;

export const TopicResponseSchema = z.object({
  id: IdSchema,
  title: z.string(),
  description: z.string(),
  author: PublicAuthorSchema,
  statementIdentityPolicy: StatementIdentityPolicySchema,
  status: TopicStatusSchema,
  category: TaxonomyItemResponseSchema.nullable().default(null),
  tags: z.array(TaxonomyItemResponseSchema).default([]),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export type TopicResponse = z.infer<typeof TopicResponseSchema>;

export const TopicListResponseSchema = z.object({
  items: z.array(TopicResponseSchema),
});
