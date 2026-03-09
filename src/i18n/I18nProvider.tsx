import { createContext, useCallback, useEffect, useMemo, useState, type PropsWithChildren } from "react";
import { DEFAULT_LOCALE, LOCALE_STORAGE_KEY, detectInitialLocale, translateMessage } from "@/i18n/core";
import type { Locale, MessageVariables } from "@/i18n/types";

interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, variables?: MessageVariables) => string;
}

const defaultContextValue: I18nContextValue = {
  locale: DEFAULT_LOCALE,
  setLocale: () => undefined,
  t: (key, variables) => translateMessage(DEFAULT_LOCALE, key, variables),
};

export const I18nContext = createContext<I18nContextValue>(defaultContextValue);

const getInitialLocale = (): Locale => {
  if (typeof window === "undefined") {
    return DEFAULT_LOCALE;
  }

  return detectInitialLocale(window.localStorage.getItem(LOCALE_STORAGE_KEY), window.navigator.language);
};

export const I18nProvider = ({ children }: PropsWithChildren) => {
  const [locale, setLocaleState] = useState<Locale>(getInitialLocale);

  useEffect(() => {
    document.documentElement.lang = locale;
    window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  }, [locale]);

  const setLocale = useCallback((nextLocale: Locale) => {
    setLocaleState(nextLocale);
  }, []);

  const t = useCallback((key: string, variables?: MessageVariables) => translateMessage(locale, key, variables), [locale]);

  const value = useMemo<I18nContextValue>(() => ({
    locale,
    setLocale,
    t,
  }), [locale, setLocale, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};

