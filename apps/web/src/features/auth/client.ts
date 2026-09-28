import { createAuthClient } from "better-auth/react";
import { usernameClient } from "better-auth/client/plugins";
import { ssoClient } from "@better-auth/sso/client";

export const authClient = createAuthClient({
  baseURL: window.location.origin,
  basePath: "/api/auth",
  plugins: [usernameClient(), ssoClient()],
});
