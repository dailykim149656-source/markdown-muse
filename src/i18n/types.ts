export const SUPPORTED_LOCALES = ["ko", "en"] as const;

export type Locale = (typeof SUPPORTED_LOCALES)[number];

export type MessageVariables = Record<string, string | number | boolean | null | undefined>;

export type MessageTree = {
  [key: string]: string | MessageTree;
};

