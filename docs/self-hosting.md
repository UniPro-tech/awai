# Self-hosting with Docker Compose

Docker Compose runs five services: Caddy, the combined application and web UI, the Python analysis worker, PostgreSQL, and a one-shot migration container. PostgreSQL is not published to the host.

## Start

Set a strong database password and an independent random authentication secret, then start the stack:

```sh
export POSTGRES_PASSWORD='replace-with-a-long-random-password'
export BETTER_AUTH_SECRET='replace-with-at-least-32-random-characters'
docker compose up --build -d
```

Open `http://localhost:8080`. Set `HTTP_PORT` to publish a different host port. If the public origin differs, set `BETTER_AUTH_URL` to its absolute URL so authentication callbacks and cookies use the correct origin.

Unsafe cookie-authenticated API requests require an exact trusted `Origin`. `BETTER_AUTH_URL` is always trusted. If a separate development frontend or approved same-site frontend must call the server, add its comma-separated absolute origins to `BETTER_AUTH_TRUSTED_ORIGINS`. Do not use wildcards and do not add origins that are not controlled by the operator.

To create the first administrator, set `INITIAL_ADMIN_EMAIL` before registering that email address:

```sh
export INITIAL_ADMIN_EMAIL='admin@example.com'
```

The comparison is case-insensitive and is evaluated only when a new account is created. It does not promote an existing account. After bootstrap, use the Administration page to assign additional administrators or suspend accounts. Keep the variable set to the intended bootstrap address or remove it after the account has been created.

Authentication and versioned API requests are rate-limited in each application process. The defaults are a 60-second window with 20 authentication requests per source address and 300 API requests per authenticated user. Override `RATE_LIMIT_WINDOW_SECONDS`, `RATE_LIMIT_AUTH_MAX`, and `RATE_LIMIT_API_MAX` when needed. Caddy supplies the client forwarding headers used for the authentication key; if the application is placed behind another proxy, overwrite—not append untrusted client values—to those headers.

The startup dependency order is:

```text
PostgreSQL healthy -> migration completed -> application and analysis -> Caddy
```

Application startup never mutates the database schema. The dedicated `migration` service applies version-controlled Drizzle migrations and must finish successfully first.

## Operations

```sh
docker compose ps
docker compose logs -f application analysis
docker compose down
```

`docker compose down` keeps the named PostgreSQL 18 volume. Back up that volume or use PostgreSQL-native backup tooling before upgrades. Removing the volume permanently deletes application data. PostgreSQL 18 and later must mount `/var/lib/postgresql`, not the legacy `/var/lib/postgresql/data` path.

For internet-facing deployments, terminate TLS using an explicitly configured Caddy hostname or an upstream reverse proxy. Do not use the development database password in production.

For enterprise identity providers, complete the local administrator bootstrap first and then follow [OIDC and SAML single sign-on](sso.md). SSO requires an externally correct HTTPS `BETTER_AUTH_URL` and migration `0004` or later.
