import type { EditorMode } from "@/types/document";

const TEMPLATE_FALLBACK_COPY = {
  en: {
    title: "New Document",
    summary: "Summary",
    summaryPrompt: "Write a short summary.",
  },
  ko: {
    title: "??臾몄꽌",
    summary: "?붿빟",
    summaryPrompt: "媛꾨떒???붿빟???묒꽦?섏꽭??",
  },
} as const;

export const getTemplateFallbackContent = (mode: EditorMode, locale: "en" | "ko") => {
  const copy = TEMPLATE_FALLBACK_COPY[locale];

  switch (mode) {
    case "markdown":
      return [`# ${copy.title}`, "", `## ${copy.summary}`, "", copy.summaryPrompt].join("\n");
    case "latex":
      return [`\\section{${copy.summary}}`, copy.summaryPrompt].join("\n");
    case "html":
      return [`<h1>${copy.title}</h1>`, `<h2>${copy.summary}</h2>`, `<p>${copy.summaryPrompt}</p>`].join("\n");
    case "json":
      return JSON.stringify({ summary: copy.summaryPrompt }, null, 2);
    case "yaml":
      return `summary: ${copy.summaryPrompt}`;
    default:
      return "";
  }
};
