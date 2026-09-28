import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { AuthGate } from "../features/auth/auth-gate";
import { authClient } from "../features/auth/client";
import { createTopic, listTopics } from "../features/topics/api";
import { listCategories } from "../features/taxonomy/api";

export function TopicsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [authorVisibility, setAuthorVisibility] = useState<"IDENTIFIED" | "ANONYMOUS">("IDENTIFIED");
  const [statementIdentityPolicy, setStatementIdentityPolicy] = useState<
    "OPTIONAL" | "ANONYMOUS_REQUIRED" | "IDENTIFIED_REQUIRED"
  >("OPTIONAL");
  const [categoryId, setCategoryId] = useState("");
  const [tags, setTags] = useState("");
  const topics = useQuery({ queryKey: ["topics"], queryFn: listTopics });
  const categories = useQuery({ queryKey: ["categories"], queryFn: listCategories });
  const create = useMutation({
    mutationFn: createTopic,
    onSuccess: async () => {
      setTitle("");
      setDescription("");
      setTags("");
      await queryClient.invalidateQueries({ queryKey: ["topics"] });
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

  return <AuthGate>
    <main className="shell">
      <header>
        <button
          className="button-link sign-out"
          type="button"
          onClick={async () => {
            await authClient.signOut();
            await navigate({ to: "/login" });
          }}
        >
          Sign out
        </button>
        <Link className="admin-link" to="/admin">Administration</Link>
        <p className="eyebrow">Private-first consensus</p>
        <h1>Topics</h1>
        <p>Collect viewpoints, reveal opinion groups, and find shared ground.</p>
      </header>

      <section className="panel" aria-labelledby="create-topic-heading">
        <h2 id="create-topic-heading">Start a topic</h2>
        <form onSubmit={submit} className="stack">
          <label htmlFor="topic-title">Title</label>
          <input id="topic-title" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={200} required />
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
            <option value="IDENTIFIED">Show my display name</option>
            <option value="ANONYMOUS">Anonymous</option>
          </select>
          <label htmlFor="statement-policy">Statement identity policy</label>
          <select id="statement-policy" value={statementIdentityPolicy} onChange={(event) => setStatementIdentityPolicy(event.target.value as typeof statementIdentityPolicy)}>
            <option value="OPTIONAL">Authors choose</option>
            <option value="ANONYMOUS_REQUIRED">Anonymous required</option>
            <option value="IDENTIFIED_REQUIRED">Display name required</option>
          </select>
          <button type="submit" disabled={create.isPending}>Create</button>
          {create.error ? <p role="alert">{create.error.message}</p> : null}
        </form>
      </section>

      <section aria-labelledby="topic-list-heading">
        <h2 id="topic-list-heading">Open topics</h2>
        {topics.isPending ? <p>Loading topics…</p> : null}
        {topics.error ? <p role="alert">{topics.error.message}</p> : null}
        {topics.data?.items.length === 0 ? <p>No topics yet.</p> : null}
        <ul className="topic-list">
          {topics.data?.items.map((topic) => (
            <li key={topic.id} className="panel">
              <h3><Link to="/topics/$topicId" params={{ topicId: topic.id }}>{topic.title}</Link></h3>
              <p>{topic.description || "No description provided."}</p>
              {topic.category ? <p className="meta">Category: {topic.category.name}</p> : null}
              {topic.tags.length > 0 ? <div className="tag-list">{topic.tags.map((tag) => <span key={tag.id}>{tag.name}</span>)}</div> : null}
              <span>{topic.author.visibility === "ANONYMOUS" ? "Anonymous author" : topic.author.displayName}</span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  </AuthGate>;
}
