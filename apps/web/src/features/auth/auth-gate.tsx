import { useNavigate } from "@tanstack/react-router";
import { type PropsWithChildren, useEffect } from "react";
import { authClient } from "./client";

export function AuthGate({ children }: PropsWithChildren) {
  const session = authClient.useSession();
  const navigate = useNavigate();

  useEffect(() => {
    if (!session.isPending && !session.data) void navigate({ to: "/login" });
  }, [navigate, session.data, session.isPending]);

  if (session.isPending) return <main className="shell"><p>Checking your session…</p></main>;
  if (!session.data) return null;
  return children;
}
