import { eq } from "drizzle-orm";
import { appUsers } from "../db/schema.js";
import { databaseRuntime } from "../db/runtime.js";
import { auth } from "./auth.js";

export interface AuthenticatedUser {
  id: string;
  displayName: string;
  role: "USER" | "ADMIN";
}

export type AuthenticationResult =
  | { status: "authenticated"; user: AuthenticatedUser }
  | { status: "unauthenticated" }
  | { status: "suspended" };

export type AuthenticateRequest = (headers: Headers) => Promise<AuthenticationResult>;

export const authenticateRequest: AuthenticateRequest = async (headers) => {
  const session = await auth.api.getSession({ headers });
  if (!session) return { status: "unauthenticated" };

  const [user] = await databaseRuntime.db
    .select({
      id: appUsers.id,
      displayName: appUsers.displayName,
      role: appUsers.role,
      suspended: appUsers.suspended,
    })
    .from(appUsers)
    .where(eq(appUsers.authUserId, session.user.id))
    .limit(1);

  if (!user) return { status: "unauthenticated" };
  if (user.suspended) return { status: "suspended" };
  return {
    status: "authenticated",
    user: { id: user.id, displayName: user.displayName, role: user.role },
  };
};
