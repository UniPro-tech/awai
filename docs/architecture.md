# Architecture

PrivatePolis uses a pnpm monorepo with an application server, browser application, shared API contracts, and a typed client. PostgreSQL is the boundary between the TypeScript application and the Python analysis worker.

```text
Browser -> Hono HTTP API -> PostgreSQL <- Python analysis worker
```

## Dependency direction

```text
contracts <- server
contracts <- api-client <- web
```

`packages/contracts` is a pure Zod package and must not depend on React, Hono, Drizzle, Better Auth, or a database implementation. The web application does not import server implementation modules; only the API client may import the server's route-tree type.

## Public response boundary

Database models, domain models, and API response models are separate. Presenters construct a public shape and parse it with a response schema before a route returns it. This prevents internal user identifiers, moderation fields, and deletion metadata from leaking accidentally.

## Privacy invariants

- A vote can be created or replaced, read by its voter, and aggregated. APIs that list voters or votes by user do not exist.
- Topic owners and administrators have no special access to raw votes.
- The identity policy stored on a topic affects future statements only. Each statement retains the author visibility selected at creation.
- Anonymous responses contain `displayName: null` regardless of the caller's role.
- Analysis results do not persist a mapping from plotted points to user identities.
- Analysis APIs expose anonymous coordinates and aggregate group sizes, never participant identifiers.
- Topic and statement deletion is logical. Delete and restore operations are authorized and audited, while historical analysis snapshots remain unchanged.
- Categories are optional and tags are many-to-many. Removing taxonomy data never removes its topics.

## Authentication, persistence, and analysis

Better Auth owns the `auth` schema and maps each authenticated account to a separate `core.app_users` row. Middleware rejects unauthenticated `/api/v1` requests before route handlers run. The server uses Drizzle ORM with PostgreSQL schemas named `core` and `analysis`. Database migrations run as an explicit deployment step.

Creating a statement or replacing a vote schedules analysis ten seconds later. A partial unique index keeps at most one pending job per topic, so bursts move that job's availability time instead of producing an unbounded queue. The Python worker claims jobs from PostgreSQL with `FOR UPDATE SKIP LOCKED`; no Redis service is required.

The analysis adapter converts UUIDs to short-lived integer identifiers required by Red Dwarf. Participant identifiers are discarded before results are persisted. The `analysis.points` table intentionally has no user identifier or participant mapping.
