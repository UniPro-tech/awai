import { serve } from "@hono/node-server";
import { app } from "./app.js";

const port = Number.parseInt(process.env.PORT ?? "3000", 10);

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`PrivatePolis server listening on http://localhost:${info.port}`);
});
