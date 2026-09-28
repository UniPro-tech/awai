import i18n from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { initReactI18next } from "react-i18next";
import { resources } from "./resources";

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    supportedLngs: ["ja", "en"],
    fallbackLng: "ja",
    load: "languageOnly",
    interpolation: { escapeValue: false },
    detection: {
      order: ["localStorage", "navigator", "htmlTag"],
      caches: ["localStorage"],
      lookupLocalStorage: "private-polis-language",
    },
  });

function applyDocumentLanguage(language: string) {
  document.documentElement.lang = language.startsWith("en") ? "en" : "ja";
}

applyDocumentLanguage(i18n.resolvedLanguage ?? i18n.language);
i18n.on("languageChanged", applyDocumentLanguage);

export default i18n;
