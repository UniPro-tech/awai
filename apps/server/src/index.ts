import { serve } from "@hono/node-server";
import { app } from "./app.js";
import { closeDatabase } from "./db/runtime.js";

const port = Number.parseInt(process.env.PORT ?? "3000", 10);

const server = serve({ fetch: app.fetch, port }, (info) => {
  console.log(`Awai server listening on http://localhost:${info.port}`);
});

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    server.close(async (error) => {
      await closeDatabase();
      if (error) console.error(error);
      process.exit(error ? 1 : 0);
    });
  });
}
