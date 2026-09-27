import { createDatabase } from "./client.js";

const databaseUrl =
  process.env.DATABASE_URL ??
  "postgresql://private_polis:private_polis@localhost:5432/private_polis";

export const databaseRuntime = createDatabase(databaseUrl);

let closed = false;

export async function closeDatabase(): Promise<void> {
  if (closed) return;
  closed = true;
  await databaseRuntime.pool.end();
}
