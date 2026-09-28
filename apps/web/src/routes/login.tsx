import { useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { authClient } from "../features/auth/client";

type Mode = "sign-in" | "sign-up" | "sso";

export function LoginPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("sign-in");
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(undefined);
    const form = new FormData(event.currentTarget);
    if (mode === "sso") {
      const result = await authClient.signIn.sso({
        email: String(form.get("email")),
        callbackURL: "/topics",
        errorCallbackURL: "/login",
      });
      setPending(false);
      if (result.error) setError(result.error.message ?? "SSO authentication failed.");
      return;
    }

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
      setError(result.error.message ?? "Authentication failed.");
      return;
    }
    await navigate({ to: "/topics" });
  }

  return (
    <main className="auth-shell">
      <section className="auth-card">
        <p className="eyebrow">PrivatePolis</p>
        <h1>{mode === "sign-in" ? "Welcome back" : mode === "sign-up" ? "Create your account" : "Single sign-on"}</h1>
        <p>Join your community's private consensus space.</p>
        <form onSubmit={submit} className="auth-form">
          {mode === "sso" ? (
            <>
              <label htmlFor="email">Work email</label>
              <input id="email" name="email" required type="email" autoComplete="email" />
            </>
          ) : mode === "sign-up" ? (
            <>
              <label htmlFor="name">Display name</label>
              <input id="name" name="name" required maxLength={100} autoComplete="name" />
              <label htmlFor="email">Email</label>
              <input id="email" name="email" required type="email" autoComplete="email" />
            </>
          ) : null}
          {mode !== "sso" ? (
            <>
              <label htmlFor="username">Username</label>
              <input id="username" name="username" required autoComplete="username" />
              <label htmlFor="password">Password</label>
              <input
                id="password"
                name="password"
                required
                minLength={8}
                type="password"
                autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
              />
            </>
          ) : null}
          {error ? <p role="alert">{error}</p> : null}
          <button type="submit" disabled={pending}>
            {pending ? "Please wait…" : mode === "sign-in" ? "Sign in" : mode === "sign-up" ? "Create account" : "Continue with SSO"}
          </button>
        </form>
        <button
          className="button-link"
          type="button"
          onClick={() => {
            setError(undefined);
            setMode(mode === "sign-in" ? "sign-up" : "sign-in");
          }}
        >
          {mode === "sign-up" ? "Already registered? Sign in" : "Need an account? Sign up"}
        </button>
        <button
          className="button-link"
          type="button"
          onClick={() => {
            setError(undefined);
            setMode(mode === "sso" ? "sign-in" : "sso");
          }}
        >
          {mode === "sso" ? "Use local sign in" : "Sign in with SSO"}
        </button>
      </section>
    </main>
  );
}
