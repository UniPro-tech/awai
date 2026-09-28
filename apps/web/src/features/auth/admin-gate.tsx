import { useQuery } from "@tanstack/react-query";
import type { PropsWithChildren } from "react";
import { getCurrentUser } from "./api";
import { AuthGate } from "./auth-gate";

function AdminBoundary({ children }: PropsWithChildren) {
  const currentUser = useQuery({ queryKey: ["current-user"], queryFn: getCurrentUser, retry: false });
  if (currentUser.isPending) return <main className="shell"><p>Checking administrator access…</p></main>;
  if (currentUser.error) return <main className="shell"><p role="alert">{currentUser.error.message}</p></main>;
  if (currentUser.data.role !== "ADMIN") {
    return <main className="shell"><section className="panel empty-state"><h1>Administrator access required</h1><p>Your account does not have permission to open this page.</p></section></main>;
  }
  return children;
}

export function AdminGate({ children }: PropsWithChildren) {
  return <AuthGate><AdminBoundary>{children}</AdminBoundary></AuthGate>;
}
