# Architecture

Awai uses a pnpm monorepo with an application server, browser application, shared API contracts, and a typed client. PostgreSQL is the boundary between the TypeScript application and the Python analysis worker.

```text
Browser -> Hono HTTP API -> PostgreSQL <- Python analysis worker
```

## Dependency direction

```text
contracts <- server
contracts <- api-client <- web
```

`packages/contracts` is a pure Zod package and must not depend on React, Hono, Drizzle, Better Auth, or a database implementation. The web application does not import server implementation modules; only the API client may import the server's route-tree type.

## Browser application

The browser is a React and Vite SPA. TanStack Router generates a typed route tree from `apps/web/src/routes`, and TanStack Query owns remote server state. Feature API functions isolate Hono RPC transport calls from UI components. Tailwind CSS supplies utility styles, while reusable source-owned components under `apps/web/src/components/ui` follow the shadcn/ui model.

The primary routes are `/login`, `/topics`, `/topics/new`, `/topics/:topicId`, `/topics/:topicId/results`, `/topics/:topicId/settings`, `/profile`, and the `/admin/*` management screens. The voting route fetches the current member's own answered statement IDs, shuffles answered and unanswered statements separately, and places the unanswered queue first. The order remains stable until the statement query is refreshed. The minimal `/api/v1/me` response supplies role-aware navigation without exposing authentication-provider data. Authentication and authorization remain enforced by each API; client-side gates improve navigation but are not a security boundary.

## Public response boundary

Database models, domain models, and API response models are separate. Presenters construct a public shape and parse it with a response schema before a route returns it. This prevents internal user identifiers, moderation fields, and deletion metadata from leaking accidentally.

## Privacy invariants

- A vote can be created or replaced and read by its voter. A member may list only their own choices within a topic so the browser can prioritize unanswered statements. Aggregate counts become available to that voter only after answering the statement; no API exposes voter identities or another member's choices.
- Topic owners and administrators have no special access to raw votes.
- The identity policy stored on a topic affects future statements only. Each statement retains the author visibility selected at creation.
- Anonymous responses contain `displayName: null` regardless of the caller's role.
- Analysis results do not persist a mapping from plotted points to user identities.
- Analysis APIs expose anonymous coordinates and aggregate group sizes, never participant identifiers. A viewer-only position estimate is computed from that viewer's votes and anonymous group centroids without persisting a point-to-user mapping.
- Topic and statement deletion is logical. Delete and restore operations are authorized and audited, while historical analysis snapshots remain unchanged.
- Categories are optional and tags are many-to-many. Removing taxonomy data never removes its topics.
- Authenticated members can create categories and tags from the topic editor; only administrators can delete shared taxonomy.

## Authentication, persistence, and analysis

Better Auth owns the `auth` schema and maps each authenticated account to a separate `core.app_users` row. Middleware rejects unauthenticated `/api/v1` requests before route handlers run. The server uses Drizzle ORM with PostgreSQL schemas named `core` and `analysis`. Database migrations run as an explicit deployment step.

Unsafe `/api/v1` requests carrying cookies must include an exact trusted `Origin`; the authentication origin and explicitly configured operator-controlled origins are allowed. This provides an application-level CSRF boundary in addition to Better Auth's cookie protections.

Creating a statement or replacing a vote schedules analysis ten seconds later. A partial unique index keeps at most one pending job per topic, so bursts move that job's availability time instead of producing an unbounded queue. The Python worker claims jobs from PostgreSQL with `FOR UPDATE SKIP LOCKED`; no Redis service is required.

The analysis adapter converts UUIDs to short-lived integer identifiers required by Red Dwarf. Participant identifiers are discarded before results are persisted. The `analysis.points` table intentionally has no user identifier or participant mapping. When a member requests a result, the server compares their current votes with group-representative statements and returns a weighted centroid estimate as `viewerPoint`; this derived coordinate exists only for that response. The browser can rasterize the authenticated result into a PDF without a server-side report store.
