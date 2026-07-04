import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import es from "./locales/es.json";
import en from "./locales/en.json";

export const LANG_STORAGE_KEY = "autofinance_lang";

const saved = localStorage.getItem(LANG_STORAGE_KEY);
const initialLang = saved === "en" || saved === "es" ? saved : "es";

i18n.use(initReactI18next).init({
  resources: {
    es: { translation: es },
    en: { translation: en },
  },
  lng: initialLang,
  fallbackLng: "es",
  interpolation: { escapeValue: false },
});

i18n.on("languageChanged", (lng) => {
  localStorage.setItem(LANG_STORAGE_KEY, lng);
  document.documentElement.lang = lng;
});

document.documentElement.lang = initialLang;

export default i18n;
