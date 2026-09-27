import { createRootRoute, createRoute, createRouter, Outlet, redirect } from "@tanstack/react-router";
import { TopicsPage } from "./routes/topics";
import { LoginPage } from "./routes/login";
import { TopicPage } from "./routes/topic";
import { ResultsPage } from "./routes/results";
import { AdminPage } from "./routes/admin";

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
const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/login",
  component: LoginPage,
});
const topicRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/topics/$topicId",
  component: TopicPage,
});
const resultsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/topics/$topicId/results",
  component: ResultsPage,
});
const adminRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/admin",
  component: AdminPage,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  loginRoute,
  topicsRoute,
  topicRoute,
  resultsRoute,
  adminRoute,
]);
export const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
