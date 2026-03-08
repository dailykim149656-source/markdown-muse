import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import type { DocumentData } from "./useAutoSave";

interface DocumentTabsProps {
  documents: DocumentData[];
  activeDocId: string;
  onSelectDoc: (id: string) => void;
  onCloseDoc: (id: string) => void;
  onNewDoc: () => void;
}

const modeLabel = (mode: string) => {
  switch (mode) {
    case "latex": return ".tex";
    case "html": return ".html";
    case "json": return ".json";
    case "yaml": return ".yaml";
    default: return ".md";
  }
};

const DocumentTabs = ({ documents, activeDocId, onSelectDoc, onCloseDoc, onNewDoc }: DocumentTabsProps) => {
  if (documents.length <= 1) return null;

  return (
    <div className="flex items-center bg-secondary/30 border-b border-border h-8 px-1">
      <ScrollArea className="flex-1">
        <div className="flex items-center gap-0.5">
          {documents.map((doc) => {
            const isActive = doc.id === activeDocId;
            return (
              <button
                key={doc.id}
                className={`group flex items-center gap-1 px-2.5 py-1 text-xs rounded-t-md transition-colors shrink-0 max-w-[160px] ${
                  isActive
                    ? "bg-background text-foreground border-b-2 border-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                }`}
                onClick={() => onSelectDoc(doc.id)}
              >
                <span className="truncate">{doc.name || "Untitled"}</span>
                <span className="text-[9px] text-muted-foreground/60">{modeLabel(doc.mode)}</span>
                {documents.length > 1 && (
                  <span
                    className="ml-0.5 opacity-0 group-hover:opacity-100 transition-opacity hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      onCloseDoc(doc.id);
                    }}
                  >
                    <X className="h-3 w-3" />
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <ScrollBar orientation="horizontal" className="h-1" />
      </ScrollArea>
      <Button variant="ghost" size="sm" className="h-6 w-6 p-0 ml-1 shrink-0" onClick={onNewDoc} title="새 문서">
        <Plus className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
};

export default DocumentTabs;
