export function registrationEnabled(value = process.env.REGISTRATION_ENABLED): boolean {
  if (value === undefined || value.trim() === "") return true;
  return !["false", "0", "no", "off"].includes(value.trim().toLowerCase());
}

export function localAuthEnabled(value = process.env.LOCAL_AUTH_ENABLED): boolean {
  if (value === undefined || value.trim() === "") return true;
  return !["false", "0", "no", "off"].includes(value.trim().toLowerCase());
}

export function publicSsoProviders(value = process.env.PUBLIC_SSO_PROVIDERS): PublicSsoProvider[] {
  if (value === undefined || value.trim() === "") return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    throw new Error("PUBLIC_SSO_PROVIDERS must be valid JSON.");
  }
  const providers = z.array(PublicSsoProviderSchema).max(20).parse(parsed);
  if (new Set(providers.map(({ providerId }) => providerId)).size !== providers.length) {
    throw new Error("PUBLIC_SSO_PROVIDERS must not contain duplicate providerId values.");
  }
  return providers;
}
import { PublicSsoProviderSchema, type PublicSsoProvider } from "@private-polis/contracts";
import { z } from "zod";
