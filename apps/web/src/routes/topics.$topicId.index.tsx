import type { StatementResponse } from "@private-polis/contracts";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { getLatestAnalysis } from "../features/analysis/api";
import { OpinionMap } from "../features/analysis/opinion-map";
import { AuthGate } from "../features/auth/auth-gate";
import { createStatement, listStatements } from "../features/statements/api";
import { getTopic } from "../features/topics/api";
import {
  getCurrentVote,
  getVoteStatistics,
  listCurrentTopicVotes,
  setVote,
} from "../features/votes/api";
import { orderStatementsForVoting } from "../features/votes/voting-order";
import { errorMessage } from "../lib/error-message";
import "./topic-voting.css";

type VoteValue = "AGREE" | "DISAGREE" | "PASS";

function StatementCard({
  statement,
  onAnswered,
}: {
  statement: StatementResponse;
  onAnswered: () => void;
}) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const currentVote = useQuery({
    queryKey: ["current-vote", statement.id],
    queryFn: () => getCurrentVote(statement.id),
  });
  const statistics = useQuery({
    queryKey: ["vote-statistics", statement.id],
    queryFn: () => getVoteStatistics(statement.id),
    enabled: currentVote.data?.value !== null && currentVote.data !== undefined,
  });
  const vote = useMutation({
    mutationFn: (value: VoteValue) => setVote(statement.id, { value }),
    onSuccess: async (result) => {
      queryClient.setQueryData(["current-vote", statement.id], result);
      onAnswered();
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["vote-statistics", statement.id],
        }),
        queryClient.invalidateQueries({ queryKey: ["analysis", statement.topicId] }),
      ]);
    },
  });
  useEffect(() => {
    if (currentVote.data?.value) onAnswered();
  }, [currentVote.data?.value, onAnswered]);

  return (
    <article className="panel statement-card statement-card--focused">
      <p>{statement.body}</p>
      <p className="meta">{statement.author.visibility === "ANONYMOUS" ? t("common.anonymous") : statement.author.displayName}</p>
      <div className="vote-actions" aria-label={t("topic.voteLabel")}>
        {(["AGREE", "DISAGREE", "PASS"] as const).map((value) => (
          <button
            aria-pressed={currentVote.data?.value === value}
            className={currentVote.data?.value === value ? "is-selected" : undefined}
            key={value}
            type="button"
            onClick={() => vote.mutate(value)}
            disabled={vote.isPending || currentVote.isPending}
          >
            {value === "AGREE" ? t("topic.agree") : value === "DISAGREE" ? t("topic.disagree") : t("topic.pass")}
          </button>
        ))}
      </div>
      {currentVote.data?.value === null ? (
        <p className="meta vote-counts-locked">{t("topic.statsLocked")}</p>
      ) : null}
      {statistics.data ? <p className="meta">{t("topic.stats", statistics.data)}</p> : null}
      {vote.error ? <p role="alert">{errorMessage(vote.error, t)}</p> : null}
    </article>
  );
}

