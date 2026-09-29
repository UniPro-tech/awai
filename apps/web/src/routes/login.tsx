import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "../components/language-switcher";
import { authClient } from "../features/auth/client";
import { getPublicConfig } from "../features/auth/config-api";

type Mode = "sign-in" | "sign-up" | "sso";

function LoginPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const config = useQuery({
    queryKey: ["public-config"],
    queryFn: getPublicConfig,
    retry: false,
  });
  const [mode, setMode] = useState<Mode>("sign-in");
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (config.data && !config.data.localAuthEnabled && mode !== "sso")
      setMode("sso");
  }, [config.data, mode]);

  async function startSso(input: { email?: string; providerId?: string }) {
    setPending(true);
    setError(undefined);
    const result = await authClient.signIn.sso({
      ...input,
      callbackURL: "/topics",
      errorCallbackURL: "/login",
    });
    setPending(false);
    if (result.error) setError(t("auth.ssoError"));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    if (mode === "sso") {
      // Email resolves a registered provider by domain; a provider button supplies providerId directly.
      await startSso({ email: String(form.get("email")) });
      return;
    }

    setPending(true);
    setError(undefined);

    const username = String(form.get("username"));
    const password = String(form.get("password"));

    const result =
      mode === "sign-in"
        ? await authClient.signIn.username({ username, password })
        : await authClient.signUp.email({
            email: String(form.get("email")),
            name: String(form.get("name")),
            username,
            password,
          });

    setPending(false);
    if (result.error) {
      setError(t("auth.error"));
      return;
    }
    await navigate({ to: "/topics" });
  }

  if (config.isPending || config.error) {
    return (
      <main className="auth-shell">
        <section className="auth-card">
          <div className="auth-card-header">
            <p className="brand">Awai</p>
            <LanguageSwitcher compact />
          </div>
          <p role={config.error ? "alert" : "status"}>
            {config.error ? t("auth.configError") : t("common.loading")}
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="auth-shell">
      <section className="auth-card">
        <div className="auth-card-header">
          <p className="brand">Awai</p>
          <LanguageSwitcher compact />
        </div>
        <h1>
          {mode === "sign-in"
            ? t("auth.signInTitle")
            : mode === "sign-up"
              ? t("auth.signUpTitle")
              : t("auth.ssoTitle")}
        </h1>
        <p>{t("auth.subtitle")}</p>
        {mode === "sso" ? (
          <p className="auth-sso-description">{t("auth.ssoDescription")}</p>
        ) : null}
        <form onSubmit={submit} className="auth-form">
          {mode === "sso" ? (
            <>
              {(config.data?.ssoProviders ?? []).length > 0 ? (
                <>
                  <div className="sso-provider-list">
                    {config.data?.ssoProviders.map((provider) => (
                      <button
                        className="sso-provider-button"
                        type="button"
                        key={provider.providerId}
                        disabled={pending}
                        onClick={() =>
                          void startSso({ providerId: provider.providerId })
                        }
                      >
                        {t("auth.signInWithProvider", { name: provider.name })}
                      </button>
                    ))}
                  </div>
                  <p className="sso-divider">
                    <span>{t("auth.orUseEmail")}</span>
                  </p>
                </>
              ) : null}
              <label htmlFor="email">{t("auth.workEmail")}</label>
              <input
                id="email"
                name="email"
                required
                type="email"
                autoComplete="email"
              />
            </>
          ) : mode === "sign-up" ? (
            <>
              <label htmlFor="name">{t("auth.displayName")}</label>
              <input
                id="name"
                name="name"
                required
                maxLength={100}
                autoComplete="name"
              />
              <label htmlFor="email">{t("auth.email")}</label>
              <input
                id="email"
                name="email"
                required
                type="email"
                autoComplete="email"
              />
            </>
          ) : null}
          {mode !== "sso" ? (
            <>
              <label htmlFor="username">{t("auth.username")}</label>
              <input
                id="username"
                name="username"
                required
                autoComplete="username"
              />
              <label htmlFor="password">{t("auth.password")}</label>
              <input
                id="password"
                name="password"
                required
                minLength={8}
                type="password"
                autoComplete={
                  mode === "sign-in" ? "current-password" : "new-password"
                }
              />
            </>
          ) : null}
          {config.data?.localAuthEnabled && config.data.registrationEnabled ? (
            <p>
              {mode === "sign-up"
                ? t("auth.haveAccount")
                : t("auth.needAccount")}{" "}
              <button
                className="button-link"
                type="button"
                onClick={() => {
                  setError(undefined);
                  setMode(mode === "sign-in" ? "sign-up" : "sign-in");
                }}
              >
                {mode === "sign-up"
                  ? t("auth.haveAccount")
                  : t("auth.needAccount")}
              </button>
            </p>
          ) : config.data?.localAuthEnabled && mode === "sign-in" ? (
            <p className="notice">{t("auth.registrationClosed")}</p>
          ) : null}
          {error ? <p role="alert">{error}</p> : null}
          <button type="submit" disabled={pending}>
            {pending
              ? t("auth.pending")
              : mode === "sign-in"
                ? t("auth.signIn")
                : mode === "sign-up"
                  ? t("auth.signUp")
                  : t("auth.ssoContinue")}
          </button>
        </form>
        {config.data?.localAuthEnabled ? (
          <button
            className="button-link"
            type="button"
            onClick={() => {
              setError(undefined);
              setMode(mode === "sso" ? "sign-in" : "sso");
            }}
          >
            {mode === "sso" ? t("auth.useLocal") : t("auth.useSso")}
          </button>
        ) : null}
      </section>
    </main>
  );
}

export const Route = createFileRoute("/login")({ component: LoginPage });
