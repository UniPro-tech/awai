import { z } from "zod";

export const IdSchema = z.uuid();

export const ApiErrorCodeSchema = z.enum([
  "TOPIC_NOT_FOUND",
  "TOPIC_CLOSED",
  "STATEMENT_NOT_FOUND",
  "STATEMENT_ALREADY_VOTED",
  "STATEMENT_IDENTITY_POLICY_VIOLATION",
  "ANALYSIS_NOT_FOUND",
  "TAXONOMY_NOT_FOUND",
  "USER_NOT_FOUND",
  "ADMIN_SELF_LOCKOUT",
  "PERMISSION_DENIED",
  "AUTHENTICATION_REQUIRED",
  "VALIDATION_ERROR",
  "ROUTE_NOT_FOUND",
  "RATE_LIMITED",
  "INTERNAL_ERROR",
]);

export const ApiErrorSchema = z.object({
  error: z.object({
    code: ApiErrorCodeSchema,
    message: z.string(),
    details: z.unknown().optional(),
    requestId: z.string().optional(),
  }),
});

export type ApiError = z.infer<typeof ApiErrorSchema>;

export const AuthorVisibilitySchema = z.enum(["IDENTIFIED", "ANONYMOUS"]);

export const PublicAuthorSchema = z.object({
  visibility: AuthorVisibilitySchema,
  displayName: z.string().nullable(),
});
