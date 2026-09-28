import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getCurrentUser } from "../features/auth/api";
import { AuthGate } from "../features/auth/auth-gate";
import { authClient } from "../features/auth/client";

function ProfilePage() {
  const session = authClient.useSession();
  const currentUser = useQuery({ queryKey: ["current-user"], queryFn: getCurrentUser });
  const navigate = useNavigate();
  const user = session.data?.user;

  return (
    <AuthGate>
      <main className="shell narrow-shell">
        <header><p className="eyebrow">Account</p><h1>Profile</h1><p>Your local identity inside this PrivatePolis community.</p></header>
        {user ? (
          <section className="panel profile-details" aria-labelledby="profile-details-heading">
            <h2 id="profile-details-heading">Account details</h2>
            <dl>
              <div><dt>Display name</dt><dd>{user.name}</dd></div>
              <div><dt>Email</dt><dd>{user.email}</dd></div>
              <div><dt>Application role</dt><dd>{currentUser.data?.role === "ADMIN" ? "Administrator" : "User"}</dd></div>
              <div><dt>User ID</dt><dd><code>{currentUser.data?.id ?? "Loading…"}</code></dd></div>
            </dl>
            <button type="button" onClick={async () => {
              await authClient.signOut();
              await navigate({ to: "/login" });
            }}>Sign out</button>
          </section>
        ) : null}
      </main>
    </AuthGate>
  );
}

export const Route = createFileRoute("/profile")({ component: ProfilePage });
