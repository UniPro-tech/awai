import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { AuthGate } from "../features/auth/auth-gate";
import { changeTopicOwner, getTopic, updateTopic } from "../features/topics/api";

function TopicSettingsPage() {
  const { topicId } = Route.useParams();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<"DRAFT" | "OPEN" | "CLOSED" | "ARCHIVED">("OPEN");
  const [policy, setPolicy] = useState<"OPTIONAL" | "ANONYMOUS_REQUIRED" | "IDENTIFIED_REQUIRED">("OPTIONAL");
  const [ownerUserId, setOwnerUserId] = useState("");
  const topic = useQuery({ queryKey: ["topic", topicId], queryFn: () => getTopic(topicId) });
  const update = useMutation({
    mutationFn: () => updateTopic(topicId, { status, statementIdentityPolicy: policy }),
    onSuccess: async () => queryClient.invalidateQueries({ queryKey: ["topic", topicId] }),
  });
  const transfer = useMutation({
    mutationFn: () => changeTopicOwner(topicId, { ownerUserId }),
    onSuccess: async () => {
      setOwnerUserId("");
      await queryClient.invalidateQueries({ queryKey: ["topic", topicId] });
    },
  });

  useEffect(() => {
    if (!topic.data) return;
    setStatus(topic.data.status);
    setPolicy(topic.data.statementIdentityPolicy);
  }, [topic.data]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    update.mutate();
  }

  function submitTransfer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    transfer.mutate();
  }

  return (
    <AuthGate>
      <main className="shell narrow-shell">
        <nav className="breadcrumb"><Link to="/topics">Topics</Link> / <Link to="/topics/$topicId" params={{ topicId }}>Discussion</Link> / Settings</nav>
        <header><p className="eyebrow">Topic owner controls</p><h1>Topic settings</h1><p>Only the topic owner or an administrator can change these values.</p></header>
        <section className="panel" aria-labelledby="behavior-heading">
          <h2 id="behavior-heading">Discussion behavior</h2>
          <form className="stack" onSubmit={submit}>
            <label htmlFor="topic-status">Status</label>
            <select id="topic-status" value={status} onChange={(event) => setStatus(event.target.value as typeof status)}>
              <option value="DRAFT">Draft</option><option value="OPEN">Open</option><option value="CLOSED">Closed</option><option value="ARCHIVED">Archived</option>
            </select>
            <label htmlFor="topic-statement-policy">Statement identity policy</label>
            <select id="topic-statement-policy" value={policy} onChange={(event) => setPolicy(event.target.value as typeof policy)}>
              <option value="OPTIONAL">Authors choose</option><option value="ANONYMOUS_REQUIRED">Anonymous required</option><option value="IDENTIFIED_REQUIRED">Display name required</option>
            </select>
            <button type="submit" disabled={update.isPending}>{update.isPending ? "Saving…" : "Save settings"}</button>
            {update.isSuccess ? <p role="status">Settings saved.</p> : null}
            {update.error ? <p role="alert">{update.error.message}</p> : null}
          </form>
        </section>
        <section className="panel danger-panel" aria-labelledby="ownership-heading">
          <h2 id="ownership-heading">Transfer ownership</h2>
          <p className="meta">Enter the UUID of an active member. This action is recorded in the audit log.</p>
          <form className="stack" onSubmit={submitTransfer}>
            <label htmlFor="owner-user-id">New owner user ID</label>
            <input id="owner-user-id" value={ownerUserId} onChange={(event) => setOwnerUserId(event.target.value)} required pattern="[0-9a-fA-F-]{36}" />
            <button type="submit" disabled={transfer.isPending}>Transfer ownership</button>
            {transfer.isSuccess ? <p role="status">Ownership transferred.</p> : null}
            {transfer.error ? <p role="alert">{transfer.error.message}</p> : null}
          </form>
        </section>
      </main>
    </AuthGate>
  );
}

export const Route = createFileRoute("/topics/$topicId/settings")({ component: TopicSettingsPage });
