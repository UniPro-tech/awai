import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { listAdminUsers, updateAdminUser } from "../features/admin/api";
import { AuthGate } from "../features/auth/auth-gate";
import {
  createCategory,
  createTag,
  deleteCategory,
  deleteTag,
  listCategories,
  listTags,
} from "../features/taxonomy/api";

export function AdminPage() {
  const queryClient = useQueryClient();
  const [categoryName, setCategoryName] = useState("");
  const [tagName, setTagName] = useState("");
  const users = useQuery({ queryKey: ["admin", "users"], queryFn: listAdminUsers, retry: false });
  const categories = useQuery({ queryKey: ["categories"], queryFn: listCategories });
  const tags = useQuery({ queryKey: ["tags"], queryFn: listTags });
  const updateUser = useMutation({
    mutationFn: ({ id, input }: { id: string; input: { role?: "USER" | "ADMIN"; suspended?: boolean } }) =>
      updateAdminUser(id, input),
    onSuccess: async () => queryClient.invalidateQueries({ queryKey: ["admin", "users"] }),
  });
  const addCategory = useMutation({
    mutationFn: createCategory,
    onSuccess: async () => {
      setCategoryName("");
      await queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
  });
  const addTag = useMutation({
    mutationFn: createTag,
    onSuccess: async () => {
      setTagName("");
      await queryClient.invalidateQueries({ queryKey: ["tags"] });
    },
  });
  const removeCategory = useMutation({
    mutationFn: deleteCategory,
    onSuccess: async () => queryClient.invalidateQueries({ queryKey: ["categories"] }),
  });
  const removeTag = useMutation({
    mutationFn: deleteTag,
    onSuccess: async () => queryClient.invalidateQueries({ queryKey: ["tags"] }),
  });

  function submitCategory(event: FormEvent) {
    event.preventDefault();
    addCategory.mutate(categoryName);
  }

  function submitTag(event: FormEvent) {
    event.preventDefault();
    addTag.mutate(tagName);
  }

  return (
    <AuthGate>
      <main className="shell">
        <nav className="breadcrumb"><Link to="/topics">Topics</Link> / Administration</nav>
        <header>
          <p className="eyebrow">Administration</p>
          <h1>Community settings</h1>
        </header>
        {users.error ? <p role="alert">{users.error.message}</p> : null}
        {users.data ? (
          <section aria-labelledby="users-heading">
            <h2 id="users-heading">Users</h2>
            <div className="admin-list">
              {users.data.items.map((user) => (
                <article className="panel admin-row" key={user.id}>
                  <div><strong>{user.displayName}</strong><p className="meta">{user.suspended ? "Suspended" : "Active"}</p></div>
                  <select
                    aria-label={`Role for ${user.displayName}`}
                    value={user.role}
                    onChange={(event) => updateUser.mutate({ id: user.id, input: { role: event.target.value as "USER" | "ADMIN" } })}
                  >
                    <option value="USER">User</option>
                    <option value="ADMIN">Administrator</option>
                  </select>
                  <button type="button" onClick={() => updateUser.mutate({ id: user.id, input: { suspended: !user.suspended } })}>
                    {user.suspended ? "Restore access" : "Suspend"}
                  </button>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        <section className="taxonomy-grid">
          <div>
            <h2>Categories</h2>
            <form className="form-row" onSubmit={submitCategory}>
              <input aria-label="New category" value={categoryName} onChange={(event) => setCategoryName(event.target.value)} required />
              <button type="submit">Add</button>
            </form>
            <ul className="admin-list compact-list">
              {categories.data?.items.map((category) => (
                <li className="panel" key={category.id}><span>{category.name}</span><button type="button" onClick={() => removeCategory.mutate(category.id)}>Remove</button></li>
              ))}
            </ul>
          </div>
          <div>
            <h2>Tags</h2>
            <form className="form-row" onSubmit={submitTag}>
              <input aria-label="New tag" value={tagName} onChange={(event) => setTagName(event.target.value)} required />
              <button type="submit">Add</button>
            </form>
            <ul className="admin-list compact-list">
              {tags.data?.items.map((tag) => (
                <li className="panel" key={tag.id}><span>{tag.name}</span><button type="button" onClick={() => removeTag.mutate(tag.id)}>Remove</button></li>
              ))}
            </ul>
          </div>
        </section>
      </main>
    </AuthGate>
  );
}
