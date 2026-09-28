import { createFileRoute, Link } from "@tanstack/react-router";
import { AdminGate } from "../features/auth/admin-gate";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { getPublicConfig } from "../features/auth/config-api";

function AdminSettingsPage() {
  const { t } = useTranslation();
  const config = useQuery({ queryKey: ["public-config"], queryFn: getPublicConfig });
  return (
    <AdminGate>
      <main className="shell narrow-shell">
        <nav className="breadcrumb"><Link to="/admin">{t("admin.eyebrow")}</Link> / {t("admin.settings")}</nav>
        <header><p className="eyebrow">{t("admin.eyebrow")}</p><h1>{t("admin.settings")}</h1><p>{t("admin.settingsSubtitle")}</p></header>
        <section className="panel settings-list" aria-labelledby="identity-heading">
          <h2 id="identity-heading">{t("admin.identity")}</h2>
          <p>{t(config.data?.localAuthEnabled === false ? "admin.identitySsoOnly" : "admin.identityBody")}</p>
          <p className="meta">{t("admin.identityHelp")}</p>
        </section>
        <section className="panel settings-list" aria-labelledby="deployment-heading">
          <h2 id="deployment-heading">{t("admin.deployment")}</h2>
          <dl>
            <div><dt>{t("admin.browserAuth")}</dt><dd>{t("admin.sessionCookie")}</dd></div>
            <div><dt>{t("admin.originPolicy")}</dt><dd>{t("admin.exactOrigin")}</dd></div>
            <div><dt>{t("admin.voteVisibility")}</dt><dd>{t("admin.aggregatesOnly")}</dd></div>
          </dl>
        </section>
      </main>
    </AdminGate>
  );
}

export const Route = createFileRoute("/admin/settings")({ component: AdminSettingsPage });
