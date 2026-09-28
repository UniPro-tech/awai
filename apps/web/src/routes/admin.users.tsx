import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { listAdminUsers, updateAdminUser } from "../features/admin/api";
import { AdminGate } from "../features/auth/admin-gate";

function AdminUsersPage() {
  const queryClient = useQueryClient();
  const users = useQuery({ queryKey: ["admin", "users"], queryFn: listAdminUsers, retry: false });
  const updateUser = useMutation({
    mutationFn: ({ id, input }: { id: string; input: { role?: "USER" | "ADMIN"; suspended?: boolean } }) => updateAdminUser(id, input),
    onSuccess: async () => queryClient.invalidateQueries({ queryKey: ["admin", "users"] }),
  });
  return (
    <AdminGate>
      <main className="shell">
        <nav className="breadcrumb"><Link to="/admin">Administration</Link> / Users</nav>
        <header><p className="eyebrow">Administration</p><h1>Users</h1><p>Role and suspension changes are written to the audit log.</p></header>
        {users.isPending ? <p>Loading users…</p> : null}
        {users.error ? <p role="alert">{users.error.message}</p> : null}
        {updateUser.error ? <p role="alert">{updateUser.error.message}</p> : null}
        <div className="admin-list">
          {users.data?.items.map((user) => (
            <article className="panel admin-row" key={user.id}>
              <div><strong>{user.displayName}</strong><p className="meta"><code>{user.id}</code> · {user.suspended ? "Suspended" : "Active"}</p></div>
              <select aria-label={`Role for ${user.displayName}`} value={user.role} disabled={updateUser.isPending} onChange={(event) => updateUser.mutate({ id: user.id, input: { role: event.target.value as "USER" | "ADMIN" } })}>
                <option value="USER">User</option><option value="ADMIN">Administrator</option>
              </select>
              <button type="button" disabled={updateUser.isPending} onClick={() => updateUser.mutate({ id: user.id, input: { suspended: !user.suspended } })}>
                {user.suspended ? "Restore access" : "Suspend"}
              </button>
            </article>
          ))}
        </div>
      </main>
    </AdminGate>
  );
}

export const Route = createFileRoute("/admin/users")({ component: AdminUsersPage });
