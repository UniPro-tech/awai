# PrivatePolis

PrivatePolis is a private-first, self-hosted platform for discovering opinion groups and consensus inside authenticated communities. It follows the statistical analysis model popularized by Polis and Agora without requiring generative AI.

## Project status

PrivatePolis 0.1.0 is an early release. It provides local and enterprise authentication, PostgreSQL-backed topics, statements and votes, a CPU analysis worker, privacy-safe result APIs and visualization, shared runtime-validated API contracts, a typed Hono RPC client, and a React/Vite web application.

## Principles

- Private and authenticated by default
- Self-hosted and cloud-independent
- Anonymous voting, including from administrators and topic owners
- Explicit separation between database entities and public API responses
- Statistical analysis that runs on CPU without an LLM

## Requirements

- Node.js 24 or later
- pnpm 11
- PostgreSQL
- Python 3.12 or later and `uv`

## Development

```sh
pnpm install
pnpm typecheck
pnpm test
pnpm build
pnpm dev
```

The development web server listens on `http://localhost:5173` and proxies `/api` and `/health` to the application server at `http://localhost:3000`. TanStack Router generates `apps/web/src/routeTree.gen.ts` from files under `apps/web/src/routes`; commit the generated file whenever the route structure changes.

Copy `.env.example` to `.env`, then generate and apply schema changes explicitly:

```sh
pnpm db:generate
pnpm db:migrate
```

Production application startup never runs migrations implicitly.

All `/api/v1` routes require a Better Auth session. Register through the web UI or the `/api/auth/sign-up/email` endpoint; application users are mapped to authentication users without exposing authentication identifiers in public responses. Optional OIDC and SAML 2.0 setup is documented in [docs/sso.md](docs/sso.md).

Set `INITIAL_ADMIN_EMAIL` before the first matching account is registered to bootstrap an administrator. The comparison is case-insensitive and only applies when a new account is created; changing the setting does not promote an existing account. Administrators can subsequently manage roles and suspensions from `/admin`.

Set `REGISTRATION_ENABLED=false` after bootstrapping the community to reject every new local and SSO account while preserving sign-in for existing users.

Set `LOCAL_AUTH_ENABLED=false` to remove username/password sign-in and registration and require configured OIDC or SAML single sign-on. Verify SSO before disabling local authentication to avoid locking out all users.

The analysis worker is managed separately:

```sh
cd services/analysis
uv sync --dev
uv run pytest
uv run python -m private_polis_analysis.worker
```

For a complete local self-hosted stack, see [docs/self-hosting.md](docs/self-hosting.md):

```sh
export POSTGRES_PASSWORD='replace-with-a-long-random-password'
export BETTER_AUTH_SECRET='replace-with-at-least-32-random-characters'
docker compose up --build -d
```

For Kubernetes deployments, see [docs/kubernetes.md](docs/kubernetes.md). The Helm chart supports external PostgreSQL by default, optional bundled PostgreSQL for development, and mutually exclusive Ingress or Gateway API routing.

## Repository layout

```text
apps/web             React and Vite single-page application
apps/server          Hono application server
packages/contracts   Zod request and response schemas
packages/api-client  Typed Hono RPC client
services/analysis    Python and Red Dwarf analysis worker
deploy               Docker Compose and container assets
docs                 Architecture and contributor documentation
```

See [docs/architecture.md](docs/architecture.md) for system boundaries, [docs/api.md](docs/api.md) for the current HTTP API, [docs/privacy.md](docs/privacy.md) for the data and anonymity model, and [docs/security.md](docs/security.md) for the threat model and deployment controls.

## Security

Please report vulnerabilities privately as described in [SECURITY.md](SECURITY.md). Do not include raw vote data, credentials, or personally identifiable information in public issues.

## License

This project is licensed under the Apache License 2.0. See [LICENSE](LICENSE).
