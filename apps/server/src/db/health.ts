import { databaseRuntime } from "./runtime.js";

export async function checkDatabaseReadiness(): Promise<boolean> {
  try {
    await databaseRuntime.pool.query("select 1");
    return true;
  } catch {
    return false;
  }
}
