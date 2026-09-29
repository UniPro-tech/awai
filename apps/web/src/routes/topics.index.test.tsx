import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import type { PropsWithChildren } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import i18n from "../i18n";
import { Route } from "./topics.index";

const governanceId = "00000000-0000-4000-8000-000000000010";
const cultureId = "00000000-0000-4000-8000-000000000011";
const { listCategories, listTopics } = vi.hoisted(() => ({
  listCategories: vi.fn(),
  listTopics: vi.fn(),
}));

vi.mock("../features/auth/auth-gate", () => ({
  AuthGate: ({ children }: PropsWithChildren) => children,
}));
vi.mock("../features/taxonomy/api", () => ({ listCategories }));
vi.mock("../features/topics/api", () => ({ listTopics }));

const TopicsPage = Route.options.component;
if (!TopicsPage) throw new Error("Topics route component is missing");

function topic(id: string, title: string, categoryId: string, categoryName: string) {
  return {
    id,
    title,
    description: "",
    author: { visibility: "IDENTIFIED", displayName: "Member" },
    statementIdentityPolicy: "OPTIONAL",
    status: "OPEN",
    category: { id: categoryId, name: categoryName },
    tags: [],
    createdAt: "2026-09-30T00:00:00.000Z",
    updatedAt: "2026-09-30T00:00:00.000Z",
  };
}

function renderTopics() {
  const rootRoute = createRootRoute();
  const topicsRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/topics",
    component: TopicsPage,
  });
  const router = createRouter({
    routeTree: rootRoute.addChildren([topicsRoute]),
    history: createMemoryHistory({ initialEntries: ["/topics"] }),
  });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
}

describe("TopicsPage", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("en");
    listCategories.mockResolvedValue({
      items: [
        { id: governanceId, name: "Governance" },
        { id: cultureId, name: "Culture" },
      ],
    });
    const allTopics = [
      topic("00000000-0000-4000-8000-000000000020", "Budget", governanceId, "Governance"),
      topic("00000000-0000-4000-8000-000000000021", "Festival", cultureId, "Culture"),
    ];
    listTopics.mockImplementation(async (categoryId?: string) => ({
      items: categoryId
        ? allTopics.filter((item) => item.category.id === categoryId)
        : allTopics,
    }));
  });

  it("requests and displays topics in the selected category", async () => {
    const user = userEvent.setup();
    renderTopics();

    expect(await screen.findByRole("link", { name: "Budget" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Festival" })).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText("Search by category"), governanceId);

    await waitFor(() => expect(listTopics).toHaveBeenLastCalledWith(governanceId));
    expect(await screen.findByRole("link", { name: "Budget" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Festival" })).not.toBeInTheDocument();
  });
});
