import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { betterAuth } from "better-auth";
import { username } from "better-auth/plugins";
import { appUsers } from "../db/schema.js";
import * as authSchema from "../db/auth-schema.js";
import { databaseRuntime } from "../db/runtime.js";

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

export const auth = betterAuth({
  basePath: "/api/auth",
  baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
  secret: authSecret(),
  database: drizzleAdapter(databaseRuntime.db, {
    provider: "pg",
    schema: authSchema,
    schemaName: "auth",
  }),
  emailAndPassword: {
    enabled: true,
  },
  plugins: [username()],
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
