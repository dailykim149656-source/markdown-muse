import { useEffect, useState } from "react";
import { FileText, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

interface WorkspaceExportDialogProps {
  defaultTitle: string;
  errorMessage?: string | null;
  isExporting?: boolean;
  onExport: (title: string) => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
}

const WorkspaceExportDialog = ({
  defaultTitle,
  errorMessage,
  isExporting = false,
  onExport,
  onOpenChange,
  open,
}: WorkspaceExportDialogProps) => {
  const [title, setTitle] = useState(defaultTitle);

  useEffect(() => {
    if (!open) {
      return;
    }

    setTitle(defaultTitle);
  }, [defaultTitle, open]);

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Export to Google Docs
          </DialogTitle>
          <DialogDescription>
            Create a new Google Doc from the current Docsy document and link this tab to it.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <div className="text-sm font-medium text-foreground">
              Google document title
            </div>
            <div className="relative">
              <FileText className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Untitled"
                value={title}
              />
            </div>
          </div>

          {errorMessage && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {errorMessage}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)} type="button" variant="outline">
            Cancel
          </Button>
          <Button
            disabled={isExporting}
            onClick={() => onExport(title)}
            type="button"
          >
            {isExporting ? "Exporting..." : "Export"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default WorkspaceExportDialog;
