import { useEffect, useMemo, useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import AiAgentTab from "@/components/editor/AiAgentTab";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import type { LiveAgentRuntimeState } from "@/hooks/useLiveAgent";
import { useI18n } from "@/i18n/useI18n";
import type { ProcedureExtractionResult } from "@/lib/ai/procedureExtraction";
import type { AiBusyAction, PatchPreviewResult, TocPreviewResult } from "@/hooks/useAiAssistant";
import type { SummarizeDocumentResponse } from "@/types/aiAssistant";
import type { DocumentData } from "@/types/document";

interface AiAssistantDialogProps {
  activeDocumentName: string;
  aiUnavailableMessage?: string | null;
  busyAction: AiBusyAction;
  compareCandidates: DocumentData[];
  comparePreview: PatchPreviewResult | null;
  liveAgent: LiveAgentRuntimeState;
  onCompare: (targetDocumentId: string) => Promise<unknown> | unknown;
  onExtractProcedure: () => Promise<ProcedureExtractionResult | unknown> | unknown;
  onGenerateSection: (prompt: string) => Promise<unknown> | unknown;
  onGenerateToc: () => Promise<unknown> | unknown;
  onLoadTocPatch: (maxDepthOverride?: 1 | 2 | 3) => Promise<unknown> | unknown;
  onOpenChange: (open: boolean) => void;
  onSuggestUpdates: (targetDocumentId: string) => Promise<unknown> | unknown;
  onSummarize: (objective: string) => Promise<SummarizeDocumentResponse | unknown> | unknown;
  open: boolean;
  procedureResult: ProcedureExtractionResult | null;
  richTextAvailable: boolean;
  summaryResult: SummarizeDocumentResponse | null;
  tocPreview: TocPreviewResult | null;
  updateSuggestionPreview: PatchPreviewResult | null;
}

const getTocConflictTone = (conflict: TocPreviewResult["conflicts"][number]) => {
  switch (conflict) {
    case "duplicate_headings":
    case "non_matching_titles":
      return "border-destructive/30 bg-destructive/10 text-destructive";
    case "existing_toc":
    case "unchanged_toc":
      return "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300";
    case "no_headings":
    default:
      return "border-border/60 bg-background text-muted-foreground";
  }
};

const getTocEntryAccent = (level: 1 | 2 | 3) => {
  switch (level) {
    case 1:
      return "border-l-primary";
    case 2:
      return "border-l-blue-500";
    case 3:
    default:
      return "border-l-emerald-500";
  }
};

const PreviewSummary = ({
  comparison,
  patchCount,
  patchSetTitle,
  targetDocumentName,
  title,
}: PatchPreviewResult & { title: string }) => {
  const { t } = useI18n();

  return (
    <section className="rounded-lg border border-border p-4">
      <h3 className="text-sm font-semibold">{title}</h3>
      <div className="mt-3 space-y-2 text-sm">
        <p>{t("aiDialog.compare.against", { name: targetDocumentName })}</p>
        <p>{t("aiDialog.compare.loadedPatches", { count: patchCount })}</p>
        <p><span className="font-medium">{t("aiDialog.update.patchSet")}</span> {patchSetTitle}</p>
        <div className="grid gap-2 sm:grid-cols-2">
          <p className="text-muted-foreground">{t("aiDialog.compare.added", { count: comparison.counts.added })}</p>
          <p className="text-muted-foreground">{t("aiDialog.compare.changed", { count: comparison.counts.changed })}</p>
          <p className="text-muted-foreground">{t("aiDialog.compare.removed", { count: comparison.counts.removed })}</p>
          <p className="text-muted-foreground">{t("aiDialog.compare.inconsistent", { count: comparison.counts.inconsistent })}</p>
        </div>
      </div>
    </section>
  );
};

const RichTextOnlyNotice = () => {
  const { t } = useI18n();

  return (
    <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
      <p className="font-medium">{t("aiDialog.richTextOnlyTitle")}</p>
      <p className="mt-2">{t("aiDialog.richTextOnlyDescription")}</p>
    </div>
  );
};

const AiAssistantDialog = ({
  activeDocumentName,
  aiUnavailableMessage = null,
  busyAction,
  compareCandidates,
  comparePreview,
  liveAgent,
  onCompare,
  onExtractProcedure,
  onGenerateSection,
  onGenerateToc,
  onLoadTocPatch,
  onOpenChange,
  onSuggestUpdates,
  onSummarize,
  open,
  procedureResult,
  richTextAvailable,
  summaryResult,
  tocPreview,
  updateSuggestionPreview,
}: AiAssistantDialogProps) => {
  const { t } = useI18n();
  const [summaryObjective, setSummaryObjective] = useState("");
  const [sectionPrompt, setSectionPrompt] = useState("");
  const [compareTargetId, setCompareTargetId] = useState("");
  const [updateTargetId, setUpdateTargetId] = useState("");
  const [tocMaxDepth, setTocMaxDepth] = useState<"1" | "2" | "3">("2");

  const isBusy = busyAction !== null;
  const aiExecutionDisabled = Boolean(aiUnavailableMessage);
  const compareOptions = useMemo(
    () => compareCandidates.map((candidate) => ({ id: candidate.id, name: candidate.name })),
    [compareCandidates],
  );

  useEffect(() => {
    if (tocPreview) {
      setTocMaxDepth(String(tocPreview.maxDepth) as "1" | "2" | "3");
    }
  }, [tocPreview]);

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            {t("aiDialog.title")}
          </DialogTitle>
          <DialogDescription>{t("aiDialog.description")}</DialogDescription>
        </DialogHeader>

        <Tabs className="space-y-4" defaultValue="agent">
          {aiUnavailableMessage && (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
              {aiUnavailableMessage}
            </div>
          )}

          <TabsList className="grid h-auto w-full grid-cols-2 gap-1 p-1 lg:grid-cols-7">
            <TabsTrigger value="agent">Agent</TabsTrigger>
            <TabsTrigger value="summary">{t("aiDialog.tabs.summary")}</TabsTrigger>
            <TabsTrigger value="generate">{t("aiDialog.tabs.generate")}</TabsTrigger>
            <TabsTrigger value="toc">{t("aiDialog.tabs.toc")}</TabsTrigger>
            <TabsTrigger value="compare">{t("aiDialog.tabs.compare")}</TabsTrigger>
            <TabsTrigger value="update">{t("aiDialog.tabs.update")}</TabsTrigger>
            <TabsTrigger value="procedure">{t("aiDialog.tabs.procedure")}</TabsTrigger>
          </TabsList>

          <TabsContent value="agent">
            <AiAgentTab
              activeDocumentName={activeDocumentName}
              aiUnavailableMessage={aiUnavailableMessage}
              liveAgent={liveAgent}
            />
          </TabsContent>

          <TabsContent value="summary">
            {!richTextAvailable ? <RichTextOnlyNotice /> : (
              <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
                <section className="space-y-3 rounded-lg border border-border p-4">
                  <div>
                    <Label htmlFor="summary-objective">{t("aiDialog.summary.objective")}</Label>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {t("aiDialog.summary.help")}
                    </p>
                  </div>
                  <Textarea
                    id="summary-objective"
                    onChange={(event) => setSummaryObjective(event.target.value)}
                    placeholder={t("aiDialog.summary.placeholder")}
                    value={summaryObjective}
                  />
                  <Button
                    className="w-full"
                    disabled={aiExecutionDisabled || isBusy || !summaryObjective.trim()}
                    onClick={() => void onSummarize(summaryObjective)}
                    type="button"
                  >
                    {busyAction === "summarize" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    {busyAction === "summarize" ? t("aiDialog.summary.loading") : t("aiDialog.summary.action")}
                  </Button>
                </section>

                <section className="rounded-lg border border-border p-4">
                  <h3 className="text-sm font-semibold">{t("aiDialog.summary.result")}</h3>
                  <ScrollArea className="mt-3 h-72 pr-3">
                    {summaryResult ? (
                      <div className="space-y-4 text-sm">
                        <p className="whitespace-pre-wrap">{summaryResult.summary}</p>
                        {summaryResult.bulletPoints.length > 0 ? (
                          <div className="space-y-2">
                            <p className="text-xs font-medium text-muted-foreground">{t("aiDialog.summary.bullets")}</p>
                            <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
                              {summaryResult.bulletPoints.map((point, index) => (
                                <li key={`${summaryResult.requestId}-${index}`}>{point}</li>
                              ))}
                            </ul>
                          </div>
                        ) : null}
                        {summaryResult.attributions.length > 0 ? (
                          <div className="space-y-2">
                            <p className="text-xs font-medium text-muted-foreground">{t("aiDialog.summary.attributions")}</p>
                            <ul className="space-y-2 text-xs text-muted-foreground">
                              {summaryResult.attributions.map((attribution, index) => (
                                <li key={`${summaryResult.requestId}-src-${index}`} className="rounded-md border border-border bg-muted/30 px-3 py-2">
                                  <div>{t("aiDialog.summary.sourceLine", { sourceId: attribution.ingestionId, chunkId: attribution.chunkId })}</div>
                                  {attribution.sectionId ? <div>{t("aiDialog.summary.sectionLine", { sectionId: attribution.sectionId })}</div> : null}
                                  {attribution.rationale ? <div>{attribution.rationale}</div> : null}
                                </li>
                              ))}
                            </ul>
                          </div>
                        ) : null}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">{t("aiDialog.summary.empty")}</p>
                    )}
                  </ScrollArea>
                </section>
              </div>
            )}
          </TabsContent>

          <TabsContent value="generate">
            {!richTextAvailable ? <RichTextOnlyNotice /> : (
              <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
                <section className="space-y-3 rounded-lg border border-border p-4">
                  <div>
                    <Label htmlFor="section-prompt">{t("aiDialog.generate.brief")}</Label>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {t("aiDialog.generate.help")}
                    </p>
                  </div>
                  <Textarea
                    id="section-prompt"
                    onChange={(event) => setSectionPrompt(event.target.value)}
                    placeholder={t("aiDialog.generate.placeholder")}
                    rows={6}
                    value={sectionPrompt}
                  />
                  <p className="text-xs text-muted-foreground">{t("aiDialog.generate.note")}</p>
                  <Button
                    className="w-full"
                    disabled={aiExecutionDisabled || isBusy || !sectionPrompt.trim()}
                    onClick={() => void onGenerateSection(sectionPrompt)}
                    type="button"
                    variant="secondary"
                  >
                    {busyAction === "generate-section" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    {busyAction === "generate-section" ? t("aiDialog.generate.loading") : t("aiDialog.generate.action")}
                  </Button>
                </section>

                <section className="rounded-lg border border-border p-4 text-sm text-muted-foreground">
                  <h3 className="text-sm font-semibold text-foreground">{t("aiDialog.generate.reviewTitle")}</h3>
                  <p className="mt-3">{t("aiDialog.generate.reviewDescription")}</p>
                </section>
              </div>
            )}
          </TabsContent>

          <TabsContent value="toc">
            {!richTextAvailable ? <RichTextOnlyNotice /> : (
              <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
                <section className="space-y-3 rounded-lg border border-border p-4">
                  <div>
                    <h3 className="text-sm font-semibold">{t("aiDialog.toc.title")}</h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {t("aiDialog.toc.help")}
                    </p>
                  </div>
                  <Button
                    className="w-full"
                    disabled={aiExecutionDisabled || isBusy}
                    onClick={() => void onGenerateToc()}
                    type="button"
                    variant="secondary"
                  >
                    {busyAction === "generate-toc" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    {busyAction === "generate-toc" ? t("aiDialog.toc.loading") : t("aiDialog.toc.action")}
                  </Button>

                  <div className="space-y-2 rounded-md border border-border/60 bg-muted/20 p-3">
                    <Label htmlFor="toc-depth">{t("aiDialog.toc.depth")}</Label>
                    <Select onValueChange={(value) => setTocMaxDepth(value as "1" | "2" | "3")} value={tocMaxDepth}>
                      <SelectTrigger id="toc-depth">
                        <SelectValue placeholder={t("aiDialog.toc.depth")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">{t("aiDialog.toc.depthValue", { value: 1 })}</SelectItem>
                        <SelectItem value="2">{t("aiDialog.toc.depthValue", { value: 2 })}</SelectItem>
                        <SelectItem value="3">{t("aiDialog.toc.depthValue", { value: 3 })}</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">{t("aiDialog.toc.depthHelp")}</p>
                    <Button
                      className="w-full"
                      disabled={aiExecutionDisabled || !tocPreview}
                      onClick={() => void onLoadTocPatch(Number(tocMaxDepth) as 1 | 2 | 3)}
                      type="button"
                      variant={tocPreview?.hasLoadablePatch ? "default" : "outline"}
                    >
                      {t("aiDialog.toc.loadPatch")}
                    </Button>
                  </div>
                </section>

                <section className="rounded-lg border border-border p-4">
                  <h3 className="text-sm font-semibold">{t("aiDialog.toc.result")}</h3>
                  <ScrollArea className="mt-3 h-72 pr-3">
                    {tocPreview ? (
                      <div className="space-y-4 text-sm">
                        <div className="grid gap-2 sm:grid-cols-3">
                          <div className="rounded-md border border-border/60 bg-muted/20 px-3 py-2">
                            <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                              {t("aiDialog.toc.depth")}
                            </div>
                            <div className="mt-1 text-sm font-semibold text-foreground">
                              {t("aiDialog.toc.depthValue", { value: tocPreview.maxDepth })}
                            </div>
                          </div>
                          <div className="rounded-md border border-border/60 bg-muted/20 px-3 py-2">
                            <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                              {t("aiDialog.toc.entries")}
                            </div>
                            <div className="mt-1 text-sm font-semibold text-foreground">{tocPreview.entries.length}</div>
                          </div>
                          <div className={`rounded-md border px-3 py-2 ${tocPreview.hasLoadablePatch ? "border-emerald-500/30 bg-emerald-500/10" : "border-amber-500/30 bg-amber-500/10"}`}>
                            <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                              Patch
                            </div>
                            <div className="mt-1 text-sm font-semibold text-foreground">
                              {tocPreview.hasLoadablePatch ? `${tocPreview.patchCount}` : "0"}
                            </div>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <p className="font-medium">
                            {t("aiDialog.toc.suggestedDepth", { value: tocPreview.maxDepth })}
                          </p>
                          <p className="text-muted-foreground">{tocPreview.rationale}</p>
                        </div>

                        {tocPreview.entries.length > 0 && (
                          <div className="space-y-2">
                            <p className="text-xs font-medium text-muted-foreground">{t("aiDialog.toc.entries")}</p>
                            <div className="space-y-2">
                              {tocPreview.entries.map((entry, index) => (
                                <div
                                  key={`${entry.level}-${entry.title}-${index}`}
                                  className={`rounded-md border border-border bg-muted/20 px-3 py-2 border-l-4 ${getTocEntryAccent(entry.level)} ${
                                    entry.level === 2 ? "ml-3" : entry.level === 3 ? "ml-6" : ""
                                  }`}
                                >
                                  <div className="text-[11px] text-muted-foreground">
                                    {t("aiDialog.toc.entryLevel", { level: entry.level })}
                                  </div>
                                  <div className="mt-1 text-sm text-foreground">{entry.title}</div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {tocPreview.conflicts.length > 0 && (
                          <div className="space-y-2">
                            <p className="text-xs font-medium text-muted-foreground">{t("aiDialog.toc.conflicts")}</p>
                            <ul className="space-y-2 text-xs text-muted-foreground">
                              {tocPreview.conflicts.map((conflict) => (
                                <li key={conflict} className={`rounded-md border px-3 py-2 ${getTocConflictTone(conflict)}`}>
                                  {t(`aiDialog.toc.conflict.${conflict}`)}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {tocPreview.attributions.length > 0 && (
                          <div className="space-y-2">
                            <p className="text-xs font-medium text-muted-foreground">{t("aiDialog.toc.attributions")}</p>
                            <ul className="space-y-2 text-xs text-muted-foreground">
                              {tocPreview.attributions.map((attribution, index) => (
                                <li key={`toc-src-${index}`} className="rounded-md border border-border bg-muted/20 px-3 py-2">
                                  <div>{t("aiDialog.summary.sourceLine", { sourceId: attribution.ingestionId, chunkId: attribution.chunkId })}</div>
                                  {attribution.sectionId ? <div>{t("aiDialog.summary.sectionLine", { sectionId: attribution.sectionId })}</div> : null}
                                  {attribution.rationale ? <div>{attribution.rationale}</div> : null}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        <div className="rounded-md border border-dashed border-border px-3 py-2 text-xs text-muted-foreground">
                          {tocPreview.hasLoadablePatch
                            ? t("aiDialog.toc.patchReady", { count: tocPreview.patchCount })
                            : t("aiDialog.toc.patchNotNeeded")}
                        </div>

                        {tocPreview.hasLoadablePatch && (
                          <Button
                            className="w-full"
                            onClick={() => void onLoadTocPatch(Number(tocMaxDepth) as 1 | 2 | 3)}
                            type="button"
                          >
                            {t("aiDialog.toc.loadPatch")}
                          </Button>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">{t("aiDialog.toc.empty")}</p>
                    )}
                  </ScrollArea>
                </section>
              </div>
            )}
          </TabsContent>

          <TabsContent value="compare">
            {!richTextAvailable ? <RichTextOnlyNotice /> : (
              <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
                <section className="space-y-3 rounded-lg border border-border p-4">
                  <div>
                    <Label htmlFor="compare-target">{t("aiDialog.compare.target")}</Label>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {t("aiDialog.compare.help")}
                    </p>
                  </div>
                  <Select onValueChange={setCompareTargetId} value={compareTargetId}>
                    <SelectTrigger id="compare-target">
                      <SelectValue placeholder={t("aiDialog.compare.placeholder")} />
                    </SelectTrigger>
                    <SelectContent>
                      {compareOptions.map((option) => (
                        <SelectItem key={option.id} value={option.id}>
                          {option.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {!compareOptions.length ? (
                    <p className="text-xs text-muted-foreground">{t("aiDialog.compare.noCandidates")}</p>
                  ) : null}
                  <Button
                    className="w-full"
                    disabled={aiExecutionDisabled || isBusy || !compareTargetId}
                    onClick={() => void onCompare(compareTargetId)}
                    type="button"
                    variant="outline"
                  >
                    {busyAction === "compare" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    {busyAction === "compare" ? t("aiDialog.compare.loading") : t("aiDialog.compare.action")}
                  </Button>
                </section>

                {comparePreview ? (
                  <PreviewSummary {...comparePreview} title={t("aiDialog.compare.previewTitle")} />
                ) : (
                  <section className="rounded-lg border border-border p-4 text-sm text-muted-foreground">
                    {t("aiDialog.compare.empty")}
                  </section>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="update">
            {!richTextAvailable ? <RichTextOnlyNotice /> : (
              <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
                <section className="space-y-3 rounded-lg border border-border p-4">
                  <div>
                    <Label htmlFor="update-target">{t("aiDialog.update.target")}</Label>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {t("aiDialog.update.help")}
                    </p>
                  </div>
                  <Select onValueChange={setUpdateTargetId} value={updateTargetId}>
                    <SelectTrigger id="update-target">
                      <SelectValue placeholder={t("aiDialog.update.placeholder")} />
                    </SelectTrigger>
                    <SelectContent>
                      {compareOptions.map((option) => (
                        <SelectItem key={option.id} value={option.id}>
                          {option.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {!compareOptions.length ? (
                    <p className="text-xs text-muted-foreground">{t("aiDialog.update.noCandidates")}</p>
                  ) : null}
                  <p className="text-xs text-muted-foreground">{t("aiDialog.update.note")}</p>
                  <Button
                    className="w-full"
                    disabled={aiExecutionDisabled || isBusy || !updateTargetId}
                    onClick={() => void onSuggestUpdates(updateTargetId)}
                    type="button"
                  >
                    {busyAction === "suggest-updates" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    {busyAction === "suggest-updates" ? t("aiDialog.update.loading") : t("aiDialog.update.action")}
                  </Button>
                </section>

                {updateSuggestionPreview ? (
                  <PreviewSummary {...updateSuggestionPreview} title={t("aiDialog.update.previewTitle")} />
                ) : (
                  <section className="rounded-lg border border-border p-4 text-sm text-muted-foreground">
                    {t("aiDialog.update.empty")}
                  </section>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="procedure">
            {!richTextAvailable ? <RichTextOnlyNotice /> : (
              <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
                <section className="space-y-3 rounded-lg border border-border p-4">
                  <div>
                    <h3 className="text-sm font-semibold">{t("aiDialog.procedure.title")}</h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {t("aiDialog.procedure.help")}
                    </p>
                  </div>
                  <Button
                    className="w-full"
                    disabled={aiExecutionDisabled || isBusy}
                    onClick={() => void onExtractProcedure()}
                    type="button"
                    variant="outline"
                  >
                    {busyAction === "extract-procedure" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    {busyAction === "extract-procedure" ? t("aiDialog.procedure.loading") : t("aiDialog.procedure.action")}
                  </Button>
                </section>

                <section className="rounded-lg border border-border p-4">
                  <h3 className="text-sm font-semibold">{t("aiDialog.procedure.result")}</h3>
                  <ScrollArea className="mt-3 h-72 pr-3">
                    {procedureResult ? (
                      <div className="space-y-4 text-sm">
                        <div>
                          <p className="font-medium">{procedureResult.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {t("aiDialog.procedure.stepCount", { count: procedureResult.steps.length })}
                          </p>
                        </div>
                        {procedureResult.warnings.length > 0 ? (
                          <ul className="space-y-2 text-xs text-muted-foreground">
                            {procedureResult.warnings.map((warning, index) => (
                              <li key={`${procedureResult.procedureId}-warning-${index}`} className="rounded-md border border-dashed border-border px-3 py-2">
                                {warning}
                              </li>
                            ))}
                          </ul>
                        ) : null}
                        {procedureResult.steps.length > 0 ? (
                          <ol className="space-y-3">
                            {procedureResult.steps.map((step) => (
                              <li key={step.stepId} className="rounded-md border border-border bg-muted/20 px-3 py-3">
                                <div className="font-medium">
                                  {step.order}. {step.text}
                                </div>
                                <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                                  {step.attributions.map((attribution, index) => (
                                    <div key={`${step.stepId}-src-${index}`}>
                                      {t("aiDialog.procedure.sourceLine", {
                                        sourceId: attribution.ingestionId,
                                        chunkId: attribution.chunkId,
                                      })}
                                      {attribution.sectionId ? ` 쨌 ${t("aiDialog.procedure.sectionLine", { sectionId: attribution.sectionId })}` : ""}
                                    </div>
                                  ))}
                                </div>
                              </li>
                            ))}
                          </ol>
                        ) : null}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">{t("aiDialog.procedure.empty")}</p>
                    )}
                  </ScrollArea>
                </section>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default AiAssistantDialog;
