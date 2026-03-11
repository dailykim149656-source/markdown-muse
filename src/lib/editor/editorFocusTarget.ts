import type { KnowledgeGraphNavigationTarget } from "@/lib/knowledge/workspaceInsights";

const PENDING_EDITOR_FOCUS_TARGET_KEY = "docsy-pending-editor-focus-target";

const isPendingEditorFocusTarget = (value: unknown): value is KnowledgeGraphNavigationTarget => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const candidate = value as Partial<KnowledgeGraphNavigationTarget>;
  return typeof candidate.documentId === "string";
};

export const setPendingEditorFocusTarget = (target: KnowledgeGraphNavigationTarget) => {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.setItem(PENDING_EDITOR_FOCUS_TARGET_KEY, JSON.stringify(target));
};

export const getPendingEditorFocusTarget = (): KnowledgeGraphNavigationTarget | null => {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.sessionStorage.getItem(PENDING_EDITOR_FOCUS_TARGET_KEY);

    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as unknown;
    return isPendingEditorFocusTarget(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

export const clearPendingEditorFocusTarget = () => {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.removeItem(PENDING_EDITOR_FOCUS_TARGET_KEY);
};
