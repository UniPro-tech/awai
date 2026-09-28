import { createRootRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { FolderKanban, Menu, PlusCircle, Settings, UserRound, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "../components/language-switcher";
import { getCurrentUser } from "../features/auth/api";
import { authClient } from "../features/auth/client";

function RootLayout() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const isLogin = pathname === "/login";
  const { t } = useTranslation();
  const [sidebarOpen, setSidebarOpen] = useState(() => typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia("(min-width: 900px)").matches);
  const session = authClient.useSession();
  const currentUser = useQuery({
    queryKey: ["current-user"],
    queryFn: getCurrentUser,
    enabled: Boolean(session.data),
    retry: false,
  });

  useEffect(() => {
    if (typeof window !== "undefined" && typeof window.matchMedia === "function" && !window.matchMedia("(min-width: 900px)").matches) setSidebarOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const desktop = window.matchMedia("(min-width: 900px)");
    const updateForBreakpoint = (event: MediaQueryListEvent) => setSidebarOpen(event.matches);
    desktop.addEventListener("change", updateForBreakpoint);
    return () => desktop.removeEventListener("change", updateForBreakpoint);
  }, []);

  if (isLogin) return <Outlet />;

  return (
    <div
      className={`dashboard ${sidebarOpen ? "sidebar-open" : "sidebar-closed"}`}
    >
      <header className="dashboard-header">
        <button
          className="icon-button menu-button"
          type="button"
          aria-label={t("nav.toggle")}
          aria-expanded={sidebarOpen}
          aria-controls="app-sidebar"
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          <Menu aria-hidden="true" />
        </button>
        <Link className="brand" to="/topics">
          Awai
        </Link>
        <div className="header-actions">
          <LanguageSwitcher compact />
          <Link className="profile-link" to="/profile">
            <UserRound aria-hidden="true" size={18} />
            <span>{currentUser.data?.displayName ?? t("common.profile")}</span>
          </Link>
        </div>
      </header>
      {sidebarOpen ? (
        <button
          type="button"
          className="sidebar-backdrop"
          aria-label={t("nav.close")}
          onClick={() => setSidebarOpen(false)}
        />
      ) : null}
      <aside
        id="app-sidebar"
        className="dashboard-sidebar"
        aria-label={t("nav.primary")}
      >
        <div className="sidebar-heading">
          <span>{t("nav.menu")}</span>
          <button
            className="icon-button sidebar-close"
            type="button"
            aria-label={t("nav.close")}
            onClick={() => setSidebarOpen(false)}
          >
            <X size={19} />
          </button>
        </div>
        <nav className="sidebar-nav">
          <Link
            to="/topics"
            activeOptions={{ exact: true }}
            activeProps={{ "aria-current": "page" }}
          >
            <FolderKanban size={19} />
            {t("common.topics")}
          </Link>
          <Link to="/topics/new" activeProps={{ "aria-current": "page" }}>
            <PlusCircle size={19} />
            {t("common.newTopic")}
          </Link>
          <Link to="/profile" activeProps={{ "aria-current": "page" }}>
            <UserRound size={19} />
            {t("common.profile")}
          </Link>
          {currentUser.data?.role === "ADMIN" ? (
            <Link to="/admin" activeProps={{ "aria-current": "page" }}>
              <Settings size={19} />
              {t("common.admin")}
            </Link>
          ) : null}
        </nav>
      </aside>
      <div className="dashboard-content">
        <Outlet />
      </div>
    </div>
  );
}

export const Route = createRootRoute({ component: RootLayout });
