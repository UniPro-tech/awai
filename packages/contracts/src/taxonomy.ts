import { z } from "zod";
import { IdSchema } from "./common.js";

export const TaxonomyItemResponseSchema = z.object({
  id: IdSchema,
  name: z.string(),
});

export type TaxonomyItemResponse = z.infer<typeof TaxonomyItemResponseSchema>;

export const TaxonomyListResponseSchema = z.object({
  items: z.array(TaxonomyItemResponseSchema),
});

export const CreateCategoryRequestSchema = z.object({
  name: z.string().trim().min(1).max(100),
});

export const CreateTagRequestSchema = z.object({
  name: z.string().trim().min(1).max(50),
});
