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
