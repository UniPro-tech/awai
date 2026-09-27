import { createRootRoute, createRoute, createRouter, Outlet, redirect } from "@tanstack/react-router";
import { TopicsPage } from "./routes/topics";

const rootRoute = createRootRoute({ component: () => <Outlet /> });
const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  beforeLoad: () => {
    throw redirect({ to: "/topics" });
  },
});
const topicsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/topics",
  component: TopicsPage,
});

const routeTree = rootRoute.addChildren([indexRoute, topicsRoute]);
export const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
