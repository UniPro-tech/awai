import { describe, expect, it, vi } from "vitest";
import {
  accountLinkingAllowedProviders,
  createSsoUserResolver,
} from "./account-linking.js";

describe("accountLinkingAllowedProviders", () => {
  it("does not allow any provider by default", () => {
    expect(accountLinkingAllowedProviders(undefined)).toEqual([]);
  });

  it("parses and trims allowed provider IDs", () => {
    expect(
      accountLinkingAllowedProviders('["uniproject", " corporate-saml "]'),
    ).toEqual(["uniproject", "corporate-saml"]);
  });

  it("rejects invalid JSON and duplicate provider IDs", () => {
    expect(() => accountLinkingAllowedProviders("uniproject")).toThrow(
      "valid JSON",
    );
    expect(() =>
      accountLinkingAllowedProviders('["uniproject","uniproject"]'),
    ).toThrow("duplicate");
  });
});

describe("createSsoUserResolver", () => {
  const input = {
    providerId: "uniproject",
    providerUser: { email: " USER@example.com " },
  } as never;

  it("links an allowed provider to a same-email existing user", async () => {
    const findOne = vi.fn().mockResolvedValue({ id: "existing-user" });
    const resolveUser = createSsoUserResolver(["uniproject"]);

    await expect(
      resolveUser(input, { database: { findOne } } as never),
    ).resolves.toEqual({
      action: "link",
      userId: "existing-user",
      profile: "preserve",
    });
    expect(findOne).toHaveBeenCalledWith({
      model: "user",
      where: [{ field: "email", value: "user@example.com" }],
      select: ["id"],
    });
  });

  it("does not query or link providers outside the allowlist", async () => {
    const findOne = vi.fn();
    const resolveUser = createSsoUserResolver([]);

    await expect(
      resolveUser(input, { database: { findOne } } as never),
    ).resolves.toEqual({ action: "continue" });
    expect(findOne).not.toHaveBeenCalled();
  });

  it("continues normal sign-up when no same-email user exists", async () => {
    const findOne = vi.fn().mockResolvedValue(null);
    const resolveUser = createSsoUserResolver(["uniproject"]);

    await expect(
      resolveUser(input, { database: { findOne } } as never),
    ).resolves.toEqual({ action: "continue" });
  });
});
