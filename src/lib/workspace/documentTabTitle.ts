import type { WorkspaceBinding } from "@/types/workspace";

const GOOGLE_WORKSPACE_PROVIDER = "google_drive";
const MAX_TAB_TITLE_LENGTH = 24;
const ELLIPSIS_LENGTH = 3;
const SEPARATOR_CANDIDATES = [" - ", " | ", ":", "\u2022"] as const;

const isNonEmptyTitle = (value?: string | null): value is string =>
  typeof value === "string" && value.trim().length > 0;

export const normalizeDocumentTabTitle = (value: string) =>
  value.replace(/\s+/g, " ").trim();

const findSeparatorSegment = (value: string) => {
  for (const separator of SEPARATOR_CANDIDATES) {
    const separatorIndex = value.indexOf(separator);

    if (separatorIndex < 0) {
      continue;
    }

    const segment = value.slice(0, separatorIndex).trim();

    if (segment.length >= 4 && segment.length <= MAX_TAB_TITLE_LENGTH) {
      return segment;
    }
  }

  return null;
};

const truncateDocumentTabTitle = (value: string) =>
  `${value.slice(0, MAX_TAB_TITLE_LENGTH - ELLIPSIS_LENGTH)}...`;

export const shortenGoogleWorkspaceDocumentTitle = (value: string) => {
  const normalizedValue = normalizeDocumentTabTitle(value);

  if (normalizedValue.length <= MAX_TAB_TITLE_LENGTH) {
    return normalizedValue;
  }

  const separatorSegment = findSeparatorSegment(normalizedValue);

  if (separatorSegment) {
    return separatorSegment;
  }

  return truncateDocumentTabTitle(normalizedValue);
};

interface DocumentTabTitleOptions {
  fallbackTitle: string;
  name?: string | null;
  workspaceBinding?: WorkspaceBinding;
}

export const getDocumentTabTitle = ({
  fallbackTitle,
  name,
  workspaceBinding,
}: DocumentTabTitleOptions) => {
  const fullTitle = isNonEmptyTitle(name) ? name.trim() : fallbackTitle;

  if (workspaceBinding?.provider !== GOOGLE_WORKSPACE_PROVIDER) {
    return {
      displayTitle: fullTitle,
      fullTitle,
    };
  }

  return {
    displayTitle: shortenGoogleWorkspaceDocumentTitle(fullTitle),
    fullTitle,
  };
};
