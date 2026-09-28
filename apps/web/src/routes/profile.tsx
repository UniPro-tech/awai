import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AuthGate } from "../features/auth/auth-gate";
import { authClient } from "../features/auth/client";

function ProfilePage() {
  const session = authClient.useSession();
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
              <div><dt>User ID</dt><dd><code>{user.id}</code></dd></div>
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
