import type {
  SSOUserResolutionContext,
  SSOUserResolutionInput,
} from "@better-auth/sso";
import { z } from "zod";

const AllowedProviderIdSchema = z.string().trim().min(1).max(100);

export function accountLinkingAllowedProviders(
  value = process.env.ACCOUNT_LINKING_ALLOWED_PROVIDERS,
): string[] {
  if (value === undefined || value.trim() === "") return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    throw new Error("ACCOUNT_LINKING_ALLOWED_PROVIDERS must be valid JSON.");
  }

  const providers = z.array(AllowedProviderIdSchema).max(20).parse(parsed);
  if (new Set(providers).size !== providers.length) {
    throw new Error(
      "ACCOUNT_LINKING_ALLOWED_PROVIDERS must not contain duplicate provider IDs.",
    );
  }
  return providers;
}

export function createSsoUserResolver(allowedProviders: readonly string[]) {
  const allowedProviderIds = new Set(allowedProviders);

  return async (
    input: SSOUserResolutionInput,
    context: SSOUserResolutionContext,
  ) => {
    if (!allowedProviderIds.has(input.providerId)) {
      return { action: "continue" } as const;
    }

    const existingUser = await context.database.findOne<{ id: string }>({
      model: "user",
      where: [
        {
          field: "email",
          value: input.providerUser.email.trim().toLowerCase(),
        },
      ],
      select: ["id"],
    });

    return existingUser
      ? ({ action: "link", userId: existingUser.id, profile: "preserve" } as const)
      : ({ action: "continue" } as const);
  };
}
