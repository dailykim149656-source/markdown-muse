import { Loader2, RefreshCcw, Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import type { LiveAgentRuntimeState } from "@/hooks/useLiveAgent";
import { useI18n } from "@/i18n/useI18n";
import type { AgentArtifact, AgentCurrentDocumentDraft, AgentNewDocumentDraft } from "@/types/liveAgent";
import type { DocumentData } from "@/types/document";

interface AiAgentTabProps {
  activeDocumentName: string;
  aiUnavailableMessage?: string | null;
  liveAgent: LiveAgentRuntimeState;
}

const renderDraftPreview = (
  draft: AgentCurrentDocumentDraft | AgentNewDocumentDraft,
  labels: {
    currentDocumentDraft: string;
    draftPreview: string;
    reviewOpened: string;
  },
) => {
  if (draft.kind === "new_document") {
    return (
      <div className="space-y-2 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 text-sm">
        <div className="font-medium">{labels.draftPreview}: {draft.title}</div>
        <div className="text-muted-foreground">{draft.rationale}</div>
        <pre className="max-h-56 overflow-auto whitespace-pre-wrap rounded-md bg-background p-3 text-xs">
          {draft.markdown}
        </pre>
      </div>
    );
  }

  return (
    <div className="space-y-2 rounded-lg border border-blue-500/30 bg-blue-500/5 p-3 text-sm">
      <div className="font-medium">{labels.currentDocumentDraft}</div>
      <div className="text-muted-foreground">{labels.reviewOpened}</div>
      <ul className="space-y-2 text-xs text-muted-foreground">
        {draft.edits.map((edit, index) => (
          <li className="rounded-md border border-border/60 bg-background px-3 py-2" key={`${edit.kind}-${index}`}>
            <div className="font-medium text-foreground">{edit.kind}</div>
            <div>{edit.rationale}</div>
          </li>
        ))}
      </ul>
    </div>
  );
};

const ReferenceCheckbox = ({
  checked,
  document,
  onCheckedChange,
}: {
  checked: boolean;
  document: DocumentData;
  onCheckedChange: () => void;
}) => (
  <label className="flex cursor-pointer items-start gap-2 rounded-md border border-border/60 px-3 py-2">
    <Checkbox checked={checked} onCheckedChange={onCheckedChange} />
    <div className="min-w-0">
      <div className="truncate text-sm font-medium text-foreground">{document.name}</div>
      <div className="text-xs text-muted-foreground">{document.mode}</div>
    </div>
  </label>
);

const ArtifactCard = ({
  artifact,
  liveAgent,
}: {
  artifact: AgentArtifact;
  liveAgent: LiveAgentRuntimeState;
}) => {
  const { t } = useI18n();
  const renderResolvedReferences = () => (
    <div className="flex flex-wrap gap-2">
      {artifact.resolvedReferences.map((reference, index) => (
        <span
          className="rounded-full border border-border/60 bg-background px-2 py-1 text-[11px] text-muted-foreground"
          key={`${artifact.id}-ref-${index}`}
        >
          {reference.kind === "active_document" ? t("aiDialog.agent.currentDocumentBadge") : t("aiDialog.agent.referenceBadge")}
          : {reference.label}
        </span>
      ))}
    </div>
  );

  if (artifact.kind === "summary") {
    return (
      <div className="space-y-3 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4 text-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="font-medium">{t("aiDialog.tabs.summary")}</div>
            <div className="text-xs text-muted-foreground">{artifact.objective}</div>
          </div>
          <Button
            disabled={artifact.documentCreated}
            onClick={() => liveAgent.createSummaryDocumentFromArtifact(artifact.id)}
            size="sm"
            type="button"
            variant="outline"
          >
            {artifact.documentCreated
              ? t("aiDialog.agent.summaryDocumentCreated")
              : t("aiDialog.summary.createDocument")}
          </Button>
        </div>
        <p className="whitespace-pre-wrap text-foreground">{artifact.result.summary}</p>
        {artifact.result.bulletPoints.length > 0 ? (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">{t("aiDialog.summary.bullets")}</p>
            <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
              {artifact.result.bulletPoints.map((point, index) => (
                <li key={`${artifact.id}-point-${index}`}>{point}</li>
              ))}
            </ul>
          </div>
        ) : null}
        {renderResolvedReferences()}
      </div>
    );
  }

  if (artifact.kind === "compare_preview") {
    return (
      <div className="space-y-3 rounded-lg border border-border p-4 text-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="font-medium">{t("aiDialog.compare.previewTitle")}</div>
            <div className="text-xs text-muted-foreground">{t("aiDialog.compare.against", { name: artifact.targetDocumentName })}</div>
          </div>
          <Button
            disabled={!artifact.patchSet || artifact.patchCount === 0}
            onClick={() => liveAgent.openArtifactPatchReview(artifact.id)}
            size="sm"
            type="button"
            variant="outline"
          >
            {t("aiDialog.agent.openPatchReview")}
          </Button>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 text-muted-foreground">
          <p>{t("aiDialog.compare.added", { count: artifact.comparisonCounts.added })}</p>
          <p>{t("aiDialog.compare.changed", { count: artifact.comparisonCounts.changed })}</p>
          <p>{t("aiDialog.compare.removed", { count: artifact.comparisonCounts.removed })}</p>
          <p>{t("aiDialog.compare.inconsistent", { count: artifact.comparisonCounts.inconsistent })}</p>
        </div>
        <p className="text-xs text-muted-foreground">{t("aiDialog.compare.loadedPatches", { count: artifact.patchCount })}</p>
        {renderResolvedReferences()}
      </div>
    );
  }

  if (artifact.kind === "toc_preview") {
    return (
      <div className="space-y-3 rounded-lg border border-border p-4 text-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="font-medium">{t("aiDialog.toc.result")}</div>
            <div className="text-xs text-muted-foreground">{t("aiDialog.toc.suggestedDepth", { value: artifact.maxDepth })}</div>
          </div>
          <Button
            disabled={!artifact.patchSet || artifact.patchCount === 0}
            onClick={() => liveAgent.openArtifactPatchReview(artifact.id)}
            size="sm"
            type="button"
            variant="outline"
          >
            {t("aiDialog.agent.openPatchReview")}
          </Button>
        </div>
        <ul className="space-y-2 text-muted-foreground">
          {artifact.entries.map((entry, index) => (
            <li className="rounded-md border border-border/60 bg-background px-3 py-2" key={`${artifact.id}-toc-${index}`}>
              {t("aiDialog.toc.entryLevel", { level: entry.level })}: {entry.title}
            </li>
          ))}
        </ul>
        <p className="text-xs text-muted-foreground">{artifact.rationale}</p>
        {renderResolvedReferences()}
      </div>
    );
  }

  if (artifact.kind === "procedure") {
    return (
      <div className="space-y-3 rounded-lg border border-border p-4 text-sm">
        <div>
          <div className="font-medium">{t("aiDialog.procedure.result")}</div>
          <div className="text-xs text-muted-foreground">{artifact.result.title}</div>
        </div>
        <ol className="list-decimal space-y-2 pl-5 text-muted-foreground">
          {artifact.result.steps.map((step) => (
            <li key={step.stepId}>{step.text}</li>
          ))}
        </ol>
        {renderResolvedReferences()}
      </div>
    );
  }

  if (artifact.kind === "patch_result") {
    const title = artifact.capability === "generate_section"
      ? t("aiDialog.agent.sectionPatchReady")
      : artifact.capability === "update_current_document"
        ? (
          artifact.deliveryMode === "direct_apply" && artifact.directApplySucceeded
            ? t("aiDialog.agent.currentDocumentApplied")
            : t("aiDialog.agent.currentDocumentReviewReady")
        )
        : t("aiDialog.agent.updatePatchReady");

    return (
      <div className="space-y-3 rounded-lg border border-blue-500/30 bg-blue-500/5 p-4 text-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="font-medium">{title}</div>
            <div className="text-xs text-muted-foreground">{artifact.patchSetTitle}</div>
          </div>
          <Button
            disabled={!artifact.patchSet || artifact.patchCount === 0}
            onClick={() => liveAgent.openArtifactPatchReview(artifact.id)}
            size="sm"
            type="button"
            variant="outline"
          >
            {t("aiDialog.agent.openPatchReview")}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          {artifact.deliveryMode === "direct_apply"
            ? (
              artifact.directApplySucceeded
                ? t("aiDialog.agent.directApplySucceeded")
                : t("aiDialog.agent.directApplyFailed")
            )
            : t("aiDialog.agent.reviewOpened")}
        </p>
        {renderResolvedReferences()}
      </div>
    );
  }

  if (artifact.kind === "document_target") {
    const title = artifact.capability === "compare_documents"
      ? t("aiDialog.agent.chooseCompareTarget")
      : t("aiDialog.agent.chooseUpdateTarget");

    return (
      <div className="space-y-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm">
        <div>
          <div className="font-medium">{title}</div>
          <div className="text-xs text-muted-foreground">{artifact.prompt}</div>
        </div>
        {renderResolvedReferences()}
        <div className="flex flex-wrap gap-2">
          {artifact.candidates.map((candidate) => (
            <Button
              key={`${artifact.id}-${candidate.documentId}`}
              onClick={() => void liveAgent.resolveArtifactDocumentTarget(artifact.id, candidate.documentId)}
              size="sm"
              type="button"
              variant="secondary"
            >
              {candidate.fileName}
            </Button>
          ))}
        </div>
      </div>
    );
  }

  if (artifact.kind === "drive_candidates") {
    return (
      <div className="space-y-3 rounded-lg border border-border p-3">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Search className="h-4 w-4" />
          {t("aiDialog.agent.googleDriveCandidates")}
        </div>
        <div className="space-y-3">
          {artifact.candidates.map((candidate) => (
            <div className="rounded-md border border-border/60 bg-background px-3 py-3" key={candidate.fileId}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-foreground">{candidate.fileName}</div>
                  <div className="text-xs text-muted-foreground">
                    {candidate.modifiedTime
                      ? t("aiDialog.agent.modifiedAt", { value: candidate.modifiedTime })
                      : t("aiDialog.agent.modifiedUnavailable")}
                  </div>
                </div>
                {candidate.webViewLink && (
                  <a className="text-xs text-primary underline" href={candidate.webViewLink} rel="noreferrer" target="_blank">
                    {t("aiDialog.agent.openGoogleDoc")}
                  </a>
                )}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">{candidate.relevanceReason}</p>
              <p className="mt-2 rounded-md bg-muted/30 px-3 py-2 text-xs text-foreground">{candidate.excerpt}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button onClick={() => liveAgent.addDriveReference(candidate)} size="sm" type="button" variant="secondary">
                  {t("aiDialog.agent.useReference")}
                </Button>
                <Button onClick={() => liveAgent.queueDriveImport(candidate)} size="sm" type="button" variant="outline">
                  {t("aiDialog.agent.importWorkspace")}
                </Button>
              </div>
            </div>
          ))}
        </div>
        {renderResolvedReferences()}
      </div>
    );
  }

  if (artifact.kind === "draft_preview") {
    return renderDraftPreview(artifact.draft, {
      currentDocumentDraft: t("aiDialog.agent.currentDocumentDraft"),
      draftPreview: t("aiDialog.agent.draftPreview"),
      reviewOpened: t("aiDialog.agent.reviewOpened"),
    });
  }

  return null;
};

const AiAgentTab = ({
  activeDocumentName,
  aiUnavailableMessage = null,
  liveAgent,
}: AiAgentTabProps) => {
  const { t } = useI18n();
  const [draftComposerText, setDraftComposerText] = useState(liveAgent.composerText);
  const isComposingRef = useRef(false);
  const statusMessage = liveAgent.latestStatus?.message || aiUnavailableMessage;

  useEffect(() => {
    if (!isComposingRef.current) {
      setDraftComposerText(liveAgent.composerText);
    }
  }, [liveAgent.composerText]);

  return (
    <div className="grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
      <section className="rounded-lg border border-border p-4">
        <div className="flex items-center justify-between gap-2 border-b border-border/60 pb-3">
          <div>
            <h3 className="text-sm font-semibold">{t("aiDialog.agent.title")}</h3>
            <p className="text-xs text-muted-foreground">
              {t("aiDialog.agent.description")}
            </p>
          </div>
          <Button onClick={liveAgent.resetThread} size="sm" type="button" variant="outline">
            <RefreshCcw className="mr-2 h-4 w-4" />
            {t("aiDialog.agent.reset")}
          </Button>
        </div>

        <ScrollArea className="mt-4 h-[28rem] pr-3">
          <div className="space-y-3">
            {statusMessage && (
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
                {statusMessage}
              </div>
            )}

            {liveAgent.messages.length === 0 && (
              <div className="rounded-lg border border-dashed border-border px-4 py-5 text-sm text-muted-foreground">
                {t("aiDialog.agent.empty")}
              </div>
            )}

            {liveAgent.messages.map((message) => (
              <div
                className={`rounded-lg px-4 py-3 text-sm ${
                  message.role === "user"
                    ? "ml-8 bg-primary text-primary-foreground"
                    : "mr-8 border border-border bg-muted/30 text-foreground"
                }`}
                key={message.id}
              >
                <div className="mb-1 text-[11px] uppercase tracking-[0.14em] opacity-70">
                  {message.role === "user" ? t("aiDialog.agent.you") : t("aiDialog.agent.agent")}
                </div>
                <div className="whitespace-pre-wrap">{message.text}</div>
              </div>
            ))}

            {liveAgent.latestError && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {liveAgent.latestError}
              </div>
            )}

            {liveAgent.artifacts.map((artifact) => (
              <ArtifactCard artifact={artifact} key={artifact.id} liveAgent={liveAgent} />
            ))}

            {liveAgent.pendingConfirmation?.type === "create_new_document" && (
              <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-4 py-3 text-sm">
                <div className="font-medium">{t("aiDialog.agent.confirmCreateDraft")}</div>
                <div className="mt-3 flex gap-2">
                  <Button onClick={() => void liveAgent.confirmPendingAction()} type="button">
                    {t("aiDialog.agent.createDraft")}
                  </Button>
                  <Button onClick={liveAgent.discardPendingAction} type="button" variant="outline">
                    {t("aiDialog.agent.discard")}
                  </Button>
                </div>
              </div>
            )}

            {liveAgent.pendingConfirmation?.type === "import_drive_document" && (
              <div className="rounded-lg border border-blue-500/30 bg-blue-500/5 px-4 py-3 text-sm">
                <div className="font-medium">
                  {t("aiDialog.agent.confirmImport", { name: liveAgent.pendingConfirmation.fileName })}
                </div>
                <div className="mt-3 flex gap-2">
                  <Button onClick={() => void liveAgent.confirmPendingAction()} type="button">
                    {t("aiDialog.agent.import")}
                  </Button>
                  <Button onClick={liveAgent.discardPendingAction} type="button" variant="outline">
                    {t("aiDialog.agent.cancel")}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="mt-4 space-y-3 border-t border-border/60 pt-4">
          <Textarea
            onChange={(event) => {
              const nextValue = event.target.value;
              setDraftComposerText(nextValue);

              if (!isComposingRef.current) {
                liveAgent.setComposerText(nextValue);
              }
            }}
            onCompositionEnd={(event) => {
              isComposingRef.current = false;
              const nextValue = event.currentTarget.value;
              setDraftComposerText(nextValue);
              liveAgent.setComposerText(nextValue);
            }}
            onCompositionStart={() => {
              isComposingRef.current = true;
            }}
            onKeyDown={(event) => {
              if (event.nativeEvent.isComposing || isComposingRef.current) {
                return;
              }

              if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                event.preventDefault();
                liveAgent.setComposerText(draftComposerText);
                void liveAgent.sendMessage(draftComposerText);
              }
            }}
            placeholder={t("aiDialog.agent.placeholder")}
            rows={5}
            value={draftComposerText}
          />
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">
              {t("aiDialog.agent.currentTarget", { name: activeDocumentName })}
            </p>
            <Button
              disabled={liveAgent.isSubmitting || !draftComposerText.trim()}
              onClick={() => {
                liveAgent.setComposerText(draftComposerText);
                void liveAgent.sendMessage(draftComposerText);
              }}
              type="button"
            >
              {liveAgent.isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {t("aiDialog.agent.send")}
            </Button>
          </div>
        </div>
      </section>

      <aside className="space-y-4 rounded-lg border border-border p-4">
        <div>
          <h3 className="text-sm font-semibold">{t("aiDialog.agent.references")}</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {t("aiDialog.agent.referencesHelp")}
          </p>
        </div>

        <div className="space-y-2 rounded-md border border-border/60 bg-muted/20 px-3 py-3">
          <div className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">{t("aiDialog.agent.activeDocument")}</div>
          <div className="text-sm font-medium text-foreground">{activeDocumentName}</div>
        </div>

        <div className="space-y-3">
          <div className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">{t("aiDialog.agent.localReferences")}</div>
          {liveAgent.selectedLocalReferenceIds.length > 0 ? (
            <p className="text-xs text-muted-foreground">
              {t("aiDialog.agent.localReferencesIncluded")}
            </p>
          ) : null}
          <div className="space-y-2">
            {liveAgent.availableLocalReferences.length === 0 ? (
              <div className="rounded-md border border-dashed border-border px-3 py-3 text-xs text-muted-foreground">
                {t("aiDialog.agent.noLocalReferences")}
              </div>
            ) : (
              liveAgent.availableLocalReferences.map((document) => (
                <ReferenceCheckbox
                  checked={liveAgent.selectedLocalReferenceIds.includes(document.id)}
                  document={document}
                  key={document.id}
                  onCheckedChange={() => liveAgent.toggleLocalReference(document.id)}
                />
              ))
            )}
          </div>
        </div>

        <div className="space-y-3">
          <div className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">{t("aiDialog.agent.selectedGoogleReferences")}</div>
          <div className="flex flex-wrap gap-2">
            {liveAgent.selectedDriveReferences.length === 0 ? (
              <div className="rounded-md border border-dashed border-border px-3 py-3 text-xs text-muted-foreground">
                {t("aiDialog.agent.noSelectedGoogleReferences")}
              </div>
            ) : (
              liveAgent.selectedDriveReferences.map((reference) => (
                <button
                  className="rounded-full border border-border bg-background px-3 py-1 text-xs text-foreground"
                  key={reference.fileId}
                  onClick={() => liveAgent.removeDriveReference(reference.fileId)}
                  type="button"
                >
                  {reference.fileName} ×
                </button>
              ))
            )}
          </div>
        </div>
      </aside>
    </div>
  );
};

export default AiAgentTab;
