# Security model

PrivatePolis is designed for a trusted self-hosting operator and authenticated community members. It does not protect data from a malicious database or host administrator. Internet-facing deployments require TLS and a maintained reverse proxy or ingress.

## Trust boundaries

```text
Browser -> reverse proxy / ingress -> application -> PostgreSQL <- analysis worker
                         |                |
                         |                +-> OIDC / SAML identity provider
                         +-> TLS termination
```

- The application and analysis worker communicate only through PostgreSQL; the worker has no public HTTP listener.
- Better Auth owns session, password, OIDC, and SAML handling. The versioned application API uses the resulting secure session cookie rather than browser JWTs.
- Application authorization is enforced server-side. Client route guards and hidden navigation are usability controls, not security boundaries.
- `ADMIN` is the only global privileged role. Topic ownership is a per-topic relationship and never grants global permissions.

## Implemented controls

| Risk | Control |
| --- | --- |
| Unauthenticated access | Every `/api/v1/*` request resolves a Better Auth session and active `core.app_users` record |
| Suspended sessions | Suspension is checked on every versioned request, including already-issued sessions |
| CSRF | Unsafe cookie-bearing `/api/v1` requests require an exact configured `Origin`; Better Auth applies its own trusted-origin checks under `/api/auth` |
| Input and response confusion | Zod validates request, path, query, error, and response contracts; database records are not serialized directly |
| SQL injection | Drizzle and parameterized `node-postgres` queries are used; dynamic SQL identifiers are not accepted from requests |
| XSS | Topic and statement bodies are rendered as React text, not injected HTML; Hono supplies nosniff, frame, referrer, HSTS, opener, resource, and related security headers |
| Credential handling | Passwords and sessions are delegated to Better Auth; production secrets are supplied through environment variables or Kubernetes Secrets |
| Brute force and abuse | Fixed-window limits cover authentication by source address and versioned APIs by application user; responses include retry metadata |
| Privilege lockout | An administrator cannot demote or suspend their own account; initial administration is explicitly bootstrapped by email |
| SSO mutation | Only an active administrator may create, change, or remove an SSO provider; SAML requires timestamps and rejects deprecated algorithms |
| Network exposure | Compose publishes Caddy only; Helm network policies constrain application, worker, migration, and optional PostgreSQL traffic |
| Failure disclosure | Versioned APIs return a common error envelope and request ID; unexpected error messages are not returned to clients |
| Supply-chain regression | CI performs lint, type, unit, browser, PostgreSQL integration, container build, Python, and Helm checks with a frozen lockfile |

## Deployment requirements

1. Terminate HTTPS at Caddy, an ingress controller, or a Gateway implementation. Set `BETTER_AUTH_URL`/`auth.baseUrl` to the exact public HTTPS origin.
2. Generate a unique Better Auth secret of at least 32 random characters. Never commit it or pass production secrets directly in Helm values stored in source control.
3. Add only operator-controlled absolute origins to `BETTER_AUTH_TRUSTED_ORIGINS`/`auth.trustedOrigins`; wildcards are intentionally unsupported.
4. Replace untrusted forwarding headers at the proxy. Authentication rate limiting relies on the resolved source address.
5. Use a dedicated PostgreSQL role and network path, enable encrypted database transport when traffic leaves the trusted node/network, and restrict backups as sensitive data.
6. Keep application, worker, PostgreSQL, identity provider, reverse proxy, and base images patched. Rebuild images after dependency or base-image security updates.
7. Disable public registration at the identity/deployment layer when community membership must be invitation-only; local account registration is enabled by default in the current release.

## Known limitations and residual risk

- Built-in rate limits are process-local. With multiple application replicas, enforce a cluster-wide ceiling at a trusted ingress or gateway.
- SSO client secrets and SAML private material are stored by Better Auth in PostgreSQL and are not application-level encrypted. Protect the database and backups or use infrastructure-level encryption.
- There is no account-erasure, retention-policy, malware-scanning, content-moderation automation, or cryptographic anonymous-voting protocol.
- The application has no separate tenant boundary. One deployment represents one trusted community.
- Direct host, database, backup, or worker administrators can access identifying source data and are outside the application-role threat model.
- Security headers reduce browser attack surface, but operator-added scripts, proxies, themes, or observability middleware can change that posture and require a fresh review.

## Review checklist

Before a release that changes authentication, authorization, responses, logging, dependencies, or deployment:

- Run all TypeScript, Python, PostgreSQL integration, Playwright, container, and Helm checks.
- Verify anonymous responses as both a normal user and administrator.
- Confirm no raw-vote enumeration route, log entry, audit payload, or analysis mapping was introduced.
- Exercise suspension, administrator self-lockout prevention, topic ownership, and Same-Origin rejection.
- Review new environment variables, secrets, network listeners, redirects, and external origins.
- Update the data inventory, known limitations, and security policy as needed.

Report vulnerabilities privately as described in [the security policy](../SECURITY.md).
