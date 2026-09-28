import { createFileRoute, Link } from "@tanstack/react-router";
import { AuthGate } from "../features/auth/auth-gate";

function AdminSettingsPage() {
  return (
    <AuthGate>
      <main className="shell narrow-shell">
        <nav className="breadcrumb"><Link to="/admin">Administration</Link> / Settings</nav>
        <header><p className="eyebrow">Administration</p><h1>Settings</h1><p>Security-sensitive deployment settings are managed by the self-hosting operator.</p></header>
        <section className="panel settings-list" aria-labelledby="identity-heading">
          <h2 id="identity-heading">Identity</h2>
          <p>Local username/password authentication is enabled. OIDC and SAML providers are registered through Better Auth's administrator-only SSO API.</p>
          <p className="meta">Provider secrets stay server-side. See <code>docs/sso.md</code> for registration examples and production requirements.</p>
        </section>
        <section className="panel settings-list" aria-labelledby="deployment-heading">
          <h2 id="deployment-heading">Deployment policy</h2>
          <dl>
            <div><dt>Browser authentication</dt><dd>Secure session cookie</dd></div>
            <div><dt>API origin policy</dt><dd>Exact Same-Origin verification for cookie mutations</dd></div>
            <div><dt>Vote visibility</dt><dd>Aggregates only; raw votes are never exposed</dd></div>
          </dl>
        </section>
      </main>
    </AuthGate>
  );
}

export const Route = createFileRoute("/admin/settings")({ component: AdminSettingsPage });
