import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { AdminGate } from "../features/auth/admin-gate";
import { createCategory, createTag, deleteCategory, deleteTag, listCategories, listTags } from "../features/taxonomy/api";
import { errorMessage } from "../lib/error-message";

function AdminCategoriesPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [categoryName, setCategoryName] = useState("");
  const [tagName, setTagName] = useState("");
  const categories = useQuery({ queryKey: ["categories"], queryFn: listCategories });
  const tags = useQuery({ queryKey: ["tags"], queryFn: listTags });
  const addCategory = useMutation({ mutationFn: createCategory, onSuccess: async () => { setCategoryName(""); await queryClient.invalidateQueries({ queryKey: ["categories"] }); } });
  const addTag = useMutation({ mutationFn: createTag, onSuccess: async () => { setTagName(""); await queryClient.invalidateQueries({ queryKey: ["tags"] }); } });
  const removeCategory = useMutation({ mutationFn: deleteCategory, onSuccess: async () => queryClient.invalidateQueries({ queryKey: ["categories"] }) });
  const removeTag = useMutation({ mutationFn: deleteTag, onSuccess: async () => queryClient.invalidateQueries({ queryKey: ["tags"] }) });
  const error = categories.error ?? tags.error ?? addCategory.error ?? addTag.error ?? removeCategory.error ?? removeTag.error;

  function submitCategory(event: FormEvent) { event.preventDefault(); addCategory.mutate(categoryName); }
  function submitTag(event: FormEvent) { event.preventDefault(); addTag.mutate(tagName); }

  return (
    <AdminGate>
      <main className="shell">
        <nav className="breadcrumb"><Link to="/admin">{t("admin.eyebrow")}</Link> / {t("admin.taxonomy")}</nav>
        <header><p className="eyebrow">{t("admin.eyebrow")}</p><h1>{t("admin.taxonomy")}</h1><p>{t("admin.taxonomySubtitle")}</p></header>
        {error ? <p role="alert">{errorMessage(error, t)}</p> : null}
        <section className="taxonomy-grid">
          <div>
            <h2>{t("admin.categories")}</h2>
            <form className="form-row" onSubmit={submitCategory}><input aria-label={t("admin.newCategory")} value={categoryName} onChange={(event) => setCategoryName(event.target.value)} required /><button type="submit" disabled={addCategory.isPending}>{t("common.add")}</button></form>
            <ul className="admin-list compact-list">{categories.data?.items.map((category) => <li className="panel" key={category.id}><span>{category.name}</span><button type="button" disabled={removeCategory.isPending} onClick={() => removeCategory.mutate(category.id)}>{t("common.remove")}</button></li>)}</ul>
          </div>
          <div>
            <h2>{t("admin.tags")}</h2>
            <form className="form-row" onSubmit={submitTag}><input aria-label={t("admin.newTag")} value={tagName} onChange={(event) => setTagName(event.target.value)} required /><button type="submit" disabled={addTag.isPending}>{t("common.add")}</button></form>
            <ul className="admin-list compact-list">{tags.data?.items.map((tag) => <li className="panel" key={tag.id}><span>{tag.name}</span><button type="button" disabled={removeTag.isPending} onClick={() => removeTag.mutate(tag.id)}>{t("common.remove")}</button></li>)}</ul>
          </div>
        </section>
      </main>
    </AdminGate>
  );
}

export const Route = createFileRoute("/admin/categories")({ component: AdminCategoriesPage });
