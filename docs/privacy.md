# Privacy model

Awai keeps votes anonymous to other application users, topic owners, and administrators. This is an application-level privacy guarantee, not cryptographic anonymity: the PostgreSQL operator can inspect the source tables, and the analysis worker temporarily reads account-linked votes to compute anonymous results.

## Data inventory

| Area                                 | Stored data                                                                             | Public application response                                                                                                        |
| ------------------------------------ | --------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Better Auth (`auth`)                 | Account name, email, username, credential/session records, SSO configuration            | Managed only by Better Auth endpoints; never copied into topic, statement, vote, or analysis responses                             |
| Application users (`core.app_users`) | Authentication-user mapping, display name, global role, suspension state                | `/api/v1/me` returns the application user ID, display name, and role; administrator user management adds suspension and timestamps |
| Topics and statements                | Creator/owner identifiers, text, selected author visibility, moderation metadata        | Explicit Zod presenters omit internal user IDs and deletion metadata; anonymous authors have `displayName: null`                   |
| Votes                                | User ID, statement ID, value, timestamps                                                | The voter can read their own current vote; other callers receive counts only                                                       |
| Analysis jobs                        | Topic reference, queue state, timing, and failure text                                  | Not exposed                                                                                                                        |
| Analysis snapshots                   | Anonymous coordinates, group ordinals and sizes, ranked statements, and aggregate response counts | Exposed without participant identifiers or a persisted point-to-user mapping                                                |
| Audit log                            | Actor ID, action, entity reference, and management metadata                             | Not currently exposed by the HTTP API; vote values are never recorded                                                              |

## Identity and anonymity boundaries

- Anonymous topic and statement authors are still recorded internally so authorization, deletion, abuse handling, and auditability work. Public presenters replace that identity with `{ "visibility": "ANONYMOUS", "displayName": null }` for every caller, including administrators.
- A topic's statement identity policy applies only to new statements. Each statement stores the visibility selected when it was created, so a later policy change cannot identify old anonymous statements.
- Votes use a unique `(statement_id, user_id)` relationship. No `listVotes`, `getVoters`, or votes-by-user HTTP repository operation exists. Live counts from the statement statistics endpoint are withheld until that member has answered it. Completed analysis snapshots expose aggregate topic and group counts without identifying voters.
- The analysis adapter maps UUIDs to temporary numeric identifiers in worker memory. Persisted points intentionally have no user or participant column. Statement response breakdowns persist only aggregate `AGREE`, `DISAGREE`, and `PASS` counts for the topic and each anonymous group.
- For the authenticated viewer, the API estimates a position at request time by comparing only that viewer's votes with group-representative statements and weighting anonymous group centroids. The estimate is returned without an identity field and is never stored as a user-to-coordinate mapping.
- Detailed analysis PDFs are rasterized and assembled in the viewer's browser. The application server does not receive or retain a generated report; a downloaded file can still be sensitive and must be handled by the member accordingly.
- Group sizes and aggregate vote counts can still disclose information in a very small community. Operators should limit membership and topic visibility according to their community's risk tolerance.

## Deletion and retention

Topic and statement deletion is logical. The original row, internal author identity, deletion actor, reason, and past analysis snapshots remain in PostgreSQL. Restoration clears active deletion metadata but does not erase the audit trail. This behavior supports moderation and reproducibility; it is not a data-erasure workflow.

Awai does not currently implement automated retention, account erasure, or backup expiry. Database backups may retain deleted content, votes, sessions, SSO configuration, and audit records after the live database changes. Operators are responsible for documenting retention periods, limiting backup access, encrypting backups, and testing deletion procedures required by their jurisdiction.

## Operational access

Treat PostgreSQL credentials, database consoles, backups, debug dumps, and worker access as privileged access to identifiable vote data. Application roles do not constrain direct database administrators. Limit access with separate service credentials, network policy, encrypted transport where supported, and infrastructure audit logging.

Do not export production rows into bug reports or test fixtures. Logs and traces must not combine a vote value with a user ID, email address, or source address. The application does not log request bodies; reverse proxies and observability agents must be configured to follow the same rule.

## Regression evidence

The automated suites verify that response schemas strip extra internal fields, anonymous statements stay anonymous for administrator callers, live aggregate counts require a prior vote, analysis breakdowns contain only counts, viewer positions are computed without persisting a participant mapping, raw-vote list routes do not exist, and management events—not vote contents—reach the audit log. The PostgreSQL integration test proves the database retains the statement author while the HTTP response hides it.

Changes involving identity, voting, logging, analysis persistence, exports, or moderation must include a privacy regression test and update this document when the data flow changes.
