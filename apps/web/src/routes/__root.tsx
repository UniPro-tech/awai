import { createRootRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";

function RootLayout() {
  const isLogin = useRouterState({ select: (state) => state.location.pathname === "/login" });

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
              <Link to="/admin" activeProps={{ "aria-current": "page" }}>Admin</Link>
            </div>
          </nav>
        </header>
      ) : null}
      <Outlet />
    </>
  );
}

export const Route = createRootRoute({ component: RootLayout });
