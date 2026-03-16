import { useCallback, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { navigateVisualUi } from "@/lib/ai/visualNavigatorClient";
import { buildVisualNavigatorUiHints } from "@/lib/visualNavigator/buildUiHints";
import { captureViewportScreenshot } from "@/lib/visualNavigator/captureViewportScreenshot";
import { executeNavigatorAction } from "@/lib/visualNavigator/executor";
import { getNavigatorConfirmationReason } from "@/lib/visualNavigator/safety";
import { useI18n } from "@/i18n/useI18n";
import type { NavigatorAction, NavigatorHistoryEntry, NavigatorTurnResponse } from "@/types/visualNavigator";

const MAX_NAVIGATOR_STEPS = 6;
const MAX_NAVIGATOR_RUNTIME_MS = 15_000;
const MAX_UNRESOLVED_ACTIONS = 2;
const HISTORY_WINDOW = 6;

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
  canStart: boolean;
  clearHistory: () => void;
  confirmPendingAction: () => Promise<void>;
  history: NavigatorHistoryEntry[];
  intent: string;
  isRunning: boolean;
  lastConfidence: number | null;
  lastError: string | null;
  lastRationale: string | null;
  pendingConfirmation: PendingNavigatorConfirmation | null;
  rejectPendingAction: () => void;
  setIntent: (value: string) => void;
  startRun: () => Promise<void>;
  statusText: string | null;
  stopReason: string | null;
  stopRun: () => void;
}

const isImmediateTerminalAction = (action: NavigatorAction) =>
  action.type === "ask_followup" || action.type === "done";

export const useVisualNavigator = ({
  onCloseAssistant,
}: UseVisualNavigatorOptions): VisualNavigatorRuntimeState => {
  const { locale } = useI18n();
  const [intent, setIntent] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [statusText, setStatusText] = useState<string | null>(null);
  const [stopReason, setStopReason] = useState<string | null>(null);
  const [lastConfidence, setLastConfidence] = useState<number | null>(null);
  const [lastRationale, setLastRationale] = useState<string | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  const [history, setHistory] = useState<NavigatorHistoryEntry[]>([]);
  const [pendingConfirmation, setPendingConfirmation] = useState<PendingNavigatorConfirmation | null>(null);
  const historyRef = useRef<NavigatorHistoryEntry[]>([]);
  const activeRunIdRef = useRef(0);

  const appendHistory = useCallback((entry: NavigatorHistoryEntry) => {
    setHistory((current) => {
      const next = [...current, entry];
      historyRef.current = next;
      return next;
    });
  }, []);

  const stopRun = useCallback(() => {
    activeRunIdRef.current += 1;
    setIsRunning(false);
    setStatusText("Visual navigator stopped.");
    setStopReason("Visual navigator stopped.");
  }, []);

  const clearHistory = useCallback(() => {
    historyRef.current = [];
    setHistory([]);
    setLastConfidence(null);
    setLastError(null);
    setLastRationale(null);
    setPendingConfirmation(null);
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
  }, [appendHistory]);

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
  }, [appendHistory, pendingConfirmation]);

  const startRun = useCallback(async () => {
    const trimmedIntent = intent.trim();

    if (!trimmedIntent || isRunning) {
      return;
    }

    const runId = activeRunIdRef.current + 1;
    activeRunIdRef.current = runId;
    setIsRunning(true);
    setLastError(null);
    setPendingConfirmation(null);
    setStatusText("Preparing the visual navigator...");
    setStopReason(null);
    onCloseAssistant();

    const startedAt = Date.now();
    let executedSteps = 0;
    let unresolvedActions = 0;

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
        const screenshot = await captureViewportScreenshot();
        const ui = buildVisualNavigatorUiHints();
        setStatusText("Planning the next visible action...");
        const response: NavigatorTurnResponse = await navigateVisualUi({
          intent: trimmedIntent,
          locale,
          recentHistory: historyRef.current.slice(-HISTORY_WINDOW),
          screenshot,
          ui,
        });

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

        await new Promise((resolve) => window.setTimeout(resolve, 250));
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "The visual navigator run failed.";
      setLastError(message);
      setStopReason(message);
      setStatusText(message);
      toast.error(message);
    } finally {
      if (activeRunIdRef.current === runId) {
        setIsRunning(false);
      }
    }
  }, [appendHistory, intent, isRunning, locale, onCloseAssistant]);

  const canStart = intent.trim().length > 0 && !isRunning;

  return useMemo(() => ({
    canStart,
    clearHistory,
    confirmPendingAction,
    history,
    intent,
    isRunning,
    lastConfidence,
    lastError,
    lastRationale,
    pendingConfirmation,
    rejectPendingAction,
    setIntent,
    startRun,
    statusText,
    stopReason,
    stopRun,
  }), [
    canStart,
    clearHistory,
    confirmPendingAction,
    history,
    intent,
    isRunning,
    lastConfidence,
    lastError,
    lastRationale,
    pendingConfirmation,
    rejectPendingAction,
    startRun,
    statusText,
    stopReason,
    stopRun,
  ]);
};
