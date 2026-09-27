import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FormEvent, useState } from "react";
import { createTopic, listTopics } from "../features/topics/api";

export function TopicsPage() {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const topics = useQuery({ queryKey: ["topics"], queryFn: listTopics });
  const create = useMutation({
    mutationFn: createTopic,
    onSuccess: async () => {
      setTitle("");
      await queryClient.invalidateQueries({ queryKey: ["topics"] });
    },
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    create.mutate({
      title,
      description: "",
      authorVisibility: "IDENTIFIED",
      statementIdentityPolicy: "OPTIONAL",
      categoryId: null,
      tags: [],
    });
  }

  return (
    <main className="shell">
      <header>
        <p className="eyebrow">Private-first consensus</p>
        <h1>Topics</h1>
        <p>Collect viewpoints, reveal opinion groups, and find shared ground.</p>
      </header>

      <section className="panel" aria-labelledby="create-topic-heading">
        <h2 id="create-topic-heading">Start a topic</h2>
        <form onSubmit={submit}>
          <label htmlFor="topic-title">Title</label>
          <div className="form-row">
            <input
              id="topic-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={200}
              required
            />
            <button type="submit" disabled={create.isPending}>Create</button>
          </div>
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
              <h3>{topic.title}</h3>
              <p>{topic.description || "No description provided."}</p>
              <span>{topic.author.visibility === "ANONYMOUS" ? "Anonymous author" : topic.author.displayName}</span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
