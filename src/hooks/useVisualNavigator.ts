import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  navigateVisualUi,
  suggestVisualNavigatorGoals,
} from "@/lib/ai/visualNavigatorClient";
import { buildVisualNavigatorUiHints } from "@/lib/visualNavigator/buildUiHints";
import { captureViewportScreenshot } from "@/lib/visualNavigator/captureViewportScreenshot";
import { executeNavigatorAction } from "@/lib/visualNavigator/executor";
import { getNavigatorPresetGoals, type NavigatorGoalOption } from "@/lib/visualNavigator/presetGoals";
import { readRecentNavigatorGoals, recordRecentNavigatorGoal } from "@/lib/visualNavigator/recentGoals";
import { getNavigatorConfirmationReason } from "@/lib/visualNavigator/safety";
import { useI18n } from "@/i18n/useI18n";
import type {
  NavigatorAction,
  NavigatorGoalSuggestion,
  NavigatorHistoryEntry,
  NavigatorTurnResponse,
  NavigatorUiHints,
} from "@/types/visualNavigator";

const MAX_NAVIGATOR_STEPS = 6;
const MAX_NAVIGATOR_RUNTIME_MS = 15_000;
const MAX_UNRESOLVED_ACTIONS = 2;
const HISTORY_WINDOW = 6;
const CUSTOM_GOAL_LABEL_MAX = 48;

const getPostActionDelay = (actionType: string): number => {
  switch (actionType) {
    case "scroll":
    case "press_key":
      return 100;
    case "click":
    case "type":
    default:
      return 250;
  }
};

interface PendingNavigatorConfirmation {
  action: Exclude<NavigatorAction, { type: "ask_followup" } | { type: "done" } | { type: "wait" }>;
  confidence: number;
  rationale: string;
  reason: string;
}

interface UseVisualNavigatorOptions {
  onCloseAssistant: () => void;
}

export interface VisualNavigatorRuntimeState {
  advancedCommandOpen: boolean;
  canStart: boolean;
  clearHistory: () => void;
  confirmPendingAction: () => Promise<void>;
  history: NavigatorHistoryEntry[];
  intent: string;
  isRefreshingSuggestions: boolean;
  isRunning: boolean;
  lastConfidence: number | null;
  lastError: string | null;
  lastRationale: string | null;
  pendingConfirmation: PendingNavigatorConfirmation | null;
  postCompletionSuggestion: NavigatorGoalSuggestion | null;
  presetGoals: NavigatorGoalOption[];
  quickStartExpanded: boolean;
  recentGoals: NavigatorGoalOption[];
  refreshSuggestions: () => Promise<void>;
  rejectPendingAction: () => void;
  runAutoSuggest: () => Promise<void>;
  runGoal: (goal: NavigatorGoalSuggestion) => Promise<void>;
  selectedGoalIntent: string | null;
  setAdvancedCommandOpen: (open: boolean) => void;
  setIntent: (value: string) => void;
  setQuickStartExpanded: (open: boolean) => void;
  startRun: () => Promise<void>;
  statusText: string | null;
  stopReason: string | null;
  stopRun: () => void;
  suggestedGoals: NavigatorGoalOption[];
  suggestionsError: string | null;
}

const isImmediateTerminalAction = (action: NavigatorAction) =>
  action.type === "ask_followup" || action.type === "done";

const createGoalLabel = (intent: string) =>
  intent.length <= CUSTOM_GOAL_LABEL_MAX
    ? intent
    : `${intent.slice(0, CUSTOM_GOAL_LABEL_MAX - 1).trimEnd()}...`;

const toSuggestedGoalOption = (
  goal: NavigatorGoalSuggestion,
  index: number,
  source: NavigatorGoalOption["source"],
): NavigatorGoalOption => ({
  ...goal,
  key: `${source}-${index}-${goal.intent.toLowerCase().replace(/[^a-z0-9]+/gi, "-")}`,
  source,
});

const createCustomGoal = (intent: string): NavigatorGoalSuggestion => ({
  intent,
  label: createGoalLabel(intent),
  rationale: "Custom visual navigation goal.",
});

