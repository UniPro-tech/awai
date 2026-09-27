# Security Policy

PrivatePolis is under active development and has not reached a stable release. Only the latest commit on the default branch receives security fixes.

Please report suspected vulnerabilities privately to the repository maintainers. Do not open a public issue containing credentials, personal data, vote records, or reproduction data that identifies participants.

The following are core security invariants:

- Raw votes are never exposed by public, topic-owner, or administrator APIs.
- Anonymous topic and statement responses never expose internal author identifiers or display names.
- Vote values are not written to audit logs or application logs together with user identity, email address, or IP address.
- Database entities are never serialized directly as API responses.
