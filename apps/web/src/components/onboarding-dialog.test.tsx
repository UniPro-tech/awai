import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import i18n from "../i18n";
import { OnboardingDialog, onboardingStorageKey } from "./onboarding-dialog";

const userId = "00000000-0000-4000-8000-000000000001";

describe("OnboardingDialog", () => {
  beforeEach(async () => {
    localStorage.clear();
    await i18n.changeLanguage("en");
  });

  it("walks a first-time user through every page", async () => {
    const user = userEvent.setup();
    render(<OnboardingDialog userId={userId} />);

    expect(
      screen.getByRole("heading", { name: "Let differences open the conversation" }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Next" }));
    expect(
      screen.getByRole("heading", { name: "Answer honestly, one at a time" }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Next" }));
    expect(
      screen.getByRole("heading", { name: "Explore the opinion map" }),
    ).toBeInTheDocument();
  });

  it("remembers the dismissal for the current user", async () => {
    const user = userEvent.setup();
    const { unmount } = render(<OnboardingDialog userId={userId} />);

    await user.click(screen.getByRole("checkbox", { name: "Don't show this again" }));
    await user.click(screen.getByRole("button", { name: "Close onboarding" }));

    expect(localStorage.getItem(onboardingStorageKey(userId))).toBe("dismissed");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    unmount();
    render(<OnboardingDialog userId={userId} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("shows again after closing when dismissal is not selected", async () => {
    const user = userEvent.setup();
    const { unmount } = render(<OnboardingDialog userId={userId} />);

    await user.click(screen.getByRole("button", { name: "Close onboarding" }));
    expect(localStorage.getItem(onboardingStorageKey(userId))).toBeNull();

    unmount();
    render(<OnboardingDialog userId={userId} />);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
});
