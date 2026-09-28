import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { sso } from "@better-auth/sso";
import { betterAuth } from "better-auth";
import { username } from "better-auth/plugins";
import { eq } from "drizzle-orm";
import { appUsers } from "../db/schema.js";
import * as authSchema from "../db/auth-schema.js";
import { databaseRuntime } from "../db/runtime.js";
import { configuredTrustedOrigins } from "./origins.js";

function authSecret(): string {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (secret) return secret;
  if (process.env.NODE_ENV === "production") {
    throw new Error("BETTER_AUTH_SECRET is required in production.");
  }
  return "development-only-change-me-32-characters";
}

function initialRole(email: string): "USER" | "ADMIN" {
  const initialAdminEmail = process.env.INITIAL_ADMIN_EMAIL?.trim().toLowerCase();
  return initialAdminEmail && email.toLowerCase() === initialAdminEmail ? "ADMIN" : "USER";
}

async function ssoProviderLimit(user: { id: string }): Promise<number> {
  const [appUser] = await databaseRuntime.db
    .select({ role: appUsers.role, suspended: appUsers.suspended })
    .from(appUsers)
    .where(eq(appUsers.authUserId, user.id))
    .limit(1);
  return appUser?.role === "ADMIN" && !appUser.suspended ? 10 : 0;
}

async function guardSsoProviderMutation(input: { provider: { id: string } }): Promise<void> {
  const [provider] = await databaseRuntime.db
    .select({ userId: authSchema.ssoProvider.userId })
    .from(authSchema.ssoProvider)
    .where(eq(authSchema.ssoProvider.id, input.provider.id))
    .limit(1);
  if (!provider || (await ssoProviderLimit({ id: provider.userId })) === 0) {
    throw new Error("Only an active PrivatePolis administrator can manage SSO providers.");
  }
}

export const auth = betterAuth({
  basePath: "/api/auth",
  baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
  trustedOrigins: configuredTrustedOrigins(),
  secret: authSecret(),
  database: drizzleAdapter(databaseRuntime.db, {
    provider: "pg",
    schema: authSchema,
    schemaName: "auth",
    transaction: true,
  }),
  emailAndPassword: {
    enabled: true,
  },
  plugins: [
    username(),
    sso({
      providersLimit: ssoProviderLimit,
      guardProviderMutation: guardSsoProviderMutation,
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
});
