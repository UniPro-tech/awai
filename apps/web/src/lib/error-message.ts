import type { TFunction } from "i18next";

export function errorMessage(error: Error, t: TFunction): string {
  const translated = t(`errors.${error.name}`, { defaultValue: "" });
  return translated || error.message || t("errors.fallback");
}
