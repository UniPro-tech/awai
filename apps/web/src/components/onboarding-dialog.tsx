import { Network, Sparkles, Vote, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

const ONBOARDING_VERSION = "v1";

export function onboardingStorageKey(userId: string) {
  return `private-polis:onboarding:${ONBOARDING_VERSION}:${userId}`;
}

export function OnboardingDialog({ userId }: { userId: string }) {
  const { t } = useTranslation();
  const [currentPage, setCurrentPage] = useState(0);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [open, setOpen] = useState(
    () => localStorage.getItem(onboardingStorageKey(userId)) !== "dismissed",
  );
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  const pages = [
    {
      icon: Sparkles,
      eyebrow: t("onboarding.welcomeEyebrow"),
      title: t("onboarding.welcomeTitle"),
      body: t("onboarding.welcomeBody"),
      note: t("onboarding.welcomeNote"),
    },
    {
      icon: Vote,
      eyebrow: t("onboarding.voteEyebrow"),
      title: t("onboarding.voteTitle"),
      body: t("onboarding.voteBody"),
      note: t("onboarding.voteNote"),
    },
    {
      icon: Network,
      eyebrow: t("onboarding.discoverEyebrow"),
      title: t("onboarding.discoverTitle"),
      body: t("onboarding.discoverBody"),
      note: t("onboarding.discoverNote"),
    },
  ];

  useEffect(() => {
    if (!open) return;
    previousActiveElement.current = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      previousActiveElement.current?.focus();
    };
  }, [open]);

  function close() {
    if (dontShowAgain) {
      localStorage.setItem(onboardingStorageKey(userId), "dismissed");
    }
    setOpen(false);
  }

  if (!open) return null;

  const isLastPage = currentPage === pages.length - 1;

  return (
    <div
      className="onboarding-backdrop"
      role="presentation"
      onKeyDown={(event) => {
        if (event.key === "Escape") close();
      }}
    >
      <section
        className="onboarding-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={`onboarding-title-${currentPage}`}
      >
        <button
          ref={closeButtonRef}
          className="icon-button onboarding-close"
          type="button"
          aria-label={t("onboarding.close")}
          onClick={close}
        >
          <X aria-hidden="true" size={20} />
        </button>

        <div className="onboarding-viewport">
          <div
            className="onboarding-track"
            style={{ transform: `translateX(-${currentPage * 100}%)` }}
          >
            {pages.map((page, index) => {
              const Icon = page.icon;
              return (
                <article
                  className="onboarding-page"
                  key={page.title}
                  aria-hidden={index !== currentPage}
                >
                  <div className="onboarding-illustration" aria-hidden="true">
                    <Icon size={42} strokeWidth={1.7} />
                  </div>
                  <p className="eyebrow">{page.eyebrow}</p>
                  <h1 id={`onboarding-title-${index}`}>{page.title}</h1>
                  <p className="onboarding-body">{page.body}</p>
                  <p className="onboarding-note">{page.note}</p>
                </article>
              );
            })}
          </div>
        </div>

        <div className="onboarding-pagination" aria-label={t("onboarding.pagination")}>
          {pages.map((page, index) => (
            <button
              type="button"
              key={page.title}
              className={index === currentPage ? "is-current" : undefined}
              aria-label={t("onboarding.goToPage", { page: index + 1 })}
              aria-current={index === currentPage ? "step" : undefined}
              onClick={() => setCurrentPage(index)}
            />
          ))}
        </div>

        <label className="onboarding-dismiss-choice">
          <input
            type="checkbox"
            checked={dontShowAgain}
            onChange={(event) => setDontShowAgain(event.target.checked)}
          />
          <span>{t("onboarding.dontShowAgain")}</span>
        </label>

        <div className="onboarding-actions">
          <button
            className="onboarding-secondary"
            type="button"
            disabled={currentPage === 0}
            onClick={() => setCurrentPage((page) => page - 1)}
          >
            {t("onboarding.back")}
          </button>
          <button
            type="button"
            onClick={() => {
              if (isLastPage) close();
              else setCurrentPage((page) => page + 1);
            }}
          >
            {t(isLastPage ? "onboarding.finish" : "onboarding.next")}
          </button>
        </div>
      </section>
    </div>
  );
}
