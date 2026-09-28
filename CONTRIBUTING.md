# Contributing

Thank you for helping build PrivatePolis.

## Development workflow

1. Install dependencies with `pnpm install`.
2. Keep API schemas in `packages/contracts`; do not duplicate request or response types by hand.
3. Run `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build` before submitting a change.
4. Add privacy regression tests whenever a change affects identities, statements, votes, moderation, or analysis results.

Use Conventional Commits. Changes must not expose raw votes through user, owner, or administrator APIs.

Changes to the analysis worker must also pass `uv run ruff check .`, `uv run mypy`, and `uv run pytest` from `services/analysis`. The CI workflow additionally builds both production container targets and validates the Helm chart with external PostgreSQL, bundled PostgreSQL, Ingress, and Gateway API configurations.

The PostgreSQL integration suite runs in CI after applying all version-controlled migrations. To run it locally against a disposable database, set `DATABASE_URL`, run `pnpm db:migrate`, then run `pnpm --filter @private-polis/server test:integration`. Do not point the suite at a shared or production database.

## Response boundary

Database records are internal. Route handlers must pass explicitly selected values through the relevant Zod response schema before returning JSON. Anonymous content must retain its original anonymity even if a topic policy changes later.
