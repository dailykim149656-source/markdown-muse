import { useEffect } from "react";
import {
  ChevronDown,
  ChevronUp,
  Loader2,
  Navigation,
  RefreshCcw,
  ShieldAlert,
  Square,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import type { VisualNavigatorRuntimeState } from "@/hooks/useVisualNavigator";
import type { NavigatorGoalSuggestion } from "@/types/visualNavigator";
import { cn } from "@/lib/utils";

interface VisualNavigatorTabProps {
  visualNavigator: VisualNavigatorRuntimeState;
}

interface GoalChipProps {
  className?: string;
  dataTarget?: string;
  goal: NavigatorGoalSuggestion & { deemphasized?: boolean; source?: string };
  highlighted?: boolean;
  onSelect: (goal: NavigatorGoalSuggestion) => void;
}

const GoalChip = ({
  className,
  dataTarget,
  goal,
  highlighted = false,
  onSelect,
}: GoalChipProps) => (
  <button
    className={cn(
      "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
      highlighted
        ? "border-primary bg-primary/10 text-primary"
        : "border-border bg-background text-foreground hover:bg-accent/40",
      goal.deemphasized ? "opacity-65" : null,
      className,
    )}
    data-visual-target={dataTarget}
    onClick={() => void onSelect(goal)}
    type="button"
  >
    {goal.label}
  </button>
);

const VisualNavigatorTab = ({
  visualNavigator,
}: VisualNavigatorTabProps) => {
  useEffect(() => {
    void visualNavigator.refreshSuggestions();
  }, [visualNavigator.refreshSuggestions]);

  return (
    <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
      <section className="space-y-4 rounded-lg border border-border p-4">
        <div>
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold">Visual Navigator</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Screen-aware goal suggestions reduce typing. Pick a likely next goal, then let Docsy run the bounded UI loop.
              </p>
            </div>
            <Button
              data-visual-target="navigator-refresh-suggestions"
              disabled={visualNavigator.isRefreshingSuggestions || visualNavigator.isRunning}
              onClick={() => void visualNavigator.refreshSuggestions()}
              size="sm"
              type="button"
              variant="outline"
            >
              {visualNavigator.isRefreshingSuggestions ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCcw className="mr-2 h-4 w-4" />}
              Refresh
            </Button>
          </div>
        </div>

        {visualNavigator.recentGoals.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Recent goals</div>
            <div className="flex flex-wrap gap-2">
              {visualNavigator.recentGoals.map((goal, index) => (
                <GoalChip
                  dataTarget={`navigator-recent-goal-${index}`}
                  goal={goal}
                  highlighted={visualNavigator.selectedGoalIntent === goal.intent}
                  key={goal.key}
                  onSelect={visualNavigator.runGoal}
                />
              ))}
            </div>
          </div>
        )}

        <div className="space-y-2">
          <div className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Quick actions</div>
          <div className="flex flex-wrap gap-2">
            {visualNavigator.presetGoals.map((goal) => (
              <GoalChip
                dataTarget={`navigator-preset-${goal.key}`}
                goal={goal}
                highlighted={visualNavigator.selectedGoalIntent === goal.intent}
                key={goal.key}
                onSelect={visualNavigator.runGoal}
              />
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-border/70 bg-muted/30 p-3 text-sm">
          <div className="flex items-center justify-between gap-3">
            <div className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Suggested next goals</div>
            {visualNavigator.isRefreshingSuggestions ? (
              <span className="text-[11px] text-muted-foreground">Scanning screen…</span>
            ) : null}
          </div>
          {visualNavigator.suggestedGoals.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">
              {visualNavigator.suggestionsError || "No goal suggestions are available yet. Use a quick action or refresh from the current screen."}
            </p>
          ) : (
            <div className="mt-3 space-y-3">
              {visualNavigator.suggestedGoals.map((goal, index) => (
                <button
                  className={cn(
                    "w-full rounded-lg border border-border/70 bg-background px-4 py-3 text-left transition-colors hover:bg-accent/30",
                    visualNavigator.selectedGoalIntent === goal.intent ? "border-primary bg-primary/5" : null,
                  )}
                  data-visual-target={`navigator-suggested-goal-${index}`}
                  key={goal.key}
                  onClick={() => void visualNavigator.runGoal(goal)}
                  type="button"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-medium">{goal.label}</div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">Suggested</Badge>
                      {typeof goal.confidence === "number" ? (
                        <span className="text-[11px] text-muted-foreground">{Math.round(goal.confidence * 100)}%</span>
                      ) : null}
                    </div>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-muted-foreground">{goal.rationale}</p>
                </button>
              ))}
            </div>
          )}
        </div>

        <Collapsible
          onOpenChange={visualNavigator.setAdvancedCommandOpen}
          open={visualNavigator.advancedCommandOpen}
        >
          <div className="rounded-lg border border-border/70 bg-muted/20 p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-medium">Advanced command</div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Free text is still available for edge cases, but it is no longer the default path.
                </p>
              </div>
              <CollapsibleTrigger asChild>
                <Button
                  data-visual-target="navigator-advanced-toggle"
                  size="sm"
                  type="button"
                  variant="ghost"
                >
                  {visualNavigator.advancedCommandOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
            </div>
            <CollapsibleContent className="space-y-3 pt-3">
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
                  {visualNavigator.isRunning ? "Running..." : "Start advanced run"}
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
            </CollapsibleContent>
          </div>
        </Collapsible>

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
};

export default VisualNavigatorTab;
