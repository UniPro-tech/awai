import { expect, test, type Page } from "@playwright/test";

const adminId = "00000000-0000-4000-8000-000000000001";
const now = "2026-09-30T05:00:00.000Z";

const statementDeletion = {
  id: "00000000-0000-4000-8000-000000000020",
  actor: { id: adminId, displayName: "管理者" },
  action: "STATEMENT_DELETE",
  entityType: "statement",
  entityId: "00000000-0000-4000-8000-000000000010",
  metadata: { reason: "重複した意見" },
  createdAt: now,
};

const topicStatusChange = {
  id: "00000000-0000-4000-8000-000000000021",
  actor: { id: adminId, displayName: "管理者" },
  action: "TOPIC_STATUS_CHANGE",
  entityType: "topic",
  entityId: "00000000-0000-4000-8000-000000000011",
  metadata: { previousStatus: "DRAFT", status: "OPEN" },
  createdAt: "2026-09-30T04:00:00.000Z",
};

async function mockAdminApp(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem("private-polis-language", "ja");
    localStorage.setItem(
      "private-polis:onboarding:v1:00000000-0000-4000-8000-000000000001",
      "dismissed",
    );
  });
  await page.route("**/api/auth/get-session", (route) =>
    route.fulfill({
      json: {
        user: {
          id: "auth-admin",
          name: "管理者",
          email: "admin@example.com",
          emailVerified: true,
          createdAt: now,
          updatedAt: now,
        },
        session: {
          id: "session",
          userId: "auth-admin",
          token: "test",
          expiresAt: "2027-09-30T00:00:00.000Z",
          createdAt: now,
          updatedAt: now,
        },
      },
    }),
  );
  await page.route("**/api/v1/me", (route) =>
    route.fulfill({
      json: { id: adminId, displayName: "管理者", role: "ADMIN" },
    }),
  );
  await page.route(/\/api\/v1\/admin\/audit-logs(?:\?.*)?$/, (route) => {
    const url = new URL(route.request().url());
    const action = url.searchParams.get("action");
    const currentPage = Number(url.searchParams.get("page") ?? "1");
    if (action === "STATEMENT_DELETE") {
      return route.fulfill({
        json: {
          items: [statementDeletion],
          pagination: { page: 1, pageSize: 25, total: 1, totalPages: 1 },
        },
      });
    }
    return route.fulfill({
      json: {
        items: [currentPage === 1 ? statementDeletion : topicStatusChange],
        pagination: {
          page: currentPage,
          pageSize: 25,
          total: 26,
          totalPages: 2,
        },
      },
    });
  });
}

test("administrator can browse and filter audit logs", async ({ page }) => {
  await mockAdminApp(page);
  await page.goto("/admin");

  await page.getByRole("link", { name: /監査ログ/ }).click();
  await expect(page.getByRole("heading", { name: "監査ログ" })).toBeVisible();
  await expect(
    page.getByRole("article").getByText("意見の削除", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText("管理者", { exact: true })).toBeVisible();

  await page.getByText("詳細を表示").click();
  await expect(page.getByText("重複した意見")).toBeVisible();

  await page.getByRole("button", { name: "次のページ" }).click();
  await expect(
    page.getByRole("article").getByText("トピック状態の変更"),
  ).toBeVisible();

  await page
    .getByLabel("操作種別で絞り込み")
    .selectOption("STATEMENT_DELETE");
  await expect(
    page.getByRole("article").getByText("意見の削除", { exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "次のページ" })).toHaveCount(0);
});
