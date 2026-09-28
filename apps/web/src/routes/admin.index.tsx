import { createFileRoute, Link } from "@tanstack/react-router";
import { FolderTree, Settings, Users } from "lucide-react";
import { AdminGate } from "../features/auth/admin-gate";
import { useTranslation } from "react-i18next";

function AdminIndexPage() {
  const { t } = useTranslation();
  const destinations = [
    { to: "/admin/users" as const, title: t("admin.users"), description: t("admin.usersDescription"), icon: Users },
    { to: "/admin/categories" as const, title: t("admin.taxonomy"), description: t("admin.taxonomyDescription"), icon: FolderTree },
    { to: "/admin/settings" as const, title: t("admin.settings"), description: t("admin.settingsDescription"), icon: Settings },
  ];
  return (
    <AdminGate>
      <main className="shell">
        <header><p className="eyebrow">{t("admin.eyebrow")}</p><h1>{t("admin.title")}</h1><p>{t("admin.subtitle")}</p></header>
        <div className="admin-destinations">
          {destinations.map(({ to, title, description, icon: Icon }) => (
            <Link className="panel admin-destination" key={to} to={to}>
              <Icon aria-hidden="true" /><div><h2>{title}</h2><p>{description}</p></div>
            </Link>
          ))}
        </div>
      </main>
    </AdminGate>
  );
}

export const Route = createFileRoute("/admin/")({ component: AdminIndexPage });
