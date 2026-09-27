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
