import { createRootRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getCurrentUser } from "../features/auth/api";
import { authClient } from "../features/auth/client";

function RootLayout() {
  const isLogin = useRouterState({ select: (state) => state.location.pathname === "/login" });
  const session = authClient.useSession();
  const currentUser = useQuery({
    queryKey: ["current-user"],
    queryFn: getCurrentUser,
    enabled: Boolean(session.data),
    retry: false,
  });

  return (
    <>
      {!isLogin ? (
        <header className="app-header">
          <nav className="app-nav" aria-label="Primary navigation">
            <Link className="brand" to="/topics">PrivatePolis</Link>
            <div className="nav-links">
              <Link to="/topics" activeProps={{ "aria-current": "page" }}>Topics</Link>
              <Link to="/topics/new" activeProps={{ "aria-current": "page" }}>New topic</Link>
              <Link to="/profile" activeProps={{ "aria-current": "page" }}>Profile</Link>
              {currentUser.data?.role === "ADMIN" ? <Link to="/admin" activeProps={{ "aria-current": "page" }}>Admin</Link> : null}
            </div>
          </nav>
        </header>
      ) : null}
      <Outlet />
    </>
  );
}

export const Route = createRootRoute({ component: RootLayout });
