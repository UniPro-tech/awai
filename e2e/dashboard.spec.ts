import { expect, test, type Page } from "@playwright/test";

async function mockSignedInApp(page: Page, onboardingDismissed = true) {
  await page.addInitScript((dismissed) => {
    localStorage.setItem("private-polis-language", "ja");
    if (dismissed) {
      localStorage.setItem(
        "private-polis:onboarding:v1:00000000-0000-4000-8000-000000000001",
        "dismissed",
      );
    }
  }, onboardingDismissed);
  await page.route("**/api/auth/get-session", (route) => route.fulfill({ json: {
    user: { id: "auth-user", name: "テストユーザー", email: "user@example.com", emailVerified: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    session: { id: "session", userId: "auth-user", token: "test", expiresAt: new Date(Date.now() + 3600000).toISOString(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  } }));
  await page.route("**/api/v1/me", (route) => route.fulfill({ json: { id: "00000000-0000-4000-8000-000000000001", displayName: "テストユーザー", role: "USER" } }));
  await page.route("**/api/v1/categories", (route) => route.fulfill({ json: { items: [] } }));
  await page.route("**/api/v1/tags", (route) => route.fulfill({ json: { items: [] } }));
  await page.route("**/api/v1/topics", (route) => route.fulfill({ json: { items: [] } }));
}

test("first-time users can complete and dismiss onboarding", async ({ page }) => {
  await mockSignedInApp(page, false);
  await page.goto("/topics");

  await expect(page.getByRole("heading", { name: "違いを、対話の入り口に" })).toBeVisible();
  await page.getByRole("button", { name: "次へ" }).click();
  await expect(page.getByRole("heading", { name: "ひとつずつ、率直に答える" })).toBeVisible();
  await page.getByRole("button", { name: "次へ" }).click();
  await expect(page.getByRole("heading", { name: "意見の地図を眺める" })).toBeVisible();

  await page.getByRole("checkbox", { name: "今後は表示しない" }).check();
  await page.getByRole("button", { name: "はじめる" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);

  await page.reload();
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("desktop dashboard starts with the sidebar open and can collapse it", async ({ page }) => {
  await mockSignedInApp(page);
  await page.goto("/topics");
  const sidebar = page.getByLabel("メインナビゲーション");
  await expect(sidebar).toBeInViewport();
  await expect(page.getByRole("heading", { name: "トピック", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "メニューを開閉" }).click();
  await expect(sidebar).not.toBeInViewport();
});

test("feedback menu links to the GitHub issue templates", async ({ page }) => {
  await mockSignedInApp(page);
  await page.goto("/topics");

  await page.getByText("フィードバック", { exact: true }).click();
  const bugReport = page.getByRole("link", { name: "不具合を報告" });
  const featureRequest = page.getByRole("link", { name: "機能を提案" });

  await expect(bugReport).toHaveAttribute(
    "href",
    "https://github.com/UniPro-tech/awai/issues/new?template=bug.yml",
  );
  await expect(featureRequest).toHaveAttribute(
    "href",
    "https://github.com/UniPro-tech/awai/issues/new?template=feature.yml",
  );
  await expect(bugReport).toHaveAttribute("target", "_blank");
  await expect(featureRequest).toHaveAttribute("target", "_blank");
});

test("mobile dashboard starts closed and opens as a drawer", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mockSignedInApp(page);
  await page.goto("/topics");
  const sidebar = page.getByLabel("メインナビゲーション");
  await expect(sidebar).not.toBeInViewport();
  await page.getByRole("button", { name: "メニューを開閉" }).click();
  await expect(sidebar).toBeInViewport();
  await expect(sidebar.getByRole("button", { name: "メニューを閉じる" })).toBeVisible();
});
