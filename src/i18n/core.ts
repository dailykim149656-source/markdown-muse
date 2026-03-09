import en from "@/i18n/messages/en";
import ko from "@/i18n/messages/ko";
import type { Locale, MessageTree, MessageVariables } from "@/i18n/types";

export const DEFAULT_LOCALE: Locale = "ko";
export const LOCALE_STORAGE_KEY = "docsy-ui-language";

export const messagesByLocale: Record<Locale, MessageTree> = {
  en,
  ko,
};

const resolveMessage = (messages: MessageTree, key: string): string | undefined => {
  const value = key.split(".").reduce<string | MessageTree | undefined>((current, segment) => {
    if (!current || typeof current === "string") {
      return current;
    }

    return current[segment];
  }, messages);

  return typeof value === "string" ? value : undefined;
};

export const interpolateMessage = (template: string, variables?: MessageVariables) => {
  if (!variables) {
    return template;
  }

  return template.replace(/\{(\w+)\}/g, (_, token: string) => {
    const value = variables[token];
    return value === undefined || value === null ? "" : String(value);
  });
};

export const translateMessage = (locale: Locale, key: string, variables?: MessageVariables) => {
  const fromLocale = resolveMessage(messagesByLocale[locale], key);
  const fallback = locale === DEFAULT_LOCALE ? undefined : resolveMessage(messagesByLocale[DEFAULT_LOCALE], key);
  const template = fromLocale ?? fallback ?? key;

  return interpolateMessage(template, variables);
};

export const normalizeLocale = (value?: string | null): Locale | null => {
  if (value === "ko" || value === "en") {
    return value;
  }

  return null;
};

export const detectInitialLocale = (storedLocale?: string | null, browserLanguage?: string | null): Locale => {
  const normalizedStored = normalizeLocale(storedLocale);

  if (normalizedStored) {
    return normalizedStored;
  }

  if (browserLanguage?.toLowerCase().startsWith("ko")) {
    return "ko";
  }

  return "en";
};

