import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { Button } from "../components/ui/button";
import { AuthGate } from "../features/auth/auth-gate";
import { listTopics } from "../features/topics/api";

function TopicsPage() {
  const topics = useQuery({ queryKey: ["topics"], queryFn: listTopics });

  return (
    <AuthGate>
      <main className="shell">
        <header className="page-heading">
          <div>
            <p className="eyebrow">Private-first consensus</p>
            <h1>Topics</h1>
            <p>Collect viewpoints, reveal opinion groups, and find shared ground.</p>
          </div>
          <Button asChild><Link to="/topics/new"><Plus aria-hidden="true" size={18} /> Start a topic</Link></Button>
        </header>
        <section aria-labelledby="topic-list-heading">
          <h2 id="topic-list-heading">Community topics</h2>
          {topics.isPending ? <p>Loading topics…</p> : null}
          {topics.error ? <p role="alert">{topics.error.message}</p> : null}
          {topics.data?.items.length === 0 ? (
            <div className="panel empty-state"><h2>No topics yet</h2><p>Create the first discussion for your community.</p></div>
          ) : null}
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
    </AuthGate>
  );
}

export const Route = createFileRoute("/topics/")({ component: TopicsPage });
