import { Pool } from "pg";

let pool: Pool | undefined;

export async function checkDatabaseReadiness(): Promise<boolean> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) return false;
  pool ??= new Pool({ connectionString: databaseUrl, max: 2 });
  try {
    await pool.query("select 1");
    return true;
  } catch {
    return false;
  }
}

export async function closeDatabaseHealthPool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = undefined;
  }
}
