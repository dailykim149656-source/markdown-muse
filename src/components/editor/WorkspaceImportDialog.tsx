import { FileDown, FileText, RefreshCw, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { WorkspaceFileListItem } from "@/types/workspace";

interface WorkspaceImportDialogProps {
  errorMessage?: string | null;
  files: WorkspaceFileListItem[];
  isImporting?: boolean;
  isLoading?: boolean;
  isRefreshing?: boolean;
  onImport: (fileId: string) => void;
  onOpenChange: (open: boolean) => void;
  onRefresh?: () => void;
  onSearchChange: (value: string) => void;
  open: boolean;
  query: string;
}

const formatDate = (value?: string) => {
  if (!value) {
    return "Unknown date";
  }

  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
};

const WorkspaceImportDialog = ({
  errorMessage,
  files,
  isImporting = false,
  isLoading = false,
  isRefreshing = false,
  onImport,
  onOpenChange,
  onRefresh,
  onSearchChange,
  open,
  query,
}: WorkspaceImportDialogProps) => (
  <Dialog onOpenChange={onOpenChange} open={open}>
    <DialogContent className="max-w-2xl">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <FileDown className="h-5 w-5" />
          Import from Google Drive
        </DialogTitle>
        <DialogDescription>
          Browse Google Docs files and import one into the current Docsy workspace.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[16rem] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Search Google Docs by name"
              value={query}
            />
          </div>
          <Button
            disabled={isRefreshing}
            onClick={onRefresh}
            type="button"
            variant="outline"
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {errorMessage && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {errorMessage}
          </div>
        )}

        <div className="rounded-lg border border-border/60">
          <ScrollArea className="h-[24rem]">
            <div className="divide-y divide-border/60">
              {isLoading ? (
                <div className="px-4 py-8 text-sm text-muted-foreground">
                  Loading Google Drive files...
                </div>
              ) : files.length === 0 ? (
                <div className="px-4 py-8 text-sm text-muted-foreground">
                  No Google Docs files match the current search.
                </div>
              ) : (
                files.map((file) => (
                  <div
                    className="flex items-center justify-between gap-3 px-4 py-3"
                    key={file.fileId}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <div className="truncate text-sm font-medium text-foreground">
                          {file.name}
                        </div>
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        Modified {formatDate(file.modifiedTime)}
                      </div>
                    </div>
                    <Button
                      disabled={isImporting}
                      onClick={() => onImport(file.fileId)}
                      size="sm"
                      type="button"
                    >
                      Import
                    </Button>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      </div>
    </DialogContent>
  </Dialog>
);

export default WorkspaceImportDialog;
