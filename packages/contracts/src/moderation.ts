import { z } from "zod";

export const DeletionRequestSchema = z.object({
  reason: z.string().trim().min(1).max(1_000),
});

export type DeletionRequest = z.infer<typeof DeletionRequestSchema>;
