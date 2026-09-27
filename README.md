# PrivatePolis

PrivatePolis is a private-first, self-hosted platform for discovering opinion groups and consensus inside authenticated communities. It follows the statistical analysis model popularized by Polis and Agora without requiring generative AI.

## Project status

PrivatePolis is in early development. The current foundation provides shared runtime-validated API contracts, a Hono application server, a typed Hono RPC client, and a React/Vite web application.

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

The development web server listens on `http://localhost:5173` and proxies `/api` and `/health` to the application server at `http://localhost:3000`.

Copy `.env.example` to `.env`, then generate and apply schema changes explicitly:

```sh
pnpm db:generate
pnpm db:migrate
```

Production application startup never runs migrations implicitly.

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
docker compose up --build -d
```

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

See [docs/architecture.md](docs/architecture.md) for boundaries and security invariants.

## Security

Please report vulnerabilities privately as described in [SECURITY.md](SECURITY.md). Do not include raw vote data, credentials, or personally identifiable information in public issues.

## License

This project is licensed under the Apache License 2.0. See [LICENSE](LICENSE).
