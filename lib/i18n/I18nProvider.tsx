"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  defaultLocale,
  locales,
  type Locale,
} from "./config";

import { translations } from "./translations";

type TranslationTree =
  (typeof translations)[typeof defaultLocale];

type I18nContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (
    section: keyof TranslationTree,
    key: string
  ) => string;
};

const I18nContext =
  createContext<I18nContextValue | null>(null);

function isLocale(value: string): value is Locale {
  return locales.includes(value as Locale);
}

function getInitialLocale(): Locale {
  if (typeof window === "undefined") {
    return defaultLocale;
  }

  try {
    const saved = window.localStorage.getItem(
      "arivo:language"
    );

    if (saved && isLocale(saved)) {
      return saved;
    }
  } catch {
    // Keep English as fallback.
  }

  return defaultLocale;
}

export default function I18nProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [locale, setLocaleState] =
    useState<Locale>(getInitialLocale);

  const setLocale = useCallback((nextLocale: Locale) => {
    setLocaleState(nextLocale);

    try {
      window.localStorage.setItem(
        "arivo:language",
        nextLocale
      );

      window.dispatchEvent(
        new CustomEvent("arivo-language-changed", {
          detail: {
            language: nextLocale,
          },
        })
      );
    } catch {
      // Ignore storage errors.
    }
  }, []);

  useEffect(() => {
    const handleLanguageChange = (event: Event) => {
      const customEvent =
        event as CustomEvent<{ language?: string }>;

      const nextLanguage =
        customEvent.detail?.language;

      if (nextLanguage && isLocale(nextLanguage)) {
        setLocaleState(nextLanguage);
      }
    };

    window.addEventListener(
      "arivo-language-changed",
      handleLanguageChange
    );

    const handleStorage = (event: StorageEvent) => {
      if (
        event.key !== "arivo:language" ||
        !event.newValue
      ) {
        return;
      }

      if (isLocale(event.newValue)) {
        setLocaleState(event.newValue);
      }
    };

    window.addEventListener(
      "storage",
      handleStorage
    );

    return () => {
      window.removeEventListener(
        "arivo-language-changed",
        handleLanguageChange
      );

      window.removeEventListener(
        "storage",
        handleStorage
      );
    };
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;

    document.documentElement.dir =
      locale === "ar" ? "rtl" : "ltr";
  }, [locale]);

  const t = useCallback(
    (
      section: keyof TranslationTree,
      key: string
    ): string => {
      const sectionData =
        translations[locale][section] as
          | Record<string, string>
          | undefined;

      if (sectionData?.[key]) {
        return sectionData[key];
      }

      const englishSection =
        translations.en[section] as
          | Record<string, string>
          | undefined;

      return englishSection?.[key] ?? key;
    },
    [locale]
  );

  const value = useMemo(
    () => ({
      locale,
      setLocale,
      t,
    }),
    [locale, setLocale, t]
  );

  return (
    <I18nContext.Provider value={value}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);

  if (!context) {
    throw new Error(
      "useI18n must be used inside I18nProvider"
    );
  }

  return context;
}