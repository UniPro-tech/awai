# Contributing

Thank you for helping build PrivatePolis.

## Development workflow

1. Install dependencies with `pnpm install`.
2. Keep API schemas in `packages/contracts`; do not duplicate request or response types by hand.
3. Run `pnpm typecheck`, `pnpm test`, and `pnpm build` before submitting a change.
4. Add privacy regression tests whenever a change affects identities, statements, votes, moderation, or analysis results.

Use Conventional Commits. Changes must not expose raw votes through user, owner, or administrator APIs.

## Response boundary

Database records are internal. Route handlers must pass explicitly selected values through the relevant Zod response schema before returning JSON. Anonymous content must retain its original anonymity even if a topic policy changes later.
