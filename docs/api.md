# HTTP API

PrivatePolis exposes a same-origin JSON API under `/api/v1`. All versioned endpoints require a valid Better Auth session cookie. Authentication endpoints are mounted under `/api/auth`.

## Topics and statements

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/v1/topics` | List non-deleted topics |
| `POST` | `/api/v1/topics` | Create a topic |
| `GET` | `/api/v1/topics/:topicId` | Read a topic |
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

Authentication failures return `401`; authorization failures return `403`; missing or soft-deleted resources return `404`; identity-policy and topic-state conflicts return `409`; invalid JSON input returns `400`.
