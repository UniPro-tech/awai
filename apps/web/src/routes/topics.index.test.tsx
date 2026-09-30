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
const urgentId = "00000000-0000-4000-8000-000000000012";
const communityId = "00000000-0000-4000-8000-000000000013";
const { listCategories, listTags, listTopics } = vi.hoisted(() => ({
  listCategories: vi.fn(),
  listTags: vi.fn(),
  listTopics: vi.fn(),
}));

vi.mock("../features/auth/auth-gate", () => ({
  AuthGate: ({ children }: PropsWithChildren) => children,
}));
vi.mock("../features/taxonomy/api", () => ({ listCategories, listTags }));
vi.mock("../features/topics/api", () => ({ listTopics }));

const TopicsPage = Route.options.component;
if (!TopicsPage) throw new Error("Topics route component is missing");

function topic(
  id: string,
  title: string,
  categoryId: string,
  categoryName: string,
  tag: { id: string; name: string },
) {
  return {
    id,
    title,
    description: "",
    author: { visibility: "IDENTIFIED", displayName: "Member" },
    statementIdentityPolicy: "OPTIONAL",
    status: "OPEN",
    permissions: { canModerateStatements: false },
    category: { id: categoryId, name: categoryName },
    tags: [tag],
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
    vi.clearAllMocks();
    await i18n.changeLanguage("en");
    listCategories.mockResolvedValue({
      items: [
        { id: governanceId, name: "Governance" },
        { id: cultureId, name: "Culture" },
      ],
    });
    listTags.mockResolvedValue({
      items: [
        { id: urgentId, name: "urgent" },
        { id: communityId, name: "community" },
      ],
    });
    const allTopics = [
      topic(
        "00000000-0000-4000-8000-000000000020",
        "Budget",
        governanceId,
        "Governance",
        { id: urgentId, name: "urgent" },
      ),
      topic(
        "00000000-0000-4000-8000-000000000021",
        "Festival",
        cultureId,
        "Culture",
        { id: communityId, name: "community" },
      ),
    ];
    listTopics.mockImplementation(async (query: { categoryId?: string; tagId?: string } = {}) => ({
      items: allTopics.filter(
        (item) =>
          (!query.categoryId || item.category.id === query.categoryId) &&
          (!query.tagId || item.tags.some((tag) => tag.id === query.tagId)),
      ),
    }));
  });

  it("requests and displays topics in the selected category", async () => {
    const user = userEvent.setup();
    renderTopics();

    expect(await screen.findByRole("link", { name: "Budget" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Festival" })).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText("Search by category"), governanceId);

    await waitFor(() => expect(listTopics).toHaveBeenLastCalledWith({ categoryId: governanceId }));
    expect(await screen.findByRole("link", { name: "Budget" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Festival" })).not.toBeInTheDocument();
  });

  it("requests and displays topics with the selected tag", async () => {
    const user = userEvent.setup();
    renderTopics();

    expect(await screen.findByRole("link", { name: "Budget" })).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText("Search by tag"), communityId);

    await waitFor(() => expect(listTopics).toHaveBeenLastCalledWith({ tagId: communityId }));
    expect(await screen.findByRole("link", { name: "Festival" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Budget" })).not.toBeInTheDocument();
  });
});
