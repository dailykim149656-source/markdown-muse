import { Loader2, Navigation, ShieldAlert, Square, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { VisualNavigatorRuntimeState } from "@/hooks/useVisualNavigator";

interface VisualNavigatorOverlayProps {
  visualNavigator: VisualNavigatorRuntimeState;
}

const VisualNavigatorOverlay = ({
  visualNavigator,
}: VisualNavigatorOverlayProps) => {
  const shouldRender = visualNavigator.isRunning
    || visualNavigator.pendingConfirmation !== null
    || visualNavigator.history.length > 0
    || visualNavigator.stopReason !== null
    || visualNavigator.lastError !== null;

  if (!shouldRender) {
    return null;
  }

  return (
    <div
      className="fixed bottom-4 right-4 z-[80] w-[22rem] rounded-2xl border border-border bg-background/95 shadow-2xl backdrop-blur"
      data-visual-ignore="true"
      data-visual-target="visual-navigator-overlay"
    >
      <div className="flex items-start justify-between gap-3 border-b border-border/70 px-4 py-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Navigation className="h-4 w-4" />
            Visual Navigator
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {visualNavigator.statusText || "Ready"}
          </p>
        </div>
        <div className="flex items-center gap-1">
          {visualNavigator.isRunning && (
            <Button className="h-8 w-8 p-0" onClick={visualNavigator.stopRun} size="sm" type="button" variant="ghost">
              <Square className="h-4 w-4" />
            </Button>
          )}
          {!visualNavigator.isRunning && (
            <Button className="h-8 w-8 p-0" onClick={visualNavigator.clearHistory} size="sm" type="button" variant="ghost">
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
      <div className="space-y-3 px-4 py-3">
        <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
          <span>{visualNavigator.lastConfidence === null ? "No confidence yet" : `Confidence ${Math.round(visualNavigator.lastConfidence * 100)}%`}</span>
          <span>{visualNavigator.history.length} steps</span>
        </div>
        {visualNavigator.isRunning && (
          <div className="flex items-center gap-2 rounded-lg border border-blue-500/20 bg-blue-500/5 px-3 py-2 text-sm">
            <Loader2 className="h-4 w-4 animate-spin" />
            One action per turn is executing inside the current Docsy session.
          </div>
        )}
        {visualNavigator.pendingConfirmation && (
          <div className="space-y-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm">
            <div className="flex items-start gap-2">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
              <p>{visualNavigator.pendingConfirmation.reason}</p>
            </div>
            <div className="flex gap-2">
              <Button className="flex-1" onClick={() => void visualNavigator.confirmPendingAction()} size="sm" type="button">
                Execute
              </Button>
              <Button className="flex-1" onClick={visualNavigator.rejectPendingAction} size="sm" type="button" variant="outline">
                Skip
              </Button>
            </div>
          </div>
        )}
        {(visualNavigator.lastError || visualNavigator.stopReason) && !visualNavigator.isRunning && (
          <div className="rounded-lg border border-border/70 px-3 py-2 text-sm">
            {visualNavigator.lastError || visualNavigator.stopReason}
          </div>
        )}
        {visualNavigator.history.length > 0 && (
          <div className="max-h-40 space-y-2 overflow-y-auto pr-1">
            {visualNavigator.history.slice(-3).reverse().map((entry, index) => (
              <div className="rounded-lg border border-border/70 bg-muted/20 px-3 py-2 text-sm" key={`${entry.executedAt}-${index}`}>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{entry.action.type}</span>
                  <span className="text-xs text-muted-foreground">{entry.outcome}</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{entry.statusText}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default VisualNavigatorOverlay;
