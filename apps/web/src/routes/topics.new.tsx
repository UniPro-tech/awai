import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { AuthGate } from "../features/auth/auth-gate";
import { listCategories } from "../features/taxonomy/api";
import { createTopic } from "../features/topics/api";

function NewTopicPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [authorVisibility, setAuthorVisibility] = useState<"IDENTIFIED" | "ANONYMOUS">("IDENTIFIED");
  const [statementIdentityPolicy, setStatementIdentityPolicy] = useState<"OPTIONAL" | "ANONYMOUS_REQUIRED" | "IDENTIFIED_REQUIRED">("OPTIONAL");
  const [categoryId, setCategoryId] = useState("");
  const [tags, setTags] = useState("");
  const categories = useQuery({ queryKey: ["categories"], queryFn: listCategories });
  const create = useMutation({
    mutationFn: createTopic,
    onSuccess: async (topic) => {
      await queryClient.invalidateQueries({ queryKey: ["topics"] });
      await navigate({ to: "/topics/$topicId", params: { topicId: topic.id } });
    },
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    create.mutate({
      title,
      description,
      authorVisibility,
      statementIdentityPolicy,
      categoryId: categoryId || null,
      tags: tags.split(",").map((tag) => tag.trim()).filter(Boolean),
    });
  }

  return (
    <AuthGate>
      <main className="shell narrow-shell">
        <nav className="breadcrumb"><Link to="/topics">Topics</Link> / New topic</nav>
        <header><p className="eyebrow">Start a discussion</p><h1>New topic</h1><p>Define the question and how participant identities should appear.</p></header>
        <section className="panel" aria-labelledby="create-topic-heading">
          <h2 id="create-topic-heading">Topic details</h2>
          <form onSubmit={submit} className="stack">
            <label htmlFor="topic-title">Title</label>
            <input id="topic-title" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={200} required autoFocus />
            <label htmlFor="topic-description">Description</label>
            <textarea id="topic-description" value={description} onChange={(event) => setDescription(event.target.value)} maxLength={10000} />
            <label htmlFor="topic-category">Category</label>
            <select id="topic-category" value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>
              <option value="">No category</option>
              {categories.data?.items.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
            </select>
            <label htmlFor="topic-tags">Tags (comma-separated)</label>
            <input id="topic-tags" value={tags} onChange={(event) => setTags(event.target.value)} />
            <label htmlFor="topic-author-visibility">Topic author</label>
            <select id="topic-author-visibility" value={authorVisibility} onChange={(event) => setAuthorVisibility(event.target.value as typeof authorVisibility)}>
              <option value="IDENTIFIED">Show my display name</option><option value="ANONYMOUS">Anonymous</option>
            </select>
            <label htmlFor="statement-policy">Statement identity policy</label>
            <select id="statement-policy" value={statementIdentityPolicy} onChange={(event) => setStatementIdentityPolicy(event.target.value as typeof statementIdentityPolicy)}>
              <option value="OPTIONAL">Authors choose</option><option value="ANONYMOUS_REQUIRED">Anonymous required</option><option value="IDENTIFIED_REQUIRED">Display name required</option>
            </select>
            <button type="submit" disabled={create.isPending}>{create.isPending ? "Creating…" : "Create topic"}</button>
            {create.error ? <p role="alert">{create.error.message}</p> : null}
          </form>
        </section>
      </main>
    </AuthGate>
  );
}

export const Route = createFileRoute("/topics/new")({ component: NewTopicPage });
