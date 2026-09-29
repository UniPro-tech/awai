import { expect, test } from "@playwright/test";

test("login and registration modes render in the browser", async ({ page }) => {
  await page.route("**/api/config", (route) => route.fulfill({ json: { registrationEnabled: true, localAuthEnabled: true, ssoProviders: [{ providerId: "uniproject", name: "UniProject ID" }] } }));
  await page.goto("/login");
  await page.getByLabel("Language").selectOption("en");
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();

  await page.getByRole("button", { name: "Create an account" }).click();
  await expect(page.getByRole("heading", { name: "Create your account" })).toBeVisible();
  await expect(page.getByLabel("Email")).toHaveAttribute("type", "email");

  await page.getByRole("button", { name: "Sign in with OIDC / SAML SSO" }).click();
  await expect(page.getByRole("heading", { name: "OIDC / SAML single sign-on" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Sign in with UniProject ID" })).toBeVisible();
  await expect(page.getByLabel("Organization email")).toBeVisible();
});

test("language can be switched to Japanese", async ({ page }) => {
  await page.route("**/api/config", (route) => route.fulfill({ json: { registrationEnabled: true, localAuthEnabled: true, ssoProviders: [] } }));
  await page.goto("/login");
  await page.getByLabel(/Language|表示言語/).selectOption("ja");
  await expect(page.getByRole("heading", { name: "ログイン" })).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "ja");
});

test("local credentials are absent in SSO-only mode", async ({ page }) => {
  await page.route("**/api/config", (route) => route.fulfill({ json: { registrationEnabled: true, localAuthEnabled: false, ssoProviders: [] } }));
  await page.goto("/login");
  await page.getByLabel(/Language|表示言語/).selectOption("en");
  await expect(page.getByRole("heading", { name: "OIDC / SAML single sign-on" })).toBeVisible();
  await expect(page.getByLabel("Username")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Use local sign in" })).toHaveCount(0);
});
