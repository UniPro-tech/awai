import { expect, test, type Page } from "@playwright/test";

async function mockSignedInApp(page: Page) {
  await page.addInitScript(() => localStorage.setItem("private-polis-language", "ja"));
  await page.route("**/api/auth/get-session", (route) => route.fulfill({ json: {
    user: { id: "auth-user", name: "テストユーザー", email: "user@example.com", emailVerified: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    session: { id: "session", userId: "auth-user", token: "test", expiresAt: new Date(Date.now() + 3600000).toISOString(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  } }));
  await page.route("**/api/v1/me", (route) => route.fulfill({ json: { id: "00000000-0000-4000-8000-000000000001", displayName: "テストユーザー", role: "USER" } }));
  await page.route("**/api/v1/topics", (route) => route.fulfill({ json: { items: [] } }));
}

test("desktop dashboard starts with the sidebar open and can collapse it", async ({ page }) => {
  await mockSignedInApp(page);
  await page.goto("/topics");
  const sidebar = page.getByLabel("メインナビゲーション");
  await expect(sidebar).toBeInViewport();
  await expect(page.getByRole("heading", { name: "トピック", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "メニューを開閉" }).click();
  await expect(sidebar).not.toBeInViewport();
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
