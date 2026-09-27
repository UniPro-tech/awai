import { serve } from "@hono/node-server";
import { app } from "./app.js";
import { closeDatabaseHealthPool } from "./db/health.js";

const port = Number.parseInt(process.env.PORT ?? "3000", 10);

const server = serve({ fetch: app.fetch, port }, (info) => {
  console.log(`PrivatePolis server listening on http://localhost:${info.port}`);
});

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    server.close(async (error) => {
      await closeDatabaseHealthPool();
      if (error) console.error(error);
      process.exit(error ? 1 : 0);
    });
  });
}
