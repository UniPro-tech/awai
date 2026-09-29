# OIDC and SAML single sign-on

Awai uses the official Better Auth SSO plugin for OIDC and SAML 2.0. Local username/password login remains available so an operator can bootstrap and recover administrative access.

## Prerequisites

1. Configure the externally reachable origin in `BETTER_AUTH_URL` using HTTPS.
2. Register the initial local administrator as described in the self-hosting guide.
3. Apply all database migrations. Migration `0004` creates the provider configuration table used by Better Auth.
4. Sign in as a Awai administrator before calling provider-management endpoints. Provider registration is disabled for ordinary and suspended users.

Provider secrets are stored in PostgreSQL by Better Auth. Restrict database access, encrypt backups, and never commit provider request files or certificates containing private material.

## OIDC

Configure this redirect URI at the identity provider, replacing the origin and provider ID:

```text
https://consensus.example.com/api/auth/sso/callback/corporate-oidc
```

Create a mode-0600 JSON file outside the repository:

```jsonc
{
  "providerId": "corporate-oidc",
  "issuer": "https://id.example.com",
  "domain": "example.com" /* e-mail Domain */,
  "oidcConfig": {
    "clientId": "private-polis",
    "clientSecret": "replace-me",
    "scopes": ["openid", "email", "profile"],
  },
}
```

With an administrator session cookie, submit it to Better Auth:

```sh
curl --fail-with-body \
  --cookie admin-cookie.txt \
  --header 'content-type: application/json' \
  --data-binary @/secure/path/oidc-provider.json \
  https://consensus.example.com/api/auth/sso/register
```

Better Auth performs OIDC discovery and validates issuer metadata. Users choose **Sign in with SSO** and enter an email in a registered domain.

For a direct provider button, add the registered ID and its public label to `PUBLIC_SSO_PROVIDERS` (Compose) or `auth.publicSsoProviders` (Helm). The login page calls Better Auth with `providerId` directly, while the email form continues to resolve providers by domain.

### Link an existing account

Better Auth refuses automatic linking with `account_not_linked` when an SSO provider does not supply a trusted verified-email signal. After registering and testing a provider that you control, its provider ID can be explicitly trusted:

```dotenv
ACCOUNT_LINKING_ALLOWED_PROVIDERS=["corporate-oidc"]
```

For Helm, use `auth.accountLinkingAllowedProviders: [corporate-oidc]`.

This setting allows the listed provider to link to an existing account only when the normalized email addresses match. Different-email linking remains disabled. Trusting a provider bypasses its missing `email_verified` signal, so include only operator-controlled providers that authenticate ownership of every returned email. An account already linked to another user is not reassigned.

## SAML 2.0

Use these Service Provider endpoints for a provider ID such as `corporate-saml`:

```text
Metadata: https://consensus.example.com/api/auth/sso/saml2/sp/metadata?providerId=corporate-saml
ACS:      https://consensus.example.com/api/auth/sso/saml2/sp/acs/corporate-saml
```

An abbreviated registration request is:

```json
{
  "providerId": "corporate-saml",
  "issuer": "https://consensus.example.com",
  "domain": "example.com",
  "samlConfig": {
    "entryPoint": "https://id.example.com/saml/sso",
    "cert": "-----BEGIN CERTIFICATE-----\n...\n-----END CERTIFICATE-----",
    "wantAssertionsSigned": true
  }
}
```

Submit the file to the same `/api/auth/sso/register` endpoint. Awai requires timestamp conditions in assertions and rejects deprecated SAML algorithms. Prefer signed assertions, signed AuthnRequests where supported, short-lived assertions, and encrypted assertions when required by the deployment threat model.

## Account behavior

- Successful first-time SSO authentication provisions both a Better Auth user and a corresponding `core.app_users` row with the `USER` role.
- An administrator must promote SSO users through the Administration page; upstream claims never grant the Awai `ADMIN` role automatically.
- Account linking follows Better Auth's verified-provider rules unless a provider ID is explicitly listed in `ACCOUNT_LINKING_ALLOWED_PROVIDERS`. Test migrations from local login with a staging account before allowing a provider.
- Suspension is enforced by Awai on every `/api/v1` request, including sessions established through SSO.
- Removing a provider prevents new SSO sessions but does not automatically delete provisioned users or historical content.
- Provider update and removal remain available only while the administrator that registered the provider is still an active Awai administrator. Register operational providers with a durable break-glass administrator account.

See the [Better Auth SSO documentation](https://better-auth.com/docs/plugins/sso) for the full OIDC and SAML registration schemas, provider update/removal calls, certificate rotation, and IdP-specific guidance.
