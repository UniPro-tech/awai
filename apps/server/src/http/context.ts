import type { AuthenticatedUser } from "../auth/session.js";

export interface AppEnvironment {
  Variables: {
    currentUser: AuthenticatedUser;
    requestId: string;
  };
}
