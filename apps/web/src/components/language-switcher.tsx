import { Languages } from "lucide-react";
import { useTranslation } from "react-i18next";

export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { i18n, t } = useTranslation();
  const language = i18n.resolvedLanguage?.startsWith("en") ? "en" : "ja";

  return (
    <label className="language-switcher">
      <Languages aria-hidden="true" size={16} />
      <span className={compact ? "sr-only" : undefined}>{t("language.label")}</span>
      <select
        aria-label={t("language.label")}
        value={language}
        onChange={(event) => void i18n.changeLanguage(event.target.value)}
      >
        <option value="ja">{t("language.ja")}</option>
        <option value="en">{t("language.en")}</option>
      </select>
    </label>
  );
}
