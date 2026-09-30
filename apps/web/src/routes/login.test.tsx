import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import i18n from "../i18n";
import { Route } from "./login";

const { getPublicConfig, signInSso } = vi.hoisted(() => ({
  getPublicConfig: vi.fn(),
  signInSso: vi.fn(),
}));

const LoginPage = Route.options.component;
if (!LoginPage) throw new Error("Login route component is missing");

vi.mock("../features/auth/client", () => ({
  authClient: {
    signIn: { username: vi.fn(), sso: signInSso },
    signUp: { email: vi.fn() },
  },
}));
vi.mock("../features/auth/config-api", () => ({ getPublicConfig }));

function renderLogin() {
  const rootRoute = createRootRoute();
  const loginRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/login",
    component: LoginPage,
  });
  const router = createRouter({
    routeTree: rootRoute.addChildren([loginRoute]),
    history: createMemoryHistory({ initialEntries: ["/login"] }),
  });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}><RouterProvider router={router} /></QueryClientProvider>);
}

describe("LoginPage", () => {
  beforeEach(async () => {
    getPublicConfig.mockResolvedValue({ registrationEnabled: true, localAuthEnabled: true, categoryCreationAdminOnly: false, ssoProviders: [] });
    signInSso.mockResolvedValue({ error: null });
    await i18n.changeLanguage("en");
  });

  it("switches between sign-in and account creation fields", async () => {
    const user = userEvent.setup();
    renderLogin();

    expect(await screen.findByRole("heading", { name: "Sign in" })).toBeInTheDocument();
    expect(screen.queryByLabelText("Email")).not.toBeInTheDocument();

    await user.click(await screen.findByRole("button", { name: "Create an account" }));

    expect(screen.getByRole("heading", { name: "Create your account" })).toBeInTheDocument();
    expect(screen.getByLabelText("Display name")).toBeRequired();
    expect(screen.getByLabelText("Email")).toHaveAttribute("type", "email");
  });

  it("hides account creation when registration is disabled", async () => {
    getPublicConfig.mockResolvedValue({ registrationEnabled: false, localAuthEnabled: true, categoryCreationAdminOnly: false, ssoProviders: [] });
    renderLogin();
    expect(await screen.findByText("New account registration is currently closed. Ask an administrator for access.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Create an account" })).not.toBeInTheDocument();
  });

  it("shows only SSO when local authentication is disabled", async () => {
    getPublicConfig.mockResolvedValue({ registrationEnabled: true, localAuthEnabled: false, categoryCreationAdminOnly: false, ssoProviders: [] });
    renderLogin();
    expect(await screen.findByRole("heading", { name: "OIDC / SAML single sign-on" })).toBeInTheDocument();
    expect(screen.getByText("Enter your organization email to use its registered OIDC or SAML provider.")).toBeInTheDocument();
    expect(screen.queryByLabelText("Username")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Use local sign in" })).not.toBeInTheDocument();
  });

  it("offers domain-based single sign-on", async () => {
    const user = userEvent.setup();
    renderLogin();

    await user.click(await screen.findByRole("button", { name: "Sign in with other OIDC / SAML SSO" }));

    expect(screen.getByRole("heading", { name: "OIDC / SAML single sign-on" })).toBeInTheDocument();
    expect(screen.getByLabelText("Organization email")).toHaveAttribute("type", "email");
    expect(screen.getByRole("button", { name: "Continue with OIDC / SAML SSO" })).toBeInTheDocument();
  });

  it("starts SSO directly from a configured provider button", async () => {
    getPublicConfig.mockResolvedValue({
      registrationEnabled: true,
      localAuthEnabled: true,
      categoryCreationAdminOnly: false,
      ssoProviders: [{ providerId: "uniproject", name: "UniProject ID" }],
    });
    const user = userEvent.setup();
    renderLogin();

    await user.click(
      await screen.findByRole("button", { name: "Sign in with UniProject ID" }),
    );

    expect(signInSso).toHaveBeenCalledWith({
      providerId: "uniproject",
      callbackURL: "/topics",
      errorCallbackURL: "/login",
    });
  });
});
