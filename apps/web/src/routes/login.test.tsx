import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import { describe, expect, it, vi } from "vitest";
import { Route } from "./login";

const LoginPage = Route.options.component;
if (!LoginPage) throw new Error("Login route component is missing");

vi.mock("../features/auth/client", () => ({
  authClient: {
    signIn: { username: vi.fn(), sso: vi.fn() },
    signUp: { email: vi.fn() },
  },
}));

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
  return render(<RouterProvider router={router} />);
}

describe("LoginPage", () => {
  it("switches between sign-in and account creation fields", async () => {
    const user = userEvent.setup();
    renderLogin();

    expect(await screen.findByRole("heading", { name: "Welcome back" })).toBeInTheDocument();
    expect(screen.queryByLabelText("Email")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Need an account? Sign up" }));

    expect(screen.getByRole("heading", { name: "Create your account" })).toBeInTheDocument();
    expect(screen.getByLabelText("Display name")).toBeRequired();
    expect(screen.getByLabelText("Email")).toHaveAttribute("type", "email");
  });

  it("offers domain-based single sign-on", async () => {
    const user = userEvent.setup();
    renderLogin();

    await user.click(await screen.findByRole("button", { name: "Sign in with SSO" }));

    expect(screen.getByRole("heading", { name: "Single sign-on" })).toBeInTheDocument();
    expect(screen.getByLabelText("Work email")).toHaveAttribute("type", "email");
    expect(screen.getByRole("button", { name: "Continue with SSO" })).toBeInTheDocument();
  });
});
