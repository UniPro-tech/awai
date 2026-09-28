import type { StatementResponse } from "@private-polis/contracts";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { AuthGate } from "../features/auth/auth-gate";
import { createStatement, listStatements } from "../features/statements/api";
import { getTopic } from "../features/topics/api";
import { getVoteStatistics, setVote } from "../features/votes/api";
import { errorMessage } from "../lib/error-message";

type VoteValue = "AGREE" | "DISAGREE" | "PASS";

function StatementCard({ statement }: { statement: StatementResponse }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const statistics = useQuery({ queryKey: ["vote-statistics", statement.id], queryFn: () => getVoteStatistics(statement.id) });
  const vote = useMutation({
    mutationFn: (value: VoteValue) => setVote(statement.id, { value }),
    onSuccess: async () => queryClient.invalidateQueries({ queryKey: ["vote-statistics", statement.id] }),
  });
  return (
    <li className="panel statement-card">
      <p>{statement.body}</p>
      <p className="meta">{statement.author.visibility === "ANONYMOUS" ? t("common.anonymous") : statement.author.displayName}</p>
      <div className="vote-actions" aria-label={t("topic.voteLabel")}>
        {(["AGREE", "DISAGREE", "PASS"] as const).map((value) => (
          <button key={value} type="button" onClick={() => vote.mutate(value)} disabled={vote.isPending}>
            {value === "AGREE" ? t("topic.agree") : value === "DISAGREE" ? t("topic.disagree") : t("topic.pass")}
          </button>
        ))}
      </div>
      {statistics.data ? <p className="meta">{t("topic.stats", statistics.data)}</p> : null}
      {vote.error ? <p role="alert">{errorMessage(vote.error, t)}</p> : null}
    </li>
  );
}

function TopicPage() {
  const { t } = useTranslation();
  const { topicId } = Route.useParams();
  const queryClient = useQueryClient();
  const [body, setBody] = useState("");
  const [visibility, setVisibility] = useState<"IDENTIFIED" | "ANONYMOUS">("ANONYMOUS");
  const topic = useQuery({ queryKey: ["topic", topicId], queryFn: () => getTopic(topicId) });
  const statements = useQuery({ queryKey: ["statements", topicId], queryFn: () => listStatements(topicId) });
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
        <nav className="breadcrumb"><Link to="/topics">{t("common.topics")}</Link> / {t("common.discussion")}</nav>
        {topic.isPending ? <p>{t("common.loading")}</p> : null}
        {topic.error ? <p role="alert">{errorMessage(topic.error, t)}</p> : null}
        {topic.data ? (
          <header>
            <p className="eyebrow">{t(`common.status.${topic.data.status}`)}</p>
            <h1>{topic.data.title}</h1>
            <p>{topic.data.description || t("common.noDescription")}</p>
            {topic.data.category ? <p className="meta">{t("topics.category")}: {topic.data.category.name}</p> : null}
            {topic.data.tags.length > 0 ? <div className="tag-list">{topic.data.tags.map((tag) => <span key={tag.id}>{tag.name}</span>)}</div> : null}
            <div className="link-row">
              <Link className="text-link" to="/topics/$topicId/results" params={{ topicId }}>{t("topic.analysis")}</Link>
              <Link className="text-link" to="/topics/$topicId/settings" params={{ topicId }}>{t("topic.settings")}</Link>
            </div>
          </header>
        ) : null}

        <section className="panel" aria-labelledby="new-statement-heading">
          <h2 id="new-statement-heading">{t("topic.addHeading")}</h2>
          <form className="stack" onSubmit={submit}>
            <label htmlFor="statement-body">{t("topic.statement")}</label>
            <textarea id="statement-body" value={body} onChange={(event) => setBody(event.target.value)} maxLength={5000} required />
            <label htmlFor="statement-visibility">{t("topic.authorVisibility")}</label>
            <select id="statement-visibility" value={visibility} onChange={(event) => setVisibility(event.target.value as typeof visibility)}>
              <option value="ANONYMOUS">{t("common.anonymous")}</option><option value="IDENTIFIED">{t("common.identified")}</option>
            </select>
            <button type="submit" disabled={create.isPending}>{t("topic.add")}</button>
            {create.error ? <p role="alert">{errorMessage(create.error, t)}</p> : null}
          </form>
        </section>

        <section aria-labelledby="statements-heading">
          <h2 id="statements-heading">{t("topic.statements")}</h2>
          {statements.isPending ? <p>{t("topic.loading")}</p> : null}
          {statements.error ? <p role="alert">{errorMessage(statements.error, t)}</p> : null}
          {statements.data?.items.length === 0 ? <p>{t("topic.empty")}</p> : null}
          <ul className="topic-list">{statements.data?.items.map((statement) => <StatementCard key={statement.id} statement={statement} />)}</ul>
        </section>
      </main>
    </AuthGate>
  );
}

export const Route = createFileRoute("/topics/$topicId/")({ component: TopicPage });
