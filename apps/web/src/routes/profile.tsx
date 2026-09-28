import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getCurrentUser } from "../features/auth/api";
import { AuthGate } from "../features/auth/auth-gate";
import { authClient } from "../features/auth/client";
import { useTranslation } from "react-i18next";

function ProfilePage() {
  const { t } = useTranslation();
  const session = authClient.useSession();
  const currentUser = useQuery({ queryKey: ["current-user"], queryFn: getCurrentUser });
  const navigate = useNavigate();
  const user = session.data?.user;

  return (
    <AuthGate>
      <main className="shell narrow-shell">
        <header><p className="eyebrow">{t("profile.eyebrow")}</p><h1>{t("profile.title")}</h1><p>{t("profile.subtitle")}</p></header>
        {user ? (
          <section className="panel profile-details" aria-labelledby="profile-details-heading">
            <h2 id="profile-details-heading">{t("profile.details")}</h2>
            <dl>
              <div><dt>{t("profile.displayName")}</dt><dd>{user.name}</dd></div>
              <div><dt>{t("profile.email")}</dt><dd>{user.email}</dd></div>
              <div><dt>{t("profile.role")}</dt><dd>{currentUser.data ? t(`common.role.${currentUser.data.role}`) : t("common.loading")}</dd></div>
              <div><dt>{t("profile.userId")}</dt><dd><code>{currentUser.data?.id ?? t("common.loading")}</code></dd></div>
            </dl>
            <button type="button" onClick={async () => {
              await authClient.signOut();
              await navigate({ to: "/login" });
            }}>{t("profile.signOut")}</button>
          </section>
        ) : null}
      </main>
    </AuthGate>
  );
}

export const Route = createFileRoute("/profile")({ component: ProfilePage });
