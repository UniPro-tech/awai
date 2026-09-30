import type { AuditAction } from "@private-polis/contracts";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { listAuditLogs } from "../features/admin/api";
import { AdminGate } from "../features/auth/admin-gate";
import { errorMessage } from "../lib/error-message";

const PAGE_SIZE = 25;

const auditActions: AuditAction[] = [
  "STATEMENT_DELETE",
  "STATEMENT_RESTORE",
  "TOPIC_DELETE",
  "TOPIC_RESTORE",
  "TOPIC_STATUS_CHANGE",
  "TOPIC_OWNER_CHANGE",
  "IDENTITY_POLICY_CHANGE",
  "ADMIN_ROLE_CHANGE",
  "USER_SUSPENSION_CHANGE",
];

function formatMetadataValue(value: unknown) {
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}

function AdminAuditLogsPage() {
  const { t, i18n } = useTranslation();
  const [action, setAction] = useState<AuditAction | undefined>();
  const [page, setPage] = useState(1);
  const logs = useQuery({
    queryKey: ["admin", "audit-logs", action ?? "all", page],
    queryFn: () => listAuditLogs({ action, page, pageSize: PAGE_SIZE }),
    retry: false,
  });

  return (
    <AdminGate>
      <main className="shell">
        <nav className="breadcrumb">
          <Link to="/admin">{t("admin.eyebrow")}</Link> / {t("admin.auditLogs")}
        </nav>
        <header>
          <p className="eyebrow">{t("admin.eyebrow")}</p>
          <h1>{t("admin.auditLogs")}</h1>
          <p>{t("admin.auditLogsSubtitle")}</p>
        </header>

        <div className="audit-toolbar">
          <label className="topic-filter">
            <span>{t("admin.auditActionFilter")}</span>
            <select
              value={action ?? ""}
              onChange={(event) => {
                setAction((event.target.value || undefined) as
                  | AuditAction
                  | undefined);
                setPage(1);
              }}
            >
              <option value="">{t("admin.allAuditActions")}</option>
              {auditActions.map((value) => (
                <option key={value} value={value}>
                  {t(`admin.auditActions.${value}`)}
                </option>
              ))}
            </select>
          </label>
          {logs.data ? (
            <p className="meta">
              {t("admin.auditLogCount", { count: logs.data.pagination.total })}
            </p>
          ) : null}
        </div>

        {logs.isPending ? <p>{t("admin.loadingAuditLogs")}</p> : null}
        {logs.error ? <p role="alert">{errorMessage(logs.error, t)}</p> : null}
        {logs.data?.items.length === 0 ? (
          <section className="panel empty-state">
            <h2>{t("admin.noAuditLogs")}</h2>
            <p>{t("admin.noAuditLogsDescription")}</p>
          </section>
        ) : null}

        <div className="audit-list">
          {logs.data?.items.map((entry) => {
            const metadata = Object.entries(entry.metadata);
            return (
              <article className="panel audit-entry" key={entry.id}>
                <header className="audit-entry-heading">
                  <strong>{t(`admin.auditActions.${entry.action}`)}</strong>
                  <time dateTime={entry.createdAt}>
                    {new Intl.DateTimeFormat(i18n.language, {
                      dateStyle: "medium",
                      timeStyle: "medium",
                    }).format(new Date(entry.createdAt))}
                  </time>
                </header>
                <dl className="audit-entry-summary">
                  <div>
                    <dt>{t("admin.auditActor")}</dt>
                    <dd>
                      {entry.actor?.displayName ?? t("admin.unknownAuditActor")}
                      {entry.actor ? <code>{entry.actor.id}</code> : null}
                    </dd>
                  </div>
                  <div>
                    <dt>{t("admin.auditTarget")}</dt>
                    <dd>
                      {t(`admin.auditEntities.${entry.entityType}`, {
                        defaultValue: entry.entityType,
                      })}
                      {entry.entityId ? <code>{entry.entityId}</code> : null}
                    </dd>
                  </div>
                </dl>
                {metadata.length > 0 ? (
                  <details className="audit-metadata">
                    <summary>{t("admin.auditDetails")}</summary>
                    <dl>
                      {metadata.map(([key, value]) => (
                        <div key={key}>
                          <dt>{key}</dt>
                          <dd>{formatMetadataValue(value)}</dd>
                        </div>
                      ))}
                    </dl>
                  </details>
                ) : null}
              </article>
            );
          })}
        </div>

        {logs.data && logs.data.pagination.totalPages > 1 ? (
          <nav className="audit-pagination" aria-label={t("admin.auditPagination")}>
            <button
              className="secondary-button"
              type="button"
              disabled={page <= 1 || logs.isFetching}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
            >
              {t("admin.previousPage")}
            </button>
            <span>
              {t("admin.auditPage", {
                page: logs.data.pagination.page,
                totalPages: logs.data.pagination.totalPages,
              })}
            </span>
            <button
              type="button"
              disabled={
                page >= logs.data.pagination.totalPages || logs.isFetching
              }
              onClick={() => setPage((current) => current + 1)}
            >
              {t("admin.nextPage")}
            </button>
          </nav>
        ) : null}
      </main>
    </AdminGate>
  );
}

export const Route = createFileRoute("/admin/audit-logs")({
  component: AdminAuditLogsPage,
});
