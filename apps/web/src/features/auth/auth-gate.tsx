import { useNavigate } from "@tanstack/react-router";
import { type PropsWithChildren, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { authClient } from "./client";

export function AuthGate({ children }: PropsWithChildren) {
  const session = authClient.useSession();
  const navigate = useNavigate();
  const { t } = useTranslation();

  useEffect(() => {
    if (!session.isPending && !session.data) void navigate({ to: "/login" });
  }, [navigate, session.data, session.isPending]);

  if (session.isPending) return <main className="shell"><p>{t("gate.session")}</p></main>;
  if (!session.data) return null;
  return children;
}
