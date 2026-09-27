import { zValidator } from "@hono/zod-validator";
import {
  ApiErrorSchema,
  CreateCategoryRequestSchema,
  CreateTagRequestSchema,
  IdSchema,
  TaxonomyItemResponseSchema,
  TaxonomyListResponseSchema,
} from "@private-polis/contracts";
import { Hono, type Context } from "hono";
import type { AppEnvironment } from "../http/context.js";
import type { ApplicationServices } from "../services/services.js";
import type { TaxonomyMutationResult } from "../services/taxonomy-service.js";

function mutationError(c: Context<AppEnvironment>, result: TaxonomyMutationResult) {
  if (!("error" in result)) return undefined;
  if (result.error === "PERMISSION_DENIED") {
    return c.json(
      ApiErrorSchema.parse({ error: { code: result.error, message: "Administrator access is required." } }),
      403,
    );
  }
  return c.json(
    ApiErrorSchema.parse({ error: { code: result.error, message: "Category or tag not found." } }),
    404,
  );
}

export function createCategoriesRoute(services: ApplicationServices) {
  return new Hono<AppEnvironment>()
    .get("/", async (c) =>
      c.json(TaxonomyListResponseSchema.parse({ items: await services.taxonomy.listCategories() })),
    )
    .post("/", zValidator("json", CreateCategoryRequestSchema), async (c) => {
      const result = await services.taxonomy.createCategory(
        c.req.valid("json").name,
        c.get("currentUser"),
      );
      const error = mutationError(c, result);
      if (error) return error;
      if (!("item" in result)) throw new Error("Category creation returned no item.");
      return c.json(TaxonomyItemResponseSchema.parse(result.item), 201);
    })
    .delete("/:categoryId", async (c) => {
      const id = IdSchema.safeParse(c.req.param("categoryId"));
      if (!id.success) {
        return c.json(
          ApiErrorSchema.parse({ error: { code: "TAXONOMY_NOT_FOUND", message: "Category not found." } }),
          404,
        );
      }
      const result = await services.taxonomy.deleteCategory(id.data, c.get("currentUser"));
      const error = mutationError(c, result);
      return error ?? c.body(null, 204);
    });
}

export function createTagsRoute(services: ApplicationServices) {
  return new Hono<AppEnvironment>()
    .get("/", async (c) =>
      c.json(TaxonomyListResponseSchema.parse({ items: await services.taxonomy.listTags() })),
    )
    .post("/", zValidator("json", CreateTagRequestSchema), async (c) => {
      const result = await services.taxonomy.createTag(
        c.req.valid("json").name,
        c.get("currentUser"),
      );
      const error = mutationError(c, result);
      if (error) return error;
      if (!("item" in result)) throw new Error("Tag creation returned no item.");
      return c.json(TaxonomyItemResponseSchema.parse(result.item), 201);
    })
    .delete("/:tagId", async (c) => {
      const id = IdSchema.safeParse(c.req.param("tagId"));
      if (!id.success) {
        return c.json(
          ApiErrorSchema.parse({ error: { code: "TAXONOMY_NOT_FOUND", message: "Tag not found." } }),
          404,
        );
      }
      const result = await services.taxonomy.deleteTag(id.data, c.get("currentUser"));
      const error = mutationError(c, result);
      return error ?? c.body(null, 204);
    });
}
