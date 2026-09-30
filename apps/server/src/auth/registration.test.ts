import { describe, expect, it } from "vitest";
import {
  categoryCreationAdminOnly,
  localAuthEnabled,
  publicSsoProviders,
  registrationEnabled,
} from "./registration.js";

describe("registrationEnabled", () => {
  it.each([undefined, "", "true", "1", "yes", "on"])("allows registration for %s", (value) => {
    expect(registrationEnabled(value)).toBe(true);
  });

  it.each(["false", "FALSE", "0", "no", "off"])("blocks registration for %s", (value) => {
    expect(registrationEnabled(value)).toBe(false);
  });
});

describe("localAuthEnabled", () => {
  it.each([undefined, "", "true", "1", "yes", "on"])("enables local auth for %s", (value) => {
    expect(localAuthEnabled(value)).toBe(true);
  });

  it.each(["false", "FALSE", "0", "no", "off"])("disables local auth for %s", (value) => {
    expect(localAuthEnabled(value)).toBe(false);
  });
});

describe("categoryCreationAdminOnly", () => {
  it.each([undefined, "", "false", "0", "no", "off", "invalid"])(
    "allows member category creation for %s",
    (value) => {
      expect(categoryCreationAdminOnly(value)).toBe(false);
    },
  );

  it.each(["true", "TRUE", "1", "yes", "on"])(
    "restricts category creation for %s",
    (value) => {
      expect(categoryCreationAdminOnly(value)).toBe(true);
    },
  );
});

describe("publicSsoProviders", () => {
  it("returns an empty list when no buttons are configured", () => {
    expect(publicSsoProviders(undefined)).toEqual([]);
  });

  it("parses provider IDs and public display names", () => {
    expect(publicSsoProviders('[{"providerId":"uniproject","name":"UniProject ID"}]')).toEqual([
      { providerId: "uniproject", name: "UniProject ID" },
    ]);
  });

  it("rejects invalid JSON and duplicate provider IDs", () => {
    expect(() => publicSsoProviders("not-json")).toThrow("valid JSON");
    expect(() => publicSsoProviders('[{"providerId":"idp","name":"One"},{"providerId":"idp","name":"Two"}]')).toThrow("duplicate");
  });
});
