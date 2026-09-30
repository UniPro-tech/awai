# Contributing

Thank you for helping build Awai.

## Development workflow

1. Install dependencies with `pnpm install`.
2. Keep API schemas in `packages/contracts`; do not duplicate request or response types by hand.
3. Run `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build` before submitting a change.
4. Add privacy regression tests whenever a change affects identities, statements, votes, moderation, or analysis results.

Use Conventional Commits. `fix:` raises the patch version, `feat:` raises the minor version, and a `!` or `BREAKING CHANGE:` footer raises the major version through the automated release process. Do not edit release versions, `CHANGELOG.md`, or Git tags manually during a normal release; see [release automation](docs/releases.md). Changes must not expose raw votes through user, owner, or administrator APIs.

Changes to the analysis worker must also pass `uv run ruff check .`, `uv run mypy`, and `uv run pytest` from `services/analysis`. The CI workflow additionally builds both production container targets and validates the Helm chart with external PostgreSQL, bundled PostgreSQL, Ingress, and Gateway API configurations.

The PostgreSQL integration suite runs in CI after applying all version-controlled migrations. To run it locally against a disposable database, set `DATABASE_URL`, run `pnpm db:migrate`, then run `pnpm --filter @private-polis/server test:integration`. Do not point the suite at a shared or production database.

Browser smoke tests use Playwright. Install Chromium once with `pnpm exec playwright install chromium`, then run `pnpm test:e2e`. The test runner starts the Vite development server automatically.

## Response boundary

Database records are internal. Route handlers must pass explicitly selected values through the relevant Zod response schema before returning JSON. Anonymous content must retain its original anonymity even if a topic policy changes later.
