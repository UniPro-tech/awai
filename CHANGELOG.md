# Changelog

All notable changes to PrivatePolis are documented in this file. The project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## 0.1.0 - 2026-09-28

### Added

- Private authenticated communities with local username/password, OIDC, and SAML authentication through Better Auth.
- Topic, anonymous or identified statement, and agree/disagree/pass vote workflows with Zod contracts and a typed Hono RPC client.
- PostgreSQL persistence, explicit Drizzle migrations, logical deletion, audit logs, global administrator management, topic ownership, categories, and tags.
- PostgreSQL-backed debounced analysis jobs and a Python Red Dwarf worker producing PCA coordinates, opinion groups, representative statements, and consensus statements without an LLM.
- Privacy-safe analysis and aggregate vote APIs plus React/TanStack Query result visualization.
- File-based TanStack Router screens, Tailwind CSS, source-owned shadcn/ui components, profile and role-aware administration screens.
- Docker Compose deployment with Caddy and an official Helm chart supporting external or optional bundled PostgreSQL, Ingress, Gateway API, network policies, autoscaling, and disruption budgets.
- Fixed-window API limits, exact-Origin checks for cookie-authenticated mutations, security headers, shared API errors, health checks, and documented security/privacy models.
- TypeScript, Python, PostgreSQL integration, browser, container, and Helm CI coverage.

### Security

- Raw votes are never returned through member, topic-owner, or administrator APIs.
- Anonymous topic and statement presenters strip internal author identity for every caller.
- Persisted analysis points have no participant or user mapping.
