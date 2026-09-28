import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { listAdminUsers, updateAdminUser } from "../features/admin/api";
import { AdminGate } from "../features/auth/admin-gate";
import { useTranslation } from "react-i18next";
import { errorMessage } from "../lib/error-message";

function AdminUsersPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const users = useQuery({ queryKey: ["admin", "users"], queryFn: listAdminUsers, retry: false });
  const updateUser = useMutation({
    mutationFn: ({ id, input }: { id: string; input: { role?: "USER" | "ADMIN"; suspended?: boolean } }) => updateAdminUser(id, input),
    onSuccess: async () => queryClient.invalidateQueries({ queryKey: ["admin", "users"] }),
  });
  return (
    <AdminGate>
      <main className="shell">
        <nav className="breadcrumb"><Link to="/admin">{t("admin.eyebrow")}</Link> / {t("admin.users")}</nav>
        <header><p className="eyebrow">{t("admin.eyebrow")}</p><h1>{t("admin.users")}</h1><p>{t("admin.userSubtitle")}</p></header>
        {users.isPending ? <p>{t("admin.loadingUsers")}</p> : null}
        {users.error ? <p role="alert">{errorMessage(users.error, t)}</p> : null}
        {updateUser.error ? <p role="alert">{errorMessage(updateUser.error, t)}</p> : null}
        <div className="admin-list">
          {users.data?.items.map((user) => (
            <article className="panel admin-row" key={user.id}>
              <div><strong>{user.displayName}</strong><p className="meta"><code>{user.id}</code> · {user.suspended ? t("admin.suspended") : t("admin.active")}</p></div>
              <select aria-label={t("admin.roleFor", { name: user.displayName })} value={user.role} disabled={updateUser.isPending} onChange={(event) => updateUser.mutate({ id: user.id, input: { role: event.target.value as "USER" | "ADMIN" } })}>
                <option value="USER">{t("common.role.USER")}</option><option value="ADMIN">{t("common.role.ADMIN")}</option>
              </select>
              <button type="button" disabled={updateUser.isPending} onClick={() => updateUser.mutate({ id: user.id, input: { suspended: !user.suspended } })}>
                {user.suspended ? t("admin.restore") : t("admin.suspend")}
              </button>
            </article>
          ))}
        </div>
      </main>
    </AdminGate>
  );
}

export const Route = createFileRoute("/admin/users")({ component: AdminUsersPage });
