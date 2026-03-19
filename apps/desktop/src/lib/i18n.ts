import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import ar from "@/locales/ar.json";
import de from "@/locales/de.json";
import en from "@/locales/en.json";
import es from "@/locales/es.json";
import fr from "@/locales/fr.json";
import ja from "@/locales/ja.json";
import ko from "@/locales/ko.json";
import pt from "@/locales/pt.json";
import ru from "@/locales/ru.json";
import zh from "@/locales/zh.json";

export const LANGUAGES = [
  { code: "ar", label: "العربية" },
  { code: "de", label: "Deutsch" },
  { code: "en", label: "English" },
  { code: "es", label: "Español" },
  { code: "fr", label: "Français" },
  { code: "ja", label: "日本語" },
  { code: "pt", label: "Português" },
  { code: "ko", label: "한국어" },
  { code: "ru", label: "Русский" },
  { code: "zh", label: "中文" },
] as const;

const savedLng =
  typeof window !== "undefined"
    ? (localStorage.getItem("apiark-language") ?? "en")
    : "en";

i18n.use(initReactI18next).init({
  lng: savedLng,
  fallbackLng: "en",
  interpolation: {
    escapeValue: false,
  },
  resources: {
    ar: { translation: ar },
    de: { translation: de },
    en: { translation: en },
    es: { translation: es },
    fr: { translation: fr },
    ja: { translation: ja },
    ko: { translation: ko },
    pt: { translation: pt },
    ru: { translation: ru },
    zh: { translation: zh },
  },
});

export default i18n;
