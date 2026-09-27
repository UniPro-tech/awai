import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: ["./src/db/schema.ts", "./src/db/auth-schema.ts"],
  out: "../../drizzle/migrations",
  dbCredentials: {
    url:
      process.env.DATABASE_URL ??
      "postgresql://private_polis:private_polis@localhost:5432/private_polis",
  },
  migrations: {
    schema: "drizzle",
    table: "__drizzle_migrations",
  },
  strict: true,
});
