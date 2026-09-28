import { useQuery } from "@tanstack/react-query";
import type { PropsWithChildren } from "react";
import { useTranslation } from "react-i18next";
import { getCurrentUser } from "./api";
import { AuthGate } from "./auth-gate";
import { errorMessage } from "../../lib/error-message";

function AdminBoundary({ children }: PropsWithChildren) {
  const { t } = useTranslation();
  const currentUser = useQuery({ queryKey: ["current-user"], queryFn: getCurrentUser, retry: false });
  if (currentUser.isPending) return <main className="shell"><p>{t("gate.admin")}</p></main>;
  if (currentUser.error) return <main className="shell"><p role="alert">{errorMessage(currentUser.error, t)}</p></main>;
  if (currentUser.data.role !== "ADMIN") {
    return <main className="shell"><section className="panel empty-state"><h1>{t("gate.required")}</h1><p>{t("gate.denied")}</p></section></main>;
  }
  return children;
}

export function AdminGate({ children }: PropsWithChildren) {
  return <AuthGate><AdminBoundary>{children}</AdminBoundary></AuthGate>;
}
