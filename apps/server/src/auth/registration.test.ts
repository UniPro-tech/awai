import { describe, expect, it } from "vitest";
import { registrationEnabled } from "./registration.js";

describe("registrationEnabled", () => {
  it.each([undefined, "", "true", "1", "yes", "on"])("allows registration for %s", (value) => {
    expect(registrationEnabled(value)).toBe(true);
  });

  it.each(["false", "FALSE", "0", "no", "off"])("blocks registration for %s", (value) => {
    expect(registrationEnabled(value)).toBe(false);
  });
});
