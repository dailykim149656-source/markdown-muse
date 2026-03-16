import { schemaType } from "../gemini/client";
import type {
  NavigatorGoalSuggestion,
  NavigatorGoalSuggestionRequest,
  NavigatorGoalSuggestionResponse,
} from "../../../src/types/visualNavigator";

interface RawNavigatorGoalSuggestion {
  confidence?: number;
  intent?: string;
  label?: string;
  rationale?: string;
}

interface RawNavigatorGoalSuggestionResponse {
  suggestions?: RawNavigatorGoalSuggestion[];
}

const normalizeText = (value: string | undefined) => value?.trim() || "";

const normalizeConfidence = (value: number | undefined) => {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return undefined;
  }

  return Math.max(0, Math.min(1, parsed));
};

const normalizeSuggestion = (
  suggestion: RawNavigatorGoalSuggestion,
): NavigatorGoalSuggestion | null => {
  const intent = normalizeText(suggestion.intent);
  const label = normalizeText(suggestion.label) || intent;

  if (!intent || !label) {
    return null;
  }

  return {
    confidence: normalizeConfidence(suggestion.confidence),
    intent,
    label,
    rationale: normalizeText(suggestion.rationale) || "Suggested from the current visible Docsy UI.",
  };
};

const hasVisibleTarget = (
  request: NavigatorGoalSuggestionRequest,
  dataTarget: string,
) => request.ui.visibleTargets.some((target) => target.dataTarget === dataTarget);

const hasVisibleLabel = (
  request: NavigatorGoalSuggestionRequest,
  label: string,
) => request.ui.visibleLabels.some((visibleLabel) => visibleLabel.toLowerCase() === label.toLowerCase());

const buildHeuristicSuggestions = (
  request: NavigatorGoalSuggestionRequest,
): NavigatorGoalSuggestion[] => {
  const suggestions: NavigatorGoalSuggestion[] = [];

  if (!request.ui.modals.workspaceConnectionOpen && (
    hasVisibleTarget(request, "header-google-menu")
    || hasVisibleTarget(request, "workspace-manage-connection")
    || hasVisibleLabel(request, "Google")
  )) {
    suggestions.push({
      confidence: 0.64,
      intent: "Open the Google Workspace connection dialog.",
      label: "Open Google Workspace",
      rationale: "Google workspace controls are visible and the connection flow is not already open.",
    });
  }

  if (!request.ui.modals.patchReviewOpen && hasVisibleTarget(request, "header-open-patch-review")) {
    suggestions.push({
      confidence: 0.62,
      intent: "Open Patch Review.",
      label: "Open Patch Review",
      rationale: "Patch Review is visible from the current screen and can be opened directly.",
    });
  }

  if (hasVisibleTarget(request, "header-mode-trigger")) {
    suggestions.push({
      confidence: 0.58,
      intent: "Switch the editor to HTML mode.",
      label: "Switch to HTML",
      rationale: "The editor mode trigger is visible, so switching formats is a safe next goal.",
    });
    suggestions.push({
      confidence: 0.58,
      intent: "Switch the editor to LaTeX mode.",
      label: "Switch to LaTeX",
      rationale: "The editor mode trigger is visible, so switching formats is a safe next goal.",
    });
  }

  if (!request.ui.modals.aiAssistantOpen && hasVisibleTarget(request, "header-open-ai-assistant")) {
    suggestions.push({
      confidence: 0.56,
      intent: "Open AI Assistant.",
      label: "Open AI Assistant",
      rationale: "The assistant entry point is visible from the current screen.",
    });
  }

  return suggestions;
};

export const normalizeNavigatorGoalSuggestionResponse = ({
  request,
  response,
}: {
  request: NavigatorGoalSuggestionRequest;
  response: RawNavigatorGoalSuggestionResponse;
}): NavigatorGoalSuggestionResponse => {
  const normalized = (response.suggestions || [])
    .map(normalizeSuggestion)
    .filter((suggestion): suggestion is NavigatorGoalSuggestion => Boolean(suggestion));
  const heuristicSuggestions = buildHeuristicSuggestions(request);
  const merged = [...normalized, ...heuristicSuggestions];
  const seenIntents = new Set<string>();
  const unique = merged.filter((suggestion) => {
    const key = suggestion.intent.toLowerCase();

    if (seenIntents.has(key)) {
      return false;
    }

    seenIntents.add(key);
    return true;
  });

  return {
    suggestions: unique
      .sort((left, right) => (right.confidence || 0) - (left.confidence || 0))
      .slice(0, 5),
  };
};

export const navigatorGoalSuggestionResponseSchema = {
  properties: {
    suggestions: {
      items: {
        properties: {
          confidence: { type: schemaType.NUMBER },
          intent: { type: schemaType.STRING },
          label: { type: schemaType.STRING },
          rationale: { type: schemaType.STRING },
        },
        required: ["label", "intent", "rationale"],
        type: schemaType.OBJECT,
      },
      type: schemaType.ARRAY,
    },
  },
  required: ["suggestions"],
  type: schemaType.OBJECT,
};
