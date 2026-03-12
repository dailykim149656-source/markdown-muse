import { Activity, CheckCircle2, CircleAlert, ClipboardCheck, Copy, Gauge } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n/useI18n";
import {
  VALIDATED_REVIEW_MAX_EDGES,
  VALIDATED_REVIEW_MAX_NODES,
  resolveRecommendedReviewBatchSize,
  resolveWorkspaceScale,
} from "@/lib/knowledge/workspaceScale";
import type { KnowledgeSuggestionQueueItem } from "@/components/editor/sidebarFeatureTypes";
import { toast } from "sonner";

interface KnowledgeOperationsPanelProps {
  acceptedPatchCount: number;
  checklistCompletedCount: number;
  checklistTotalCount: number;
  documentCount: number;
  edgeCount: number;
  issueCount: number;
  nodeCount: number;
  onOpenNextReady: () => void;
  onOpenPatchReview: () => void;
  onRetryFailed: () => void;
  patchCount: number;
  queue: KnowledgeSuggestionQueueItem[];
}

const KnowledgeOperationsPanel = ({
  acceptedPatchCount,
  checklistCompletedCount,
  checklistTotalCount,
  documentCount,
  edgeCount,
  issueCount,
  nodeCount,
  onOpenNextReady,
  onOpenPatchReview,
  onRetryFailed,
  patchCount,
  queue,
}: KnowledgeOperationsPanelProps) => {
  const { t } = useI18n();
  const now = Date.now();
  const runningCount = queue.filter((entry) => entry.status === "running").length;
  const failedCount = queue.filter((entry) => entry.status === "failed").length;
  const readyCount = queue.filter((entry) => entry.status === "ready").length;
  const readyWithProvenanceCount = queue.filter((entry) =>
    entry.status === "ready"
    && Boolean(entry.confidenceLabel)
    && typeof entry.sourceCount === "number"
    && entry.sourceCount > 0).length;
  const oldestQueueAgeMinutes = queue.length === 0
    ? 0
    : Math.max(
      0,
      Math.round((now - Math.min(...queue.map((entry) => entry.updatedAt))) / 60_000),
    );
  const retryPressureCount = queue.filter((entry) => entry.attemptCount > 1).length;
  const provenanceCoverage = readyCount === 0
    ? 100
    : Math.round((readyWithProvenanceCount / readyCount) * 100);
  const checklistComplete = checklistCompletedCount >= checklistTotalCount;
  const reviewProgress = patchCount === 0
    ? 100
    : Math.min(100, Math.round((acceptedPatchCount / patchCount) * 100));
  const workspaceScale = resolveWorkspaceScale(nodeCount, edgeCount);
  const validatedRangeExceeded = workspaceScale === "large";
  const recommendedBatchSize = resolveRecommendedReviewBatchSize(workspaceScale);
  const validatedRangeLabel = t("knowledge.operationsValidatedRangeValue", {
    edges: VALIDATED_REVIEW_MAX_EDGES,
    nodes: VALIDATED_REVIEW_MAX_NODES,
  });
  const gateChecks = [
    {
      hold: failedCount > 0,
      key: "knowledge.operationsCheckFailures",
      value: failedCount,
    },
    {
      hold: runningCount > 0,
      key: "knowledge.operationsCheckRunning",
      value: runningCount,
    },
    {
      hold: provenanceCoverage < 100,
      key: "knowledge.operationsCheckProvenance",
      value: provenanceCoverage,
    },
    {
      hold: validatedRangeExceeded,
      key: "knowledge.operationsCheckValidatedRange",
      value: t(
        validatedRangeExceeded
          ? "knowledge.operationsValidatedRangeExceededValue"
          : "knowledge.operationsValidatedRangeValue",
        {
          edges: VALIDATED_REVIEW_MAX_EDGES,
          nodes: VALIDATED_REVIEW_MAX_NODES,
        },
      ),
    },
    {
      hold: !checklistComplete,
      key: "knowledge.operationsCheckChecklist",
      value: `${checklistCompletedCount}/${checklistTotalCount}`,
    },
  ];
  const blockers = gateChecks
    .filter((check) => check.hold)
    .map((check) => t(check.key, { value: check.value }));
  const gateState = failedCount > 0
    ? "attention"
    : runningCount > 0 || patchCount > 0
      ? "in_progress"
      : "healthy";
  const recommendation = failedCount > 0
    ? {
      action: onRetryFailed,
      actionLabel: "knowledge.operationsRetryFailed",
      key: "knowledge.operationsRecommendationRetryFailed",
    }
    : runningCount > 0
      ? {
        action: null,
        actionLabel: null,
        key: "knowledge.operationsRecommendationWaitRunning",
      }
      : readyCount > 0
        ? {
          action: onOpenNextReady,
          actionLabel: "knowledge.operationsOpenNextReview",
          key: "knowledge.operationsRecommendationOpenNext",
        }
        : patchCount > 0
          ? {
            action: onOpenPatchReview,
            actionLabel: "knowledge.operationsOpenPatchReview",
            key: "knowledge.operationsRecommendationInspectLoaded",
          }
          : !checklistComplete
            ? {
              action: null,
              actionLabel: null,
              key: "knowledge.operationsRecommendationFinishChecklist",
            }
          : oldestQueueAgeMinutes >= 30
            ? {
              action: onOpenNextReady,
              actionLabel: readyCount > 0 ? "knowledge.operationsOpenNextReview" : null,
              key: "knowledge.operationsRecommendationAgePressure",
            }
          : workspaceScale !== "small"
            ? {
              action: null,
              actionLabel: null,
              key: workspaceScale === "medium"
                ? "knowledge.operationsRecommendationFocusMedium"
                : "knowledge.operationsRecommendationFocusLarge",
            }
            : {
              action: null,
              actionLabel: null,
              key: "knowledge.operationsRecommendationReady",
            };
  const releaseSummary = [
    t(
      gateState === "attention"
        ? "knowledge.operationsSummaryAttention"
        : gateState === "healthy"
          ? "knowledge.operationsSummaryHealthy"
          : "knowledge.operationsSummaryInProgress",
    ),
    t("knowledge.operationsSummaryQueue", {
      failed: failedCount,
      ready: readyCount,
      running: runningCount,
      total: queue.length,
    }),
    t("knowledge.operationsSummaryPatches", {
      accepted: acceptedPatchCount,
      loaded: patchCount,
    }),
    t("knowledge.operationsSummaryReviewProgress", {
      value: reviewProgress,
    }),
    t("knowledge.operationsSummaryChecklist", {
      completed: checklistCompletedCount,
      total: checklistTotalCount,
    }),
    t("knowledge.operationsSummaryOldestAge", {
      value: oldestQueueAgeMinutes,
    }),
    t("knowledge.operationsSummaryScale", {
      docs: documentCount,
      edges: edgeCount,
      issues: issueCount,
      nodes: nodeCount,
      scale: t(`knowledge.operationsScale${workspaceScale.charAt(0).toUpperCase()}${workspaceScale.slice(1)}`),
    }),
    t("knowledge.operationsSummaryValidatedRange", {
      edges: VALIDATED_REVIEW_MAX_EDGES,
      nodes: VALIDATED_REVIEW_MAX_NODES,
    }),
    t("knowledge.operationsSummaryBatch", {
      count: recommendedBatchSize,
    }),
    t("knowledge.operationsSummaryProvenance", {
      value: provenanceCoverage,
    }),
    t("knowledge.operationsSummaryRecommendation", {
      value: t(recommendation.key),
    }),
    blockers.length > 0
      ? `${t("knowledge.operationsSummaryBlockers", { count: blockers.length })}\n${blockers.map((blocker) => `- ${blocker}`).join("\n")}`
      : t("knowledge.operationsSummaryNoBlockers"),
  ].join("\n");

  return (
    <section
      className="space-y-3 rounded-lg border border-border/60 bg-background/70 p-3 group-data-[collapsible=icon]:hidden"
      data-testid="operations-gate-panel"
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            {t("knowledge.operationsTitle")}
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {t("knowledge.operationsDescription")}
          </p>
        </div>
        <Badge variant={gateState === "attention" ? "destructive" : gateState === "healthy" ? "secondary" : "outline"}>
          {t(
            gateState === "attention"
              ? "knowledge.operationsAttention"
              : gateState === "healthy"
                ? "knowledge.operationsHealthy"
                : "knowledge.operationsInProgress",
          )}
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-md border border-border/60 px-3 py-2">
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <Activity className="h-3 w-3" />
            {t("knowledge.operationsQueue")}
          </div>
          <div className="mt-1 text-sm font-semibold text-foreground">{queue.length}</div>
        </div>
        <div className="rounded-md border border-border/60 px-3 py-2">
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <ClipboardCheck className="h-3 w-3" />
            {t("knowledge.operationsLoadedPatches")}
          </div>
          <div className="mt-1 text-sm font-semibold text-foreground">{patchCount}</div>
        </div>
        <div className="rounded-md border border-border/60 px-3 py-2">
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <CheckCircle2 className="h-3 w-3" />
            {t("knowledge.operationsAcceptedPatches")}
          </div>
          <div className="mt-1 text-sm font-semibold text-foreground">{acceptedPatchCount}</div>
        </div>
        <div className="rounded-md border border-border/60 px-3 py-2">
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <Gauge className="h-3 w-3" />
            {t("knowledge.operationsProvenanceCoverage")}
          </div>
          <div className="mt-1 text-sm font-semibold text-foreground">{provenanceCoverage}%</div>
        </div>
        <div className="rounded-md border border-border/60 px-3 py-2">
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <Gauge className="h-3 w-3" />
            {t("knowledge.operationsReviewProgress")}
          </div>
          <div className="mt-1 text-sm font-semibold text-foreground">{reviewProgress}%</div>
        </div>
        <div className="rounded-md border border-border/60 px-3 py-2">
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <Activity className="h-3 w-3" />
            {t("knowledge.operationsOldestAge")}
          </div>
          <div className="mt-1 text-sm font-semibold text-foreground">
            {t("knowledge.operationsOldestAgeValue", { count: oldestQueueAgeMinutes })}
          </div>
        </div>
        <div className="rounded-md border border-border/60 px-3 py-2">
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <ClipboardCheck className="h-3 w-3" />
            {t("knowledge.operationsChecklist")}
          </div>
          <div className="mt-1 text-sm font-semibold text-foreground">
            {t("knowledge.operationsChecklistProgress", {
              completed: checklistCompletedCount,
              total: checklistTotalCount,
            })}
          </div>
        </div>
      </div>

      <div className="rounded-md border border-border/60 bg-background px-3 py-3 text-[11px] text-muted-foreground">
        <div className="flex items-center justify-between gap-2">
          <div className="font-medium text-foreground">{t("knowledge.operationsWorkspaceScale")}</div>
          <Badge variant="outline">
            {t(`knowledge.operationsScale${workspaceScale.charAt(0).toUpperCase()}${workspaceScale.slice(1)}`)}
          </Badge>
        </div>
        <div className="mt-2 flex flex-wrap gap-3">
          <span>{t("knowledge.operationsWorkspaceDocs", { count: documentCount })}</span>
          <span>{t("knowledge.operationsWorkspaceNodes", { count: nodeCount })}</span>
          <span>{t("knowledge.operationsWorkspaceEdges", { count: edgeCount })}</span>
          <span>{t("knowledge.operationsWorkspaceIssues", { count: issueCount })}</span>
        </div>
        <p className="mt-2 leading-4">
          {t(
            workspaceScale === "small"
              ? "knowledge.operationsScaleHintSmall"
              : workspaceScale === "medium"
                ? "knowledge.operationsScaleHintMedium"
                : "knowledge.operationsScaleHintLarge",
          )}
        </p>
        <div className="mt-3 rounded-md border border-border/60 bg-muted/20 px-3 py-2">
          <div className="font-medium text-foreground">{t("knowledge.operationsPerformanceBudget")}</div>
          <p className="mt-1 leading-4">
            {t("knowledge.operationsBatchHint", { count: recommendedBatchSize })}
          </p>
          <p className="mt-1 leading-4">
            {validatedRangeLabel}
          </p>
          <p className="mt-1 leading-4">
            {t(validatedRangeExceeded
              ? "knowledge.operationsValidatedRangeExceeded"
              : "knowledge.operationsValidatedRangeHealthy")}
          </p>
        </div>
      </div>

      <div className="rounded-md border border-border/60 bg-muted/20 px-3 py-3 text-[11px] text-muted-foreground">
        <div className="flex flex-wrap gap-3">
          <span>{t("knowledge.operationsRunningCount", { count: runningCount })}</span>
          <span>{t("knowledge.operationsReadyCount", { count: readyCount })}</span>
          <span>{t("knowledge.operationsFailedCount", { count: failedCount })}</span>
          <span>{t("knowledge.operationsRetryPressure", { count: retryPressureCount })}</span>
        </div>
        <p className="mt-2 leading-4">
          {failedCount > 0
            ? t("knowledge.operationsFailureHint", { count: failedCount })
            : provenanceCoverage < 100
              ? t("knowledge.operationsCoverageHint", { count: readyCount - readyWithProvenanceCount })
              : t("knowledge.operationsHealthyHint")}
        </p>
      </div>

      <div className="rounded-md border border-border/60 bg-background px-3 py-3 text-[11px] text-muted-foreground">
        <div className="font-medium text-foreground">{t("knowledge.operationsRecommendationTitle")}</div>
        <p className="mt-2 leading-4">{t(recommendation.key)}</p>
        {recommendation.action && recommendation.actionLabel && (
          <Button
            className="mt-3 h-auto min-h-7 w-full justify-start px-2 py-1.5 text-left text-xs whitespace-normal sm:h-7 sm:w-auto sm:justify-center sm:whitespace-nowrap"
            onClick={recommendation.action}
            size="sm"
            type="button"
            variant="outline"
          >
            {t(recommendation.actionLabel)}
          </Button>
        )}
      </div>

      <div className="space-y-2">
        {gateChecks.map((check) => (
          <div className="flex items-center justify-between rounded-md border border-border/60 bg-background px-3 py-2 text-[11px]" key={check.key}>
            <div className="flex items-center gap-2 text-foreground">
              {check.hold ? (
                <CircleAlert className="h-3.5 w-3.5 text-amber-500" />
              ) : (
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
              )}
              {t(check.key, { value: check.value })}
            </div>
            <Badge variant={check.hold ? "outline" : "secondary"}>
              {t(check.hold ? "knowledge.operationsHold" : "knowledge.operationsPass")}
            </Badge>
          </div>
        ))}
      </div>

      <div className="rounded-md border border-border/60 bg-background px-3 py-3 text-[11px] text-muted-foreground">
        <div className="font-medium text-foreground">{t("knowledge.operationsBlockersTitle")}</div>
        {blockers.length > 0 ? (
          <div className="mt-2 space-y-2">
            {blockers.map((blocker) => (
              <div className="rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-amber-700 dark:text-amber-300" key={blocker}>
                {blocker}
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-2 leading-4">{t("knowledge.operationsNoBlockers")}</p>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          className="h-auto min-h-7 w-full justify-start px-2 py-1.5 text-left text-xs whitespace-normal sm:h-7 sm:w-auto sm:justify-center sm:whitespace-nowrap"
          disabled={readyCount === 0}
          onClick={onOpenNextReady}
          size="sm"
          type="button"
          variant="outline"
        >
          {t("knowledge.operationsOpenNextReview")}
        </Button>
        <Button className="h-auto min-h-7 w-full justify-start px-2 py-1.5 text-left text-xs whitespace-normal sm:h-7 sm:w-auto sm:justify-center sm:whitespace-nowrap" onClick={onOpenPatchReview} size="sm" type="button" variant="outline">
          {t("knowledge.operationsOpenPatchReview")}
        </Button>
        <Button
          className="h-auto min-h-7 w-full justify-start px-2 py-1.5 text-left text-xs whitespace-normal sm:h-7 sm:w-auto sm:justify-center sm:whitespace-nowrap"
          disabled={failedCount === 0}
          onClick={onRetryFailed}
          size="sm"
          type="button"
          variant="ghost"
        >
          {t("knowledge.operationsRetryFailed")}
        </Button>
        <Button
          className="h-auto min-h-7 w-full justify-start px-2 py-1.5 text-left text-xs whitespace-normal sm:h-7 sm:w-auto sm:justify-center sm:whitespace-nowrap"
          onClick={() => {
            void navigator.clipboard.writeText(releaseSummary)
              .then(() => {
                toast.success(t("knowledge.operationsCopyDone"));
              })
              .catch(() => {
                toast.error(t("knowledge.operationsCopyFailed"));
              });
          }}
          size="sm"
          type="button"
          variant="ghost"
        >
          <Copy className="mr-1 h-3.5 w-3.5" />
          {t("knowledge.operationsCopySummary")}
        </Button>
        {failedCount > 0 && (
          <div className="flex w-full items-center gap-1 text-[11px] text-amber-600 dark:text-amber-400 sm:w-auto">
            <CircleAlert className="h-3.5 w-3.5" />
            {t("knowledge.operationsRetryNeeded")}
          </div>
        )}
      </div>

      <div className="rounded-md border border-border/60 bg-background px-3 py-3 text-[11px] leading-5 text-muted-foreground">
        <div className="mb-2 font-medium text-foreground">{t("knowledge.operationsSummaryTitle")}</div>
        <pre className="whitespace-pre-wrap font-sans text-[11px] leading-5 text-muted-foreground">
          {releaseSummary}
        </pre>
      </div>
    </section>
  );
};

export default KnowledgeOperationsPanel;
