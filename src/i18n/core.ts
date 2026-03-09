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
  const englishTemplate = resolveMessage(messagesByLocale.en, key);
  const template = fromLocale ?? englishTemplate ?? key;
  const fromLocaleCorrupted = fromLocale ? isProbablyCorruptedText(fromLocale) : false;
  const englishTemplateCorrupted = englishTemplate ? isProbablyCorruptedText(englishTemplate) : false;

  if (fromLocale && fromLocaleCorrupted) {
    if (englishTemplate && !englishTemplateCorrupted) {
      return interpolateMessage(englishTemplate, variables);
    }

    return key;
  }

  if (!fromLocale && englishTemplate && !englishTemplateCorrupted) {
    return interpolateMessage(englishTemplate, variables);
  }

  return interpolateMessage(template, variables);
};

const hasKorean = (value: string) => /[\uAC00-\uD7A3]/.test(value);
const hasEastAsianLikeText = (value: string) => /[\u0800-\u09FF\u2E80-\uD7AF\uF900-\uFAFF]/.test(value);
const hasNonAscii = (value: string) => /[^\u0000-\u007F]/.test(value);

const isProbablyCorruptedText = (value: string) => {
  if (!value) {
    return false;
  }

  if (value.includes("\uFFFD")) {
    return true;
  }

  if (value.includes("?")) {
    const nonAsciiCount = Array.from(value).filter((char) => char.charCodeAt(0) > 127).length;
    if (nonAsciiCount > 0) {
      return true;
    }
  }

  const nonAsciiRatio = Array.from(value).filter((char) => char.charCodeAt(0) > 127).length / value.length;
  const hasLatentLatin = /[A-Za-z0-9]/.test(value);

  // Heuristic: broken Korean often becomes non-ascii CJK-like text with no Hangul syllables
  // and no latin/alphanumeric words.
  if (nonAsciiRatio > 0.45 && !hasKorean(value) && hasEastAsianLikeText(value) && !hasLatentLatin) {
    return true;
  }

  // Also treat high-non-ascii text with no clear language signal as suspicious.
  return hasNonAscii(value) && nonAsciiRatio > 0.8 && !hasKorean(value) && !hasLatentLatin;
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