function TopicPage() {
  const { t } = useTranslation();
  const { topicId } = Route.useParams();
  const queryClient = useQueryClient();
  const [body, setBody] = useState("");
  const [visibility, setVisibility] = useState<"IDENTIFIED" | "ANONYMOUS">("ANONYMOUS");
  const [statementIndex, setStatementIndex] = useState(0);
  const [hasAnswered, setHasAnswered] = useState(false);
  const markAnswered = useCallback(() => setHasAnswered(true), []);
  const topic = useQuery({ queryKey: ["topic", topicId], queryFn: () => getTopic(topicId) });
  const statements = useQuery({
    queryKey: ["statements", topicId],
    queryFn: async () => {
      const [statementList, currentVotes] = await Promise.all([
        listStatements(topicId),
        listCurrentTopicVotes(topicId),
      ]);
      const votedStatementIds = new Set(
        currentVotes.items.map(({ statementId }) => statementId),
      );
      return {
        ...statementList,
        items: orderStatementsForVoting(statementList.items, votedStatementIds),
        hasExistingVote: votedStatementIds.size > 0,
      };
    },
  });
  const analysis = useQuery({
    queryKey: ["analysis", topicId, "latest"],
    queryFn: () => getLatestAnalysis(topicId),
    enabled: hasAnswered,
    retry: false,
    refetchInterval: hasAnswered ? 5_000 : false,
  });
  const create = useMutation({
    mutationFn: () => {
      const authorVisibility = topic.data?.statementIdentityPolicy === "ANONYMOUS_REQUIRED"
        ? "ANONYMOUS"
        : topic.data?.statementIdentityPolicy === "IDENTIFIED_REQUIRED"
          ? "IDENTIFIED"
          : visibility;
      return createStatement(topicId, { body, authorVisibility });
    },
    onSuccess: async () => {
      setBody("");
      await queryClient.invalidateQueries({ queryKey: ["statements", topicId] });
    },
  });
  useEffect(() => {
    if (statements.data?.hasExistingVote) setHasAnswered(true);
  }, [statements.data?.hasExistingVote]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    create.mutate();
  }

  const statementItems = statements.data?.items ?? [];
  const currentStatement = statementItems[statementIndex];

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
            <p id="statement-body-help" className="field-help">
              {t("topic.statementHelp")}
            </p>
            <textarea
              id="statement-body"
              aria-describedby="statement-body-help"
              value={body}
              onChange={(event) => setBody(event.target.value)}
              maxLength={5000}
              required
            />
            {topic.data?.statementIdentityPolicy === "OPTIONAL" ? (
              <>
                <label htmlFor="statement-visibility">{t("topic.authorVisibility")}</label>
                <select id="statement-visibility" value={visibility} onChange={(event) => setVisibility(event.target.value as typeof visibility)}>
                  <option value="ANONYMOUS">{t("common.anonymous")}</option><option value="IDENTIFIED">{t("common.identified")}</option>
                </select>
              </>
            ) : topic.data?.statementIdentityPolicy ? (
              <div className="identity-policy-field">
                <span>{t("topic.authorVisibility")}</span>
                <p className="identity-policy-value">
                  {t(
                    topic.data.statementIdentityPolicy === "ANONYMOUS_REQUIRED"
                      ? "topic.anonymousRequiredNotice"
                      : "topic.identifiedRequiredNotice",
                  )}
                </p>
              </div>
            ) : null}
            <button type="submit" disabled={create.isPending || !topic.data}>{t("topic.add")}</button>
            {create.error ? <p role="alert">{errorMessage(create.error, t)}</p> : null}
          </form>
        </section>

        <section className="voting-flow" aria-labelledby="statements-heading">
          <div className="voting-flow__heading">
            <div>
              <p className="eyebrow">{t("topic.votingEyebrow")}</p>
              <h2 id="statements-heading">{t("topic.statements")}</h2>
            </div>
            {statementItems.length > 0 ? (
              <p className="meta">
                {t("topic.statementProgress", {
                  current: statementIndex + 1,
                  total: statementItems.length,
                })}
              </p>
            ) : null}
          </div>
          {statements.isPending ? <p>{t("topic.loading")}</p> : null}
          {statements.error ? <p role="alert">{errorMessage(statements.error, t)}</p> : null}
          {statementItems.length === 0 ? <p>{t("topic.empty")}</p> : null}
          {currentStatement ? (
            <StatementCard
              key={currentStatement.id}
              statement={currentStatement}
              onAnswered={markAnswered}
            />
          ) : null}
          {statementItems.length > 1 ? (
            <div className="statement-pager" aria-label={t("topic.statementNavigation")}>
              <button
                className="secondary"
                type="button"
                onClick={() => setStatementIndex((index) => Math.max(0, index - 1))}
                disabled={statementIndex === 0}
              >
                {t("topic.previousStatement")}
              </button>
              <div className="statement-pager__track" aria-hidden="true">
                <span
                  style={{
                    width: `${((statementIndex + 1) / statementItems.length) * 100}%`,
                  }}
                />
              </div>
              <button
                type="button"
                onClick={() =>
                  setStatementIndex((index) =>
                    Math.min(statementItems.length - 1, index + 1),
                  )
                }
                disabled={statementIndex === statementItems.length - 1}
              >
                {t("topic.nextStatement")}
              </button>
            </div>
          ) : null}
        </section>

        {hasAnswered ? (
          <section className="panel position-preview" aria-labelledby="position-heading">
            <div>
              <p className="eyebrow">{t("analysis.yourPositionEyebrow")}</p>
              <h2 id="position-heading">{t("analysis.yourPosition")}</h2>
              <p>{t("analysis.yourPositionHelp")}</p>
            </div>
            {analysis.data ? (
              <>
                <OpinionMap
                  compact
                  points={analysis.data.points}
                  groups={analysis.data.groups}
                  viewerPoint={analysis.data.viewerPoint}
                />
                {!analysis.data.viewerPoint ? (
                  <p className="meta">{t("analysis.positionLearning")}</p>
                ) : null}
              </>
            ) : (
              <p className="meta">{t("analysis.positionPending")}</p>
            )}
          </section>
        ) : null}
      </main>
    </AuthGate>
  );
}

export const Route = createFileRoute("/topics/$topicId/")({ component: TopicPage });
