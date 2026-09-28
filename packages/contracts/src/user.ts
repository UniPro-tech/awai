import { z } from "zod";
import { UserRoleSchema } from "./admin.js";
import { IdSchema } from "./common.js";

export const CurrentUserResponseSchema = z.object({
  id: IdSchema,
  displayName: z.string(),
  role: UserRoleSchema,
});

export type CurrentUserResponse = z.infer<typeof CurrentUserResponseSchema>;