export const useVisualNavigator = ({
  onCloseAssistant,
}: UseVisualNavigatorOptions): VisualNavigatorRuntimeState => {
  const { locale } = useI18n();
  const [intent, setIntentState] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [isRefreshingSuggestions, setIsRefreshingSuggestions] = useState(false);
  const [statusText, setStatusText] = useState<string | null>(null);
  const [stopReason, setStopReason] = useState<string | null>(null);
  const [lastConfidence, setLastConfidence] = useState<number | null>(null);
  const [lastRationale, setLastRationale] = useState<string | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  const [history, setHistory] = useState<NavigatorHistoryEntry[]>([]);
  const [pendingConfirmation, setPendingConfirmation] = useState<PendingNavigatorConfirmation | null>(null);
  const [suggestions, setSuggestions] = useState<NavigatorGoalSuggestion[]>([]);
  const [suggestionsError, setSuggestionsError] = useState<string | null>(null);
  const [recentGoals, setRecentGoals] = useState<NavigatorGoalSuggestion[]>(() => readRecentNavigatorGoals());
  const [selectedGoalIntent, setSelectedGoalIntent] = useState<string | null>(null);
  const [advancedCommandOpen, setAdvancedCommandOpen] = useState(false);
  const [quickStartExpanded, setQuickStartExpanded] = useState(false);
  const [postCompletionSuggestion, setPostCompletionSuggestion] = useState<NavigatorGoalSuggestion | null>(null);
  const [latestUiHints, setLatestUiHints] = useState<NavigatorUiHints | null>(null);
  const historyRef = useRef<NavigatorHistoryEntry[]>([]);
  const refreshSuggestionsRef = useRef<() => Promise<void>>(async () => undefined);
  const activeRunIdRef = useRef(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  const appendHistory = useCallback((entry: NavigatorHistoryEntry) => {
    setHistory((current) => {
      const next = [...current, entry];
      historyRef.current = next;
      return next;
    });
  }, []);

  const captureNavigatorContext = useCallback(async () => {
    const screenshot = await captureViewportScreenshot();
    const ui = buildVisualNavigatorUiHints();
    setLatestUiHints(ui);

    return {
      screenshot,
      ui,
    };
  }, []);

  const refreshSuggestions = useCallback(async () => {
    if (isRunning) {
      return;
    }

    setIsRefreshingSuggestions(true);
    setSuggestionsError(null);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const { screenshot, ui } = await captureNavigatorContext();
      const response = await suggestVisualNavigatorGoals({
        locale,
        recentHistory: historyRef.current.slice(-HISTORY_WINDOW),
        screenshot,
        ui,
      }, { signal: controller.signal });

      setSuggestions(response.suggestions);
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        return;
      }

      const message = error instanceof Error ? error.message : "Failed to refresh visual navigation suggestions.";
      setSuggestionsError(message);
    } finally {
      setIsRefreshingSuggestions(false);
    }
  }, [captureNavigatorContext, isRunning, locale]);
  refreshSuggestionsRef.current = refreshSuggestions;

  const scheduleSuggestionRefresh = useCallback(() => {
    window.setTimeout(() => {
      void refreshSuggestionsRef.current();
    }, 0);
  }, []);

  const persistRecentGoal = useCallback((goal: NavigatorGoalSuggestion) => {
    const nextRecents = recordRecentNavigatorGoal(goal);
    setRecentGoals(nextRecents);
  }, []);

  const runIntent = useCallback(async (
    nextIntent: string,
    goal: NavigatorGoalSuggestion,
  ) => {
    const trimmedIntent = nextIntent.trim();

    if (!trimmedIntent || isRunning) {
      return;
    }

    const runId = activeRunIdRef.current + 1;
    activeRunIdRef.current = runId;
    const controller = new AbortController();
    abortControllerRef.current = controller;
    setIntentState(trimmedIntent);
    setSelectedGoalIntent(trimmedIntent);
    persistRecentGoal(goal);
    setIsRunning(true);
    setLastError(null);
    setPendingConfirmation(null);
    setStatusText("Preparing the visual navigator...");
    setStopReason(null);
    onCloseAssistant();

    const startedAt = Date.now();
    let executedSteps = 0;
    let unresolvedActions = 0;
    let shouldRefreshAfterRun = true;

    try {
      while (activeRunIdRef.current === runId) {
        if (executedSteps >= MAX_NAVIGATOR_STEPS) {
          setStopReason("Stopped after 6 executed steps.");
          break;
        }

        if (Date.now() - startedAt >= MAX_NAVIGATOR_RUNTIME_MS) {
          setStopReason("Stopped after 15 seconds.");
          break;
        }

        setStatusText("Capturing the current viewport...");
        const { screenshot, ui } = await captureNavigatorContext();
        setStatusText("Planning the next visible action...");
        const response: NavigatorTurnResponse = await navigateVisualUi({
          intent: trimmedIntent,
          locale,
          recentHistory: historyRef.current.slice(-HISTORY_WINDOW),
          screenshot,
          ui,
        }, { signal: controller.signal });

        if (activeRunIdRef.current !== runId) {
          return;
        }

        setLastConfidence(response.confidence);
        setLastRationale(response.rationale);
        setStatusText(response.statusText);

        if (isImmediateTerminalAction(response.action)) {
          appendHistory({
            action: response.action,
            confidence: response.confidence,
            executedAt: Date.now(),
            outcome: response.action.type === "done" ? "done" : "followup",
            rationale: response.rationale,
            statusText: response.statusText,
          });
          setStopReason(response.action.type === "done" ? response.action.summary : response.action.question);
          break;
        }

        if (response.action.type === "wait") {
          const waitResult = await executeNavigatorAction(response.action);
          appendHistory({
            action: response.action,
            confidence: response.confidence,
            executedAt: Date.now(),
            outcome: waitResult.outcome,
            rationale: response.rationale,
            statusText: waitResult.message,
          });
          executedSteps += 1;
          unresolvedActions = 0;
          continue;
        }

        const confirmationReason = getNavigatorConfirmationReason({
          action: response.action,
        });

        if (confirmationReason) {
          shouldRefreshAfterRun = false;
          setPendingConfirmation({
            action: response.action,
            confidence: response.confidence,
            rationale: response.rationale,
            reason: confirmationReason,
          });
          setStatusText(confirmationReason);
          setStopReason("Awaiting confirmation.");
          break;
        }

        const execution = await executeNavigatorAction(response.action);
        appendHistory({
          action: response.action,
          confidence: response.confidence,
          executedAt: Date.now(),
          outcome: execution.outcome,
          rationale: response.rationale,
          statusText: execution.message,
          targetDescription: execution.targetDescription,
        });
        executedSteps += 1;

        if (execution.outcome === "executed") {
          unresolvedActions = 0;
        } else {
          unresolvedActions += 1;
          if (unresolvedActions >= MAX_UNRESOLVED_ACTIONS) {
            setStopReason("Stopped after 2 unresolved actions.");
            break;
          }
        }

        await new Promise((resolve) => window.setTimeout(resolve, getPostActionDelay(response.action.type)));
      }
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        return;
      }

      const message = error instanceof Error ? error.message : "The visual navigator run failed.";
      setLastError(message);
      setStopReason(message);
      setStatusText(message);
      toast.error(message);
    } finally {
      if (activeRunIdRef.current === runId) {
        setIsRunning(false);

        if (shouldRefreshAfterRun) {
          scheduleSuggestionRefresh();

          window.setTimeout(async () => {
            try {
              const { screenshot, ui } = await captureNavigatorContext();
              const response = await suggestVisualNavigatorGoals({
                locale,
                recentHistory: historyRef.current.slice(-HISTORY_WINDOW),
                screenshot,
                ui,
              });

              const topGoal = response.suggestions
                .filter((s) => (s.confidence ?? 0) >= 0.75)
                .sort((a, b) => (b.confidence ?? 0) - (a.confidence ?? 0))[0];

              if (topGoal) {
                setPostCompletionSuggestion(topGoal);
              }
            } catch {
              // Silently ignore post-completion suggestion failures.
            }
          }, 500);
        }
      }
    }
  }, [
    appendHistory,
    captureNavigatorContext,
    isRunning,
    locale,
    onCloseAssistant,
    persistRecentGoal,
    scheduleSuggestionRefresh,
  ]);

  const stopRun = useCallback(() => {
    abortControllerRef.current?.abort();
    activeRunIdRef.current += 1;
    setIsRunning(false);
    setStatusText("Visual navigator stopped.");
    setStopReason("Visual navigator stopped.");
    scheduleSuggestionRefresh();
  }, [scheduleSuggestionRefresh]);

  const clearHistory = useCallback(() => {
    historyRef.current = [];
    setHistory([]);
    setLastConfidence(null);
    setLastError(null);
    setLastRationale(null);
    setPendingConfirmation(null);
    setSelectedGoalIntent(null);
    setStatusText(null);
    setStopReason(null);
  }, []);

  const executeConfirmedAction = useCallback(async (
    action: PendingNavigatorConfirmation["action"],
    metadata: Pick<PendingNavigatorConfirmation, "confidence" | "rationale">,
  ) => {
    const execution = await executeNavigatorAction(action);
    appendHistory({
      action,
      confidence: metadata.confidence,
      executedAt: Date.now(),
      outcome: execution.outcome,
      rationale: metadata.rationale,
      statusText: execution.message,
      targetDescription: execution.targetDescription,
    });

    if (execution.outcome !== "executed") {
      toast.error(execution.message);
    }

    setStatusText(execution.message);
    setStopReason(execution.message);
    scheduleSuggestionRefresh();
  }, [appendHistory, scheduleSuggestionRefresh]);

  const confirmPendingAction = useCallback(async () => {
    if (!pendingConfirmation) {
      return;
    }

    const nextConfirmation = pendingConfirmation;
    setPendingConfirmation(null);
    await executeConfirmedAction(nextConfirmation.action, nextConfirmation);
  }, [executeConfirmedAction, pendingConfirmation]);

  const rejectPendingAction = useCallback(() => {
    if (!pendingConfirmation) {
      return;
    }

    appendHistory({
      action: pendingConfirmation.action,
      confidence: pendingConfirmation.confidence,
      executedAt: Date.now(),
      outcome: "blocked",
      rationale: pendingConfirmation.rationale,
      statusText: pendingConfirmation.reason,
    });
    setPendingConfirmation(null);
    setStatusText("The high-impact action was not executed.");
    setStopReason("The high-impact action was not executed.");
    scheduleSuggestionRefresh();
  }, [appendHistory, pendingConfirmation, scheduleSuggestionRefresh]);

  const setIntent = useCallback((value: string) => {
    setIntentState(value);
    setSelectedGoalIntent(null);
  }, []);

  const startRun = useCallback(async () => {
    const trimmedIntent = intent.trim();

    if (!trimmedIntent) {
      return;
    }

    setAdvancedCommandOpen(true);
    await runIntent(trimmedIntent, createCustomGoal(trimmedIntent));
  }, [intent, runIntent]);

  const runGoal = useCallback(async (goal: NavigatorGoalSuggestion) => {
    setAdvancedCommandOpen(false);
    setPostCompletionSuggestion(null);
    await runIntent(goal.intent, goal);
  }, [runIntent]);

  const runAutoSuggest = useCallback(async () => {
    if (isRunning) {
      return;
    }

    setStatusText("Auto-detecting next action...");
    setPostCompletionSuggestion(null);

    try {
      const { screenshot, ui } = await captureNavigatorContext();
      const response = await suggestVisualNavigatorGoals({
        locale,
        recentHistory: historyRef.current.slice(-HISTORY_WINDOW),
        screenshot,
        ui,
      });

      const topGoal = response.suggestions
        .filter((s) => (s.confidence ?? 0) >= 0.75)
        .sort((a, b) => (b.confidence ?? 0) - (a.confidence ?? 0))[0];

      if (topGoal) {
        await runIntent(topGoal.intent, topGoal);
      } else {
        setSuggestions(response.suggestions);
        setStatusText("No high-confidence suggestion available. Choose a goal manually.");
        setQuickStartExpanded(true);
      }
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        return;
      }

      const message = error instanceof Error ? error.message : "Auto-suggest failed.";
      setLastError(message);
      setStatusText(message);
    }
  }, [captureNavigatorContext, isRunning, locale, runIntent]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "N") {
        e.preventDefault();

        if (isRunning) {
          return;
        }

        const topRecent = readRecentNavigatorGoals()[0];

        if (topRecent) {
          void runGoal(topRecent);
        } else {
          setQuickStartExpanded(true);
        }
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isRunning, runGoal]);

  const canStart = intent.trim().length > 0 && !isRunning;
  const presetGoals = useMemo(
    () => getNavigatorPresetGoals(latestUiHints || undefined),
    [latestUiHints],
  );
  const suggestedGoals = useMemo(
    () => suggestions.map((goal, index) => toSuggestedGoalOption(goal, index, "suggested")),
    [suggestions],
  );
  const recentGoalOptions = useMemo(
    () => recentGoals.map((goal, index) => toSuggestedGoalOption(goal, index, "recent")),
    [recentGoals],
  );

  return useMemo(() => ({
    advancedCommandOpen,
    canStart,
    clearHistory,
    confirmPendingAction,
    history,
    intent,
    isRefreshingSuggestions,
    isRunning,
    lastConfidence,
    lastError,
    lastRationale,
    pendingConfirmation,
    postCompletionSuggestion,
    presetGoals,
    quickStartExpanded,
    recentGoals: recentGoalOptions,
    refreshSuggestions,
    rejectPendingAction,
    runAutoSuggest,
    runGoal,
    selectedGoalIntent,
    setAdvancedCommandOpen,
    setIntent,
    setQuickStartExpanded,
    startRun,
    statusText,
    stopReason,
    stopRun,
    suggestedGoals,
    suggestionsError,
  }), [
    advancedCommandOpen,
    canStart,
    clearHistory,
    confirmPendingAction,
    history,
    intent,
    isRefreshingSuggestions,
    isRunning,
    lastConfidence,
    lastError,
    lastRationale,
    pendingConfirmation,
    postCompletionSuggestion,
    presetGoals,
    quickStartExpanded,
    recentGoalOptions,
    refreshSuggestions,
    rejectPendingAction,
    runAutoSuggest,
    runGoal,
    selectedGoalIntent,
    setAdvancedCommandOpen,
    setIntent,
    startRun,
    statusText,
    stopReason,
    stopRun,
    suggestedGoals,
    suggestionsError,
  ]);
};
