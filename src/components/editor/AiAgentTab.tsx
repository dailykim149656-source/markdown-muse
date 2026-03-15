import { Loader2, RefreshCcw, Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import type { LiveAgentRuntimeState } from "@/hooks/useLiveAgent";
import type { AgentCurrentDocumentDraft, AgentNewDocumentDraft } from "@/types/liveAgent";
import type { DocumentData } from "@/types/document";

interface AiAgentTabProps {
  activeDocumentName: string;
  aiUnavailableMessage?: string | null;
  liveAgent: LiveAgentRuntimeState;
}

const renderDraftPreview = (draft: AgentCurrentDocumentDraft | AgentNewDocumentDraft) => {
  if (draft.kind === "new_document") {
    return (
      <div className="space-y-2 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 text-sm">
        <div className="font-medium">Draft preview: {draft.title}</div>
        <div className="text-muted-foreground">{draft.rationale}</div>
        <pre className="max-h-56 overflow-auto whitespace-pre-wrap rounded-md bg-background p-3 text-xs">
          {draft.markdown}
        </pre>
      </div>
    );
  }

  return (
    <div className="space-y-2 rounded-lg border border-blue-500/30 bg-blue-500/5 p-3 text-sm">
      <div className="font-medium">Current document draft</div>
      <div className="text-muted-foreground">
        {draft.edits.length} suggested section edit{draft.edits.length === 1 ? "" : "s"} were prepared.
      </div>
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

const AiAgentTab = ({
  activeDocumentName,
  aiUnavailableMessage = null,
  liveAgent,
}: AiAgentTabProps) => {
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
          <h3 className="text-sm font-semibold">Agent</h3>
          <p className="text-xs text-muted-foreground">
            Converse with Gemini to revise the active document or search Google Drive.
          </p>
        </div>
        <Button onClick={liveAgent.resetThread} size="sm" type="button" variant="outline">
          <RefreshCcw className="mr-2 h-4 w-4" />
          Reset chat
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
              Ask for a revision to the current document, or ask the agent to find a Google Doc by content.
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
                {message.role === "user" ? "You" : "Agent"}
              </div>
              <div className="whitespace-pre-wrap">{message.text}</div>
            </div>
          ))}

          {liveAgent.latestError && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {liveAgent.latestError}
            </div>
          )}

          {liveAgent.latestDraftPreview && renderDraftPreview(liveAgent.latestDraftPreview)}

          {liveAgent.latestDriveCandidates.length > 0 && (
            <div className="space-y-3 rounded-lg border border-border p-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Search className="h-4 w-4" />
                Google Drive candidates
              </div>
              <div className="space-y-3">
                {liveAgent.latestDriveCandidates.map((candidate) => (
                  <div className="rounded-md border border-border/60 bg-background px-3 py-3" key={candidate.fileId}>
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium text-foreground">{candidate.fileName}</div>
                        <div className="text-xs text-muted-foreground">
                          {candidate.modifiedTime ? `Modified ${candidate.modifiedTime}` : "Modified time unavailable"}
                        </div>
                      </div>
                      {candidate.webViewLink && (
                        <a className="text-xs text-primary underline" href={candidate.webViewLink} rel="noreferrer" target="_blank">
                          Open in Google Docs
                        </a>
                      )}
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">{candidate.relevanceReason}</p>
                    <p className="mt-2 rounded-md bg-muted/30 px-3 py-2 text-xs text-foreground">{candidate.excerpt}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button onClick={() => liveAgent.addDriveReference(candidate)} size="sm" type="button" variant="secondary">
                        Use as reference
                      </Button>
                      <Button onClick={() => liveAgent.queueDriveImport(candidate)} size="sm" type="button" variant="outline">
                        Import into workspace
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {liveAgent.pendingConfirmation?.type === "create_new_document" && (
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-4 py-3 text-sm">
              <div className="font-medium">Create the generated draft as a new document?</div>
              <div className="mt-3 flex gap-2">
                <Button onClick={() => void liveAgent.confirmPendingAction()} type="button">
                  Create Draft
                </Button>
                <Button onClick={liveAgent.discardPendingAction} type="button" variant="outline">
                  Discard
                </Button>
              </div>
            </div>
          )}

          {liveAgent.pendingConfirmation?.type === "import_drive_document" && (
            <div className="rounded-lg border border-blue-500/30 bg-blue-500/5 px-4 py-3 text-sm">
              <div className="font-medium">
                Import Google document: {liveAgent.pendingConfirmation.fileName}
              </div>
              <div className="mt-3 flex gap-2">
                <Button onClick={() => void liveAgent.confirmPendingAction()} type="button">
                  Import
                </Button>
                <Button onClick={liveAgent.discardPendingAction} type="button" variant="outline">
                  Cancel
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
          placeholder="Ask the agent to revise this document or search Google Drive..."
          rows={5}
          value={draftComposerText}
        />
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">
            Current target: {activeDocumentName}
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
            Send
          </Button>
        </div>
      </div>
    </section>

    <aside className="space-y-4 rounded-lg border border-border p-4">
      <div>
        <h3 className="text-sm font-semibold">References</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          The active document is always included. Add extra local or Google Drive references only when needed.
        </p>
      </div>

      <div className="space-y-2 rounded-md border border-border/60 bg-muted/20 px-3 py-3">
        <div className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Active document</div>
        <div className="text-sm font-medium text-foreground">{activeDocumentName}</div>
      </div>

      <div className="space-y-3">
        <div className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Local references</div>
        <div className="space-y-2">
          {liveAgent.availableLocalReferences.length === 0 ? (
            <div className="rounded-md border border-dashed border-border px-3 py-3 text-xs text-muted-foreground">
              No other rich-text documents are open right now.
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
        <div className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Selected Google references</div>
        <div className="flex flex-wrap gap-2">
          {liveAgent.selectedDriveReferences.length === 0 ? (
            <div className="rounded-md border border-dashed border-border px-3 py-3 text-xs text-muted-foreground">
              Use “Use as reference” on a candidate to keep it in temporary agent context.
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
