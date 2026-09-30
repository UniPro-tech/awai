import { z } from "zod";
import { IdSchema } from "./common.js";

export const UserRoleSchema = z.enum(["USER", "ADMIN"]);

export const AdminUserResponseSchema = z.object({
  id: IdSchema,
  displayName: z.string(),
  role: UserRoleSchema,
  suspended: z.boolean(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export type AdminUserResponse = z.infer<typeof AdminUserResponseSchema>;

export const AdminUserListResponseSchema = z.object({
  items: z.array(AdminUserResponseSchema),
});

export const UpdateAdminUserRequestSchema = z
  .object({
    role: UserRoleSchema.optional(),
    suspended: z.boolean().optional(),
  })
  .refine((value) => value.role !== undefined || value.suspended !== undefined, {
    message: "At least one field is required.",
  });

export type UpdateAdminUserRequest = z.infer<typeof UpdateAdminUserRequestSchema>;

export const AuditActionSchema = z.enum([
  "ADMIN_ROLE_CHANGE",
  "IDENTITY_POLICY_CHANGE",
  "STATEMENT_DELETE",
  "STATEMENT_RESTORE",
  "TOPIC_DELETE",
  "TOPIC_OWNER_CHANGE",
  "TOPIC_RESTORE",
  "TOPIC_STATUS_CHANGE",
  "USER_SUSPENSION_CHANGE",
]);

export type AuditAction = z.infer<typeof AuditActionSchema>;

export const AdminAuditLogQuerySchema = z.object({
  action: AuditActionSchema.optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});

export type AdminAuditLogQuery = z.infer<typeof AdminAuditLogQuerySchema>;

export const AdminAuditLogEntrySchema = z.object({
  id: IdSchema,
  actor: z
    .object({
      id: IdSchema,
      displayName: z.string(),
    })
    .nullable(),
  action: AuditActionSchema,
  entityType: z.string().min(1).max(50),
  entityId: IdSchema.nullable(),
  metadata: z.record(z.string(), z.unknown()),
  createdAt: z.iso.datetime(),
});

export type AdminAuditLogEntry = z.infer<typeof AdminAuditLogEntrySchema>;

export const AdminAuditLogListResponseSchema = z.object({
  items: z.array(AdminAuditLogEntrySchema),
  pagination: z.object({
    page: z.number().int().min(1),
    pageSize: z.number().int().min(1),
    total: z.number().int().min(0),
    totalPages: z.number().int().min(0),
  }),
});

export type AdminAuditLogListResponse = z.infer<
  typeof AdminAuditLogListResponseSchema
>;
