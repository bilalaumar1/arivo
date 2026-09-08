export const locales = [
  "en",
  "fr",
  "ar",
  "hi",
  "pt",
  "es",
] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";

export const localeNames: Record<Locale, string> = {
  en: "English",
  fr: "Français",
  ar: "العربية",
  hi: "हिन्दी",
  pt: "Português",
  es: "Español",
};