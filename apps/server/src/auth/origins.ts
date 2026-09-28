function parseOrigins(value: string | undefined): string[] {
  return value?.split(",").map((origin) => origin.trim()).filter(Boolean) ?? [];
}

function normalizeOrigin(value: string): string {
  return new URL(value).origin;
}

export function configuredTrustedOrigins(): string[] {
  const baseUrl = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
  const configured = parseOrigins(process.env.BETTER_AUTH_TRUSTED_ORIGINS);
  const development = process.env.NODE_ENV === "production" ? [] : ["http://localhost:5173"];
  return [...new Set([baseUrl, ...configured, ...development].map(normalizeOrigin))];
}
