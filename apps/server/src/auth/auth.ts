import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { sso } from "@better-auth/sso";
import { betterAuth } from "better-auth";
import { APIError } from "better-auth/api";
import { username } from "better-auth/plugins";
import { eq } from "drizzle-orm";
import { appUsers } from "../db/schema.js";
import * as authSchema from "../db/auth-schema.js";
import { databaseRuntime } from "../db/runtime.js";
import {
  accountLinkingAllowedProviders,
  createSsoUserResolver,
} from "./account-linking.js";
import { configuredTrustedOrigins } from "./origins.js";
import { localAuthEnabled, registrationEnabled } from "./registration.js";

function authSecret(): string {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (secret) return secret;
  if (process.env.NODE_ENV === "production") {
    throw new Error("BETTER_AUTH_SECRET is required in production.");
  }
  return "development-only-change-me-32-characters";
}

function initialRole(email: string): "USER" | "ADMIN" {
  const initialAdminEmail =
    process.env.INITIAL_ADMIN_EMAIL?.trim().toLowerCase();
  return initialAdminEmail && email.toLowerCase() === initialAdminEmail
    ? "ADMIN"
    : "USER";
}

async function ssoProviderLimit(user: { id: string }): Promise<number> {
  const [appUser] = await databaseRuntime.db
    .select({ role: appUsers.role, suspended: appUsers.suspended })
    .from(appUsers)
    .where(eq(appUsers.authUserId, user.id))
    .limit(1);
  return appUser?.role === "ADMIN" && !appUser.suspended ? 10 : 0;
}

async function guardSsoProviderMutation(input: {
  provider: { id: string };
}): Promise<void> {
  const [provider] = await databaseRuntime.db
    .select({ userId: authSchema.ssoProvider.userId })
    .from(authSchema.ssoProvider)
    .where(eq(authSchema.ssoProvider.id, input.provider.id))
    .limit(1);
  if (!provider || (await ssoProviderLimit({ id: provider.userId })) === 0) {
    throw new Error(
      "Only an active Awai administrator can manage SSO providers.",
    );
  }
}

export const auth = betterAuth({
  basePath: "/api/auth",
  baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
  trustedOrigins: configuredTrustedOrigins(),
  secret: authSecret(),
  disabledPaths: localAuthEnabled()
    ? []
    : [
        "/sign-up/email",
        "/sign-in/email",
        "/sign-in/username",
        "/is-username-available",
      ],
  database: drizzleAdapter(databaseRuntime.db, {
    provider: "pg",
    schema: authSchema,
    schemaName: "auth",
    transaction: true,
  }),
  emailAndPassword: {
    enabled: localAuthEnabled(),
    disableSignUp: !registrationEnabled(),
  },
  plugins: [
    username(),
    sso({
      providersLimit: ssoProviderLimit,
      guardProviderMutation: guardSsoProviderMutation,
      resolveUser: createSsoUserResolver(accountLinkingAllowedProviders()),
      saml: {
        requireTimestamps: true,
        algorithms: { onDeprecated: "reject" },
      },
    }),
  ],
  telemetry: {
    enabled: false,
  },
  databaseHooks: {
    user: {
      create: {
        before: async () => {
          if (!registrationEnabled()) {
            throw new APIError("FORBIDDEN", {
              message: "Sign-up is disabled.",
            });
          }
        },
        after: async (user) => {
          await databaseRuntime.db
            .insert(appUsers)
            .values({
              authUserId: user.id,
              displayName: user.name,
              role: initialRole(user.email),
            })
            .onConflictDoNothing({ target: appUsers.authUserId });
        },
      },
    },
  },
  advanced: {
    ipAddress: {
      ipAddressHeaders: ["x-forwarded-for", "x-real-ip", "cf-connecting-ip"],
    },
  },
});
