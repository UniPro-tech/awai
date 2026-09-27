import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { betterAuth } from "better-auth";
import { username } from "better-auth/plugins";
import { appUsers } from "../db/schema.js";
import * as authSchema from "../db/auth-schema.js";
import { createDatabase } from "../db/client.js";

const databaseUrl =
  process.env.DATABASE_URL ??
  "postgresql://private_polis:private_polis@localhost:5432/private_polis";
const runtime = createDatabase(databaseUrl);

function authSecret(): string {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (secret) return secret;
  if (process.env.NODE_ENV === "production") {
    throw new Error("BETTER_AUTH_SECRET is required in production.");
  }
  return "development-only-change-me-32-characters";
}

export const auth = betterAuth({
  basePath: "/api/auth",
  baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
  secret: authSecret(),
  database: drizzleAdapter(runtime.db, {
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
          await runtime.db
            .insert(appUsers)
            .values({ authUserId: user.id, displayName: user.name })
            .onConflictDoNothing({ target: appUsers.authUserId });
        },
      },
    },
  },
});

export async function closeAuthDatabase(): Promise<void> {
  await runtime.pool.end();
}
