import { z } from "zod";

export const PublicConfigResponseSchema = z.object({
  registrationEnabled: z.boolean(),
});

export type PublicConfigResponse = z.infer<typeof PublicConfigResponseSchema>;
