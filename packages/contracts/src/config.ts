import { z } from "zod";

export const PublicSsoProviderSchema = z.object({
  providerId: z.string().trim().min(1).max(100),
  name: z.string().trim().min(1).max(100),
});

export const PublicConfigResponseSchema = z.object({
  registrationEnabled: z.boolean(),
  localAuthEnabled: z.boolean(),
  ssoProviders: z.array(PublicSsoProviderSchema).max(20),
});

export type PublicSsoProvider = z.infer<typeof PublicSsoProviderSchema>;
export type PublicConfigResponse = z.infer<typeof PublicConfigResponseSchema>;
