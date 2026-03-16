import { Loader2, Navigation, ShieldAlert, Square, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import type { VisualNavigatorRuntimeState } from "@/hooks/useVisualNavigator";

interface VisualNavigatorTabProps {
  visualNavigator: VisualNavigatorRuntimeState;
}

const VisualNavigatorTab = ({
  visualNavigator,
}: VisualNavigatorTabProps) => (
  <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
    <section className="space-y-3 rounded-lg border border-border p-4">
      <div>
        <h3 className="text-sm font-semibold">Visual Navigator</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Gemini interprets the live Docsy viewport, chooses one executable browser action at a time, and runs a bounded UI loop.
        </p>
      </div>
      <Textarea
        data-visual-target="navigator-intent"
        onChange={(event) => visualNavigator.setIntent(event.target.value)}
        placeholder="Switch the editor to HTML, then open Patch Review."
        value={visualNavigator.intent}
      />
      <div className="flex flex-wrap gap-2">
        <Button
          data-visual-target="navigator-start"
          disabled={!visualNavigator.canStart}
          onClick={() => void visualNavigator.startRun()}
          type="button"
        >
          {visualNavigator.isRunning ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Navigation className="mr-2 h-4 w-4" />}
          {visualNavigator.isRunning ? "Running..." : "Start visual run"}
        </Button>
        <Button
          data-visual-target="navigator-stop"
          disabled={!visualNavigator.isRunning}
          onClick={visualNavigator.stopRun}
          type="button"
          variant="outline"
        >
          <Square className="mr-2 h-4 w-4" />
          Stop
        </Button>
        <Button
          disabled={visualNavigator.history.length === 0 && !visualNavigator.stopReason && !visualNavigator.lastError}
          onClick={visualNavigator.clearHistory}
          type="button"
          variant="ghost"
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Clear
        </Button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-border/70 bg-muted/30 p-3 text-sm">
          <div className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Status</div>
          <p className="mt-2">{visualNavigator.statusText || "Ready for a visual UI task."}</p>
        </div>
        <div className="rounded-lg border border-border/70 bg-muted/30 p-3 text-sm">
          <div className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Confidence</div>
          <p className="mt-2">{visualNavigator.lastConfidence === null ? "No run yet" : `${Math.round(visualNavigator.lastConfidence * 100)}%`}</p>
        </div>
      </div>
      {visualNavigator.lastRationale && (
        <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-3 text-sm">
          <div className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Latest rationale</div>
          <p className="mt-2 text-muted-foreground">{visualNavigator.lastRationale}</p>
        </div>
      )}
      {visualNavigator.pendingConfirmation && (
        <div className="space-y-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm">
          <div className="flex items-start gap-2">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <div className="font-medium">Confirmation required</div>
              <p className="mt-1 text-muted-foreground">{visualNavigator.pendingConfirmation.reason}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => void visualNavigator.confirmPendingAction()} type="button">Execute once</Button>
            <Button onClick={visualNavigator.rejectPendingAction} type="button" variant="outline">Do not run</Button>
          </div>
        </div>
      )}
      {(visualNavigator.stopReason || visualNavigator.lastError) && (
        <div className="rounded-lg border border-border/70 p-3 text-sm">
          <div className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Stop reason</div>
          <p className="mt-2">{visualNavigator.lastError || visualNavigator.stopReason}</p>
        </div>
      )}
    </section>

    <section className="rounded-lg border border-border p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold">Action history</h3>
        <span className="text-xs text-muted-foreground">{visualNavigator.history.length} steps</span>
      </div>
      <ScrollArea className="mt-3 h-96 pr-3">
        {visualNavigator.history.length === 0 ? (
          <p className="text-sm text-muted-foreground">No visual navigation steps have run yet.</p>
        ) : (
          <div className="space-y-3">
            {visualNavigator.history.map((entry, index) => (
              <div className="rounded-lg border border-border/70 bg-muted/20 p-3 text-sm" key={`${entry.executedAt}-${index}`}>
                <div className="flex items-center justify-between gap-3">
                  <div className="font-medium">{entry.action.type}</div>
                  <span className="text-xs text-muted-foreground">{Math.round(entry.confidence * 100)}%</span>
                </div>
                <p className="mt-2 text-muted-foreground">{entry.statusText}</p>
                {entry.targetDescription ? <p className="mt-2 text-xs text-muted-foreground">Target: {entry.targetDescription}</p> : null}
                <p className="mt-2 text-xs text-muted-foreground">Outcome: {entry.outcome}</p>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </section>
  </div>
);

export default VisualNavigatorTab;
