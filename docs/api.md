# HTTP API

PrivatePolis exposes a same-origin JSON API under `/api/v1`. All versioned endpoints require a valid Better Auth session cookie. Authentication endpoints are mounted under `/api/auth`.

`GET /api/config` is intentionally public and returns only `registrationEnabled` and `localAuthEnabled`. The login UI uses these booleans to hide unavailable controls; the server remains the enforcement boundary.

Better Auth provides local sign-in plus optional OIDC and SAML endpoints under `/api/auth`. SSO provider registration and mutation are limited to active PrivatePolis administrators. See [OIDC and SAML single sign-on](sso.md) for callback URLs and operational guidance.

## Current user

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/v1/me` | Read the current application user ID, display name, and global role |

The response deliberately excludes email addresses, authentication-provider identifiers, session data, and credentials. The browser uses it for role-aware navigation and display only; every protected API still performs its own authorization check.

## Topics and statements

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/v1/topics` | List non-deleted topics |
| `POST` | `/api/v1/topics` | Create a topic |
| `GET` | `/api/v1/topics/:topicId` | Read a topic |
| `PATCH` | `/api/v1/topics/:topicId` | Change status or statement identity policy as the owner or an administrator |
| `PATCH` | `/api/v1/topics/:topicId/owner` | Transfer ownership to an active user as the owner or an administrator |
| `GET` | `/api/v1/topics/:topicId/statements` | List non-deleted statements |
| `POST` | `/api/v1/topics/:topicId/statements` | Create a statement |
| `DELETE` | `/api/v1/topics/:topicId` | Soft-delete a topic as its owner or an administrator |
| `POST` | `/api/v1/topics/:topicId/restore` | Restore a soft-deleted topic |
| `DELETE` | `/api/v1/statements/:statementId` | Soft-delete a statement as its author, topic owner, or an administrator |
| `POST` | `/api/v1/statements/:statementId/restore` | Restore a soft-deleted statement |

Deletion requests require a reason:

```json
{
  "reason": "Duplicate statement"
}
```

Deletion and restoration actions are written to `core.audit_logs`. Restore operations clear deletion metadata; audit history remains immutable. Statement deletion and restoration schedule a new analysis run without modifying historical snapshots.

Topic settings updates accept one or both of `status` and `statementIdentityPolicy`. Changing the statement identity policy affects only future statements; every existing statement retains the visibility selected when it was created. Ownership transfers accept an application user UUID in `ownerUserId`. Identity-policy, status, and ownership changes are written to `core.audit_logs`.

## Votes

| Method | Path | Purpose |
| --- | --- | --- |
| `PUT` | `/api/v1/statements/:statementId/vote` | Create or replace the current user's vote |
| `GET` | `/api/v1/statements/:statementId/vote` | Read the current user's vote |
| `GET` | `/api/v1/statements/:statementId/stats` | Read aggregate counts |

No endpoint lists raw votes, voters, or votes by user. Topic owners and administrators receive the same aggregate-only response as other users.

## Categories and tags

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/v1/categories` | List categories |
| `POST` | `/api/v1/categories` | Create or return a category as an administrator |
| `DELETE` | `/api/v1/categories/:categoryId` | Delete a category as an administrator |
| `GET` | `/api/v1/tags` | List tags |
| `POST` | `/api/v1/tags` | Create or return a tag as an administrator |
| `DELETE` | `/api/v1/tags/:tagId` | Delete a tag as an administrator |

Deleting a category clears the optional category reference on existing topics. Deleting a tag removes its topic associations without deleting topics. Topic responses contain their public category and tags.

## Analysis

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/v1/topics/:topicId/analysis/latest` | Read the latest completed analysis |
| `GET` | `/api/v1/topics/:topicId/analysis/runs` | List analysis run metadata |
| `GET` | `/api/v1/topics/:topicId/analysis/runs/:runId` | Read a specific analysis snapshot |

Analysis points contain coordinates and an optional group ordinal only. They never contain an account, user, or participant identifier.

## Administration

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/v1/admin/users` | List application users as an administrator |
| `PATCH` | `/api/v1/admin/users/:userId` | Change a user's role or suspension state as an administrator |

The update body accepts at least one of `role` (`USER` or `ADMIN`) and `suspended` (boolean). An administrator cannot demote or suspend their own account. Suspension is checked on every versioned API request, so it invalidates access even for an already-issued session cookie. Administrative changes are recorded in `core.audit_logs`; authentication identifiers and credentials are never returned.

## Errors

Errors use a shared shape:

```json
{
  "error": {
    "code": "PERMISSION_DENIED",
    "message": "Permission denied."
  }
}
```

Authentication failures return `401`; authorization failures (including suspended accounts) return `403`; missing or soft-deleted resources return `404`; identity-policy, topic-state, and administrator self-lockout conflicts return `409`; invalid JSON input returns `400`. Unknown versioned routes use `ROUTE_NOT_FOUND`. Validation and unexpected server errors preserve the shared error envelope and include a request ID; validation details contain issue codes, paths, and messages but never echo the request body.

Rate-limit responses return `429` with `Retry-After`, `RateLimit-Limit`, `RateLimit-Remaining`, and `RateLimit-Reset` headers. Authentication limits are keyed by source address; versioned API limits are keyed by authenticated application user.
