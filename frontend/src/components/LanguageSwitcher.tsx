import { useTranslation } from "react-i18next";

export function LanguageSwitcher({ className = "" }: { className?: string }) {
  const { i18n } = useTranslation();
  const current = i18n.language.startsWith("en") ? "en" : "es";

  const setLang = (lng: "es" | "en") => {
    i18n.changeLanguage(lng);
  };

  return (
    <div className={`inline-flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm ${className}`}>
      <button
        type="button"
        onClick={() => setLang("es")}
        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
          current === "es" ? "bg-brand-600 text-white shadow-sm" : "text-slate-500 hover:text-slate-700"
        }`}
        aria-pressed={current === "es"}
      >
        ES
      </button>
      <button
        type="button"
        onClick={() => setLang("en")}
        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
          current === "en" ? "bg-brand-600 text-white shadow-sm" : "text-slate-500 hover:text-slate-700"
        }`}
        aria-pressed={current === "en"}
      >
        EN
      </button>
    </div>
  );
}
