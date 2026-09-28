# Kubernetes deployment

The official chart is located at `deploy/helm/private-polis`. It installs the application, analysis worker, migration job, service account, service, network policies, disruption budget, and optional HPA and HTTP routing resources.

External PostgreSQL is the production default. Build and publish the three image targets before installing the chart, then override their repositories and immutable tags:

```sh
helm upgrade --install private-polis deploy/helm/private-polis \
  --namespace private-polis \
  --create-namespace \
  --set application.image.repository=registry.example.com/private-polis/application \
  --set application.image.tag=0.1.0 \
  --set analysis.image.repository=registry.example.com/private-polis/analysis \
  --set analysis.image.tag=0.1.0 \
  --set migration.image.repository=registry.example.com/private-polis/migration \
  --set migration.image.tag=0.1.0 \
  --set existingSecret=private-polis-production \
  --set auth.baseUrl=https://consensus.example.com \
  --set auth.initialAdminEmail=admin@example.com
```

Avoid secrets on the command line in production. Create the referenced Secret before installation:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: private-polis-production
  namespace: private-polis
type: Opaque
stringData:
  DATABASE_URL: postgresql://private_polis:replace-me@postgres.example:5432/private_polis
  BETTER_AUTH_SECRET: replace-with-at-least-32-random-characters
```

The migration Job runs after the initial resources are installed and before each upgrade. Application readiness verifies database connectivity; schema changes are never applied by application startup.

`auth.initialAdminEmail` promotes a matching account only when that account is first registered. Matching is case-insensitive; changing the value does not alter existing users. After bootstrap, administrators can manage roles and suspensions from the Administration page. The value is not a credential, but operators should still keep deployment configuration under change control.

## HTTP routing

Ingress and Gateway API are both optional and mutually exclusive. The chart fails validation if both are enabled. Example values are available in `deploy/helm/private-polis/examples`.

The Gateway API option creates an `HTTPRoute` only. It never creates or manages the referenced Gateway:

```sh
helm upgrade --install private-polis deploy/helm/private-polis \
  --namespace private-polis \
  --values deploy/helm/private-polis/examples/gateway-values.yaml
```

## Development PostgreSQL

The bundled PostgreSQL 18 StatefulSet is intended for evaluation and small development environments. Production installations should use a managed or separately operated PostgreSQL service with tested backups and high availability.

```sh
helm upgrade --install private-polis deploy/helm/private-polis \
  --namespace private-polis \
  --create-namespace \
  --set postgresql.enabled=true \
  --set postgresql.auth.password=replace-with-a-long-random-password \
  --set auth.secret=replace-with-at-least-32-random-characters \
  --set auth.baseUrl=http://localhost:8080
```

PostgreSQL 18 data is mounted at `/var/lib/postgresql`. Back up the persistent volume with PostgreSQL-native tooling before upgrades. Disabling persistence or deleting its PVC permanently removes the database.

## Operations and security

- Liveness uses `/health/live` and does not query PostgreSQL.
- Readiness uses `/health/ready` and verifies PostgreSQL connectivity.
- Containers run without privilege escalation, drop Linux capabilities, and do not mount service account tokens by default.
- Network policies allow the application ingress on port 3000 and restrict application and worker egress to DNS and PostgreSQL. Confirm that the cluster CNI enforces NetworkPolicy and adapt the policy if the external database uses a non-standard port.
- Set resource requests and limits before enabling the HPA; CPU utilization targets require requests.
- Use an external secrets controller or a pre-created Secret when possible. The inline `auth.secret` and `database.url` values are provided for development and chart rendering only.
- `rateLimit.windowSeconds`, `rateLimit.authMax`, and `rateLimit.apiMax` configure the built-in fixed-window limiter. Limits are local to each application replica; use a trusted ingress or gateway rate limiter when a deployment requires a strict cluster-wide ceiling. Ensure the proxy replaces untrusted client forwarding headers.
- Cookie-authenticated mutations enforce exact Origin matching. `auth.baseUrl` is trusted automatically; add only operator-controlled extra origins to `auth.trustedOrigins`. Wildcards are not supported.

Validate changes before upgrading:

```sh
helm lint deploy/helm/private-polis \
  --set existingSecret=private-polis-production

helm template private-polis deploy/helm/private-polis \
  --set existingSecret=private-polis-production
```

OIDC and SAML callbacks use `auth.baseUrl`; it must be the exact externally reachable HTTPS origin. Apply migrations and then follow [OIDC and SAML single sign-on](sso.md). Identity-provider client secrets and SAML private keys belong in the provider store or a secret manager, never in chart values committed to source control.
