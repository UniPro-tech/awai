import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { AuthGate } from "../features/auth/auth-gate";
import { changeTopicOwner, getTopic, updateTopic } from "../features/topics/api";
import { errorMessage } from "../lib/error-message";

function TopicSettingsPage() {
  const { topicId } = Route.useParams();
  const { t } = useTranslation();
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
        <nav className="breadcrumb"><Link to="/topics">{t("common.topics")}</Link> / <Link to="/topics/$topicId" params={{ topicId }}>{t("common.discussion")}</Link> / {t("common.settings")}</nav>
        <header><p className="eyebrow">{t("topicSettings.eyebrow")}</p><h1>{t("topicSettings.title")}</h1><p>{t("topicSettings.subtitle")}</p></header>
        <section className="panel" aria-labelledby="behavior-heading">
          <h2 id="behavior-heading">{t("topicSettings.behavior")}</h2>
          <form className="stack" onSubmit={submit}>
            <label htmlFor="topic-status">{t("common.statusLabel")}</label>
            <select id="topic-status" value={status} onChange={(event) => setStatus(event.target.value as typeof status)}>
              <option value="DRAFT">{t("common.status.DRAFT")}</option><option value="OPEN">{t("common.status.OPEN")}</option><option value="CLOSED">{t("common.status.CLOSED")}</option><option value="ARCHIVED">{t("common.status.ARCHIVED")}</option>
            </select>
            <label htmlFor="topic-statement-policy">{t("topicSettings.identityPolicy")}</label>
            <select id="topic-statement-policy" value={policy} onChange={(event) => setPolicy(event.target.value as typeof policy)}>
              <option value="OPTIONAL">{t("newTopic.chooseIdentity")}</option><option value="ANONYMOUS_REQUIRED">{t("newTopic.anonymousRequired")}</option><option value="IDENTIFIED_REQUIRED">{t("newTopic.identifiedRequired")}</option>
            </select>
            <button type="submit" disabled={update.isPending}>{update.isPending ? t("common.saving") : t("common.save")}</button>
            {update.isSuccess ? <p role="status">{t("topicSettings.saved")}</p> : null}
            {update.error ? <p role="alert">{errorMessage(update.error, t)}</p> : null}
          </form>
        </section>
        <section className="panel danger-panel" aria-labelledby="ownership-heading">
          <h2 id="ownership-heading">{t("topicSettings.transfer")}</h2>
          <p className="meta">{t("topicSettings.transferHelp")}</p>
          <form className="stack" onSubmit={submitTransfer}>
            <label htmlFor="owner-user-id">{t("topicSettings.newOwner")}</label>
            <input id="owner-user-id" value={ownerUserId} onChange={(event) => setOwnerUserId(event.target.value)} required pattern="[0-9a-fA-F-]{36}" />
            <button type="submit" disabled={transfer.isPending}>{t("topicSettings.transferAction")}</button>
            {transfer.isSuccess ? <p role="status">{t("topicSettings.transferred")}</p> : null}
            {transfer.error ? <p role="alert">{errorMessage(transfer.error, t)}</p> : null}
          </form>
        </section>
      </main>
    </AuthGate>
  );
}

export const Route = createFileRoute("/topics/$topicId/settings")({ component: TopicSettingsPage });
