import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { useI18n } from "@/i18n/useI18n";
import { getWorkspaceSyncLabel } from "@/lib/workspace/workspaceLabels";
import type { DocumentData } from "@/types/document";

interface DocumentTabsProps {
  activeDocId: string;
  documents: DocumentData[];
  onCloseDoc: (id: string) => void;
  onNewDoc: () => void;
  onSelectDoc: (id: string) => void;
}

const modeLabel = (mode: string) => {
  switch (mode) {
    case "latex":
      return ".tex";
    case "html":
      return ".html";
    case "json":
      return ".json";
    case "yaml":
      return ".yaml";
    default:
      return ".md";
  }
};

const DocumentTabs = ({ activeDocId, documents, onCloseDoc, onNewDoc, onSelectDoc }: DocumentTabsProps) => {
  const { t } = useI18n();

  if (documents.length <= 1) {
    return null;
  }

  return (
    <div className="flex h-9 items-center border-b border-border bg-secondary/30 px-1 sm:h-8">
      <ScrollArea className="flex-1">
        <div className="flex items-center gap-0.5">
          {documents.map((document) => {
            const isActive = document.id === activeDocId;
            const workspaceSyncLabel = getWorkspaceSyncLabel(document.workspaceBinding);

            return (
              <button
                key={document.id}
                className={`group flex max-w-[130px] shrink-0 items-center gap-1 rounded-t-md px-2 py-1.5 text-xs transition-colors sm:max-w-[160px] sm:px-2.5 sm:py-1 ${
                  isActive
                    ? "border-b-2 border-primary bg-background text-foreground"
                    : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                }`}
                onClick={() => onSelectDoc(document.id)}
                type="button"
              >
                <span className="truncate">{document.name || t("common.untitled")}</span>
                <span className="text-[9px] text-muted-foreground/60">{modeLabel(document.mode)}</span>
                {workspaceSyncLabel && (
                  <span className="rounded-full border border-border/60 px-1 py-0.5 text-[8px] text-muted-foreground">
                    {workspaceSyncLabel}
                  </span>
                )}
                {documents.length > 1 && (
                  <span
                    className="ml-0.5 opacity-100 transition-opacity hover:text-destructive sm:opacity-0 sm:group-hover:opacity-100"
                    onClick={(event) => {
                      event.stopPropagation();
                      onCloseDoc(document.id);
                    }}
                  >
                    <X className="h-3 w-3" />
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <ScrollBar className="h-1" orientation="horizontal" />
      </ScrollArea>
      <Button
        className="ml-1 h-7 w-7 shrink-0 p-0 sm:h-6 sm:w-6"
        onClick={onNewDoc}
        size="sm"
        title={t("tabs.newDocument")}
        variant="ghost"
      >
        <Plus className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
};

export default DocumentTabs;
