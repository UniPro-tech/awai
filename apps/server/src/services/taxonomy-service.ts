import type { TaxonomyItemResponse } from "@private-polis/contracts";
import { asc, eq } from "drizzle-orm";
import type { AuthenticatedUser } from "../auth/session.js";
import type { Database } from "../db/client.js";
import { categories, tags } from "../db/schema.js";

export type TaxonomyMutationResult =
  | { item: TaxonomyItemResponse }
  | { ok: true }
  | { error: "PERMISSION_DENIED" | "TAXONOMY_NOT_FOUND" };

export interface TaxonomyService {
  listCategories(): Promise<TaxonomyItemResponse[]>;
  listTags(): Promise<TaxonomyItemResponse[]>;
  createCategory(name: string, user: AuthenticatedUser): Promise<TaxonomyMutationResult>;
  createTag(name: string, user: AuthenticatedUser): Promise<TaxonomyMutationResult>;
  deleteCategory(id: string, user: AuthenticatedUser): Promise<TaxonomyMutationResult>;
  deleteTag(id: string, user: AuthenticatedUser): Promise<TaxonomyMutationResult>;
}

export function createPostgresTaxonomyService(database: Database): TaxonomyService {
  return {
    listCategories: () =>
      database
        .select({ id: categories.id, name: categories.name })
        .from(categories)
        .orderBy(asc(categories.name)),
    listTags: () =>
      database.select({ id: tags.id, name: tags.name }).from(tags).orderBy(asc(tags.name)),
    async createCategory(name, user) {
      if (user.role !== "ADMIN") return { error: "PERMISSION_DENIED" };
      const [item] = await database
        .insert(categories)
        .values({ name })
        .onConflictDoUpdate({ target: categories.name, set: { updatedAt: new Date() } })
        .returning({ id: categories.id, name: categories.name });
      if (!item) throw new Error("Category insertion did not return a row.");
      return { item };
    },
    async createTag(name, user) {
      if (user.role !== "ADMIN") return { error: "PERMISSION_DENIED" };
      const [item] = await database
        .insert(tags)
        .values({ name })
        .onConflictDoUpdate({ target: tags.name, set: { updatedAt: new Date() } })
        .returning({ id: tags.id, name: tags.name });
      if (!item) throw new Error("Tag insertion did not return a row.");
      return { item };
    },
    async deleteCategory(id, user) {
      if (user.role !== "ADMIN") return { error: "PERMISSION_DENIED" };
      const rows = await database.delete(categories).where(eq(categories.id, id)).returning({ id: categories.id });
      return rows.length === 0 ? { error: "TAXONOMY_NOT_FOUND" } : { ok: true };
    },
    async deleteTag(id, user) {
      if (user.role !== "ADMIN") return { error: "PERMISSION_DENIED" };
      const rows = await database.delete(tags).where(eq(tags.id, id)).returning({ id: tags.id });
      return rows.length === 0 ? { error: "TAXONOMY_NOT_FOUND" } : { ok: true };
    },
  };
}

export function createMemoryTaxonomyService(): TaxonomyService {
  const categoryRecords = new Map<string, TaxonomyItemResponse>();
  const tagRecords = new Map<string, TaxonomyItemResponse>();
  const list = (records: Map<string, TaxonomyItemResponse>) =>
    [...records.values()].sort((a, b) => a.name.localeCompare(b.name));
  const create = (
    records: Map<string, TaxonomyItemResponse>,
    name: string,
    user: AuthenticatedUser,
  ): TaxonomyMutationResult => {
    if (user.role !== "ADMIN") return { error: "PERMISSION_DENIED" };
    const existing = [...records.values()].find((item) => item.name === name);
    if (existing) return { item: existing };
    const item = { id: crypto.randomUUID(), name };
    records.set(item.id, item);
    return { item };
  };
  const remove = (
    records: Map<string, TaxonomyItemResponse>,
    id: string,
    user: AuthenticatedUser,
  ): TaxonomyMutationResult => {
    if (user.role !== "ADMIN") return { error: "PERMISSION_DENIED" };
    return records.delete(id) ? { ok: true } : { error: "TAXONOMY_NOT_FOUND" };
  };
  return {
    listCategories: async () => list(categoryRecords),
    listTags: async () => list(tagRecords),
    createCategory: async (name, user) => create(categoryRecords, name, user),
    createTag: async (name, user) => create(tagRecords, name, user),
    deleteCategory: async (id, user) => remove(categoryRecords, id, user),
    deleteTag: async (id, user) => remove(tagRecords, id, user),
  };
}
