import type { StatementResponse } from "@private-polis/contracts";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "@tanstack/react-router";
import { FormEvent, useState } from "react";
import { AuthGate } from "../features/auth/auth-gate";
import { createStatement, listStatements } from "../features/statements/api";
import { getTopic } from "../features/topics/api";
import { getVoteStatistics, setVote } from "../features/votes/api";

type VoteValue = "AGREE" | "DISAGREE" | "PASS";

function StatementCard({ statement }: { statement: StatementResponse }) {
  const queryClient = useQueryClient();
  const statistics = useQuery({
    queryKey: ["vote-statistics", statement.id],
    queryFn: () => getVoteStatistics(statement.id),
  });
  const vote = useMutation({
    mutationFn: (value: VoteValue) => setVote(statement.id, { value }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["vote-statistics", statement.id] });
    },
  });

  return (
    <li className="panel statement-card">
      <p>{statement.body}</p>
      <p className="meta">
        {statement.author.visibility === "ANONYMOUS"
          ? "Anonymous"
          : statement.author.displayName}
      </p>
      <div className="vote-actions" aria-label="Vote on this statement">
        {(["AGREE", "DISAGREE", "PASS"] as const).map((value) => (
          <button key={value} type="button" onClick={() => vote.mutate(value)} disabled={vote.isPending}>
            {value === "AGREE" ? "Agree" : value === "DISAGREE" ? "Disagree" : "Pass"}
          </button>
        ))}
      </div>
      {statistics.data ? (
        <p className="meta">
          {statistics.data.agree} agree · {statistics.data.disagree} disagree · {statistics.data.pass} pass
        </p>
      ) : null}
      {vote.error ? <p role="alert">{vote.error.message}</p> : null}
    </li>
  );
}

export function TopicPage() {
  const { topicId } = useParams({ from: "/topics/$topicId" });
  const queryClient = useQueryClient();
  const [body, setBody] = useState("");
  const [visibility, setVisibility] = useState<"IDENTIFIED" | "ANONYMOUS">("ANONYMOUS");
  const topic = useQuery({ queryKey: ["topic", topicId], queryFn: () => getTopic(topicId) });
  const statements = useQuery({
    queryKey: ["statements", topicId],
    queryFn: () => listStatements(topicId),
  });
  const create = useMutation({
    mutationFn: () => createStatement(topicId, { body, authorVisibility: visibility }),
    onSuccess: async () => {
      setBody("");
      await queryClient.invalidateQueries({ queryKey: ["statements", topicId] });
    },
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    create.mutate();
  }

  return (
    <AuthGate>
      <main className="shell">
        <nav className="breadcrumb"><Link to="/topics">Topics</Link> / Discussion</nav>
        {topic.isPending ? <p>Loading topic…</p> : null}
        {topic.error ? <p role="alert">{topic.error.message}</p> : null}
        {topic.data ? (
          <header>
            <p className="eyebrow">{topic.data.status}</p>
            <h1>{topic.data.title}</h1>
            <p>{topic.data.description || "No description provided."}</p>
            {topic.data.category ? <p className="meta">Category: {topic.data.category.name}</p> : null}
            {topic.data.tags.length > 0 ? <div className="tag-list">{topic.data.tags.map((tag) => <span key={tag.id}>{tag.name}</span>)}</div> : null}
            <Link className="text-link" to="/topics/$topicId/results" params={{ topicId }}>
              View analysis results
            </Link>
          </header>
        ) : null}

        <section className="panel" aria-labelledby="new-statement-heading">
          <h2 id="new-statement-heading">Add your viewpoint</h2>
          <form className="stack" onSubmit={submit}>
            <label htmlFor="statement-body">Statement</label>
            <textarea
              id="statement-body"
              value={body}
              onChange={(event) => setBody(event.target.value)}
              maxLength={5000}
              required
            />
            <label htmlFor="statement-visibility">Author visibility</label>
            <select
              id="statement-visibility"
              value={visibility}
              onChange={(event) => setVisibility(event.target.value as typeof visibility)}
            >
              <option value="ANONYMOUS">Anonymous</option>
              <option value="IDENTIFIED">Show my display name</option>
            </select>
            <button type="submit" disabled={create.isPending}>Add statement</button>
            {create.error ? <p role="alert">{create.error.message}</p> : null}
          </form>
        </section>

        <section aria-labelledby="statements-heading">
          <h2 id="statements-heading">Statements</h2>
          {statements.isPending ? <p>Loading statements…</p> : null}
          {statements.error ? <p role="alert">{statements.error.message}</p> : null}
          {statements.data?.items.length === 0 ? <p>No statements yet.</p> : null}
          <ul className="topic-list">
            {statements.data?.items.map((statement) => (
              <StatementCard key={statement.id} statement={statement} />
            ))}
          </ul>
        </section>
      </main>
    </AuthGate>
  );
}
