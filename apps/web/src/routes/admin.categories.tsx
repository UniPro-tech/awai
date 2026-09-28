import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { AdminGate } from "../features/auth/admin-gate";
import { createCategory, createTag, deleteCategory, deleteTag, listCategories, listTags } from "../features/taxonomy/api";

function AdminCategoriesPage() {
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
        <nav className="breadcrumb"><Link to="/admin">Administration</Link> / Categories and tags</nav>
        <header><p className="eyebrow">Administration</p><h1>Categories and tags</h1><p>Taxonomy is shared across all topics and intentionally has no separate ACL.</p></header>
        {error ? <p role="alert">{error.message}</p> : null}
        <section className="taxonomy-grid">
          <div>
            <h2>Categories</h2>
            <form className="form-row" onSubmit={submitCategory}><input aria-label="New category" value={categoryName} onChange={(event) => setCategoryName(event.target.value)} required /><button type="submit" disabled={addCategory.isPending}>Add</button></form>
            <ul className="admin-list compact-list">{categories.data?.items.map((category) => <li className="panel" key={category.id}><span>{category.name}</span><button type="button" disabled={removeCategory.isPending} onClick={() => removeCategory.mutate(category.id)}>Remove</button></li>)}</ul>
          </div>
          <div>
            <h2>Tags</h2>
            <form className="form-row" onSubmit={submitTag}><input aria-label="New tag" value={tagName} onChange={(event) => setTagName(event.target.value)} required /><button type="submit" disabled={addTag.isPending}>Add</button></form>
            <ul className="admin-list compact-list">{tags.data?.items.map((tag) => <li className="panel" key={tag.id}><span>{tag.name}</span><button type="button" disabled={removeTag.isPending} onClick={() => removeTag.mutate(tag.id)}>Remove</button></li>)}</ul>
          </div>
        </section>
      </main>
    </AdminGate>
  );
}

export const Route = createFileRoute("/admin/categories")({ component: AdminCategoriesPage });
