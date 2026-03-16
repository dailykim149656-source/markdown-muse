import { Link2, ShieldCheck, Unplug } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { WorkspaceAuthSession } from "@/types/workspace";

interface WorkspaceConnectionDialogProps {
  errorMessage?: string | null;
  isConnecting?: boolean;
  isDisconnecting?: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  session: WorkspaceAuthSession;
}

const WorkspaceConnectionDialog = ({
  errorMessage,
  isConnecting = false,
  isDisconnecting = false,
  onConnect,
  onDisconnect,
  onOpenChange,
  open,
  session,
}: WorkspaceConnectionDialogProps) => {
  const connected = session.connected;

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="max-w-md" data-visual-target="workspace-connection-dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            Google Workspace
          </DialogTitle>
          <DialogDescription>
            Connect a Google account to unlock Drive and Docs import in the editor.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg border border-border/60 bg-muted/20 p-4">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <ShieldCheck className={`h-4 w-4 ${connected ? "text-emerald-600" : "text-muted-foreground"}`} />
              {connected ? "Connected" : "Not connected"}
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              {connected
                ? `Signed in as ${session.user?.name || session.user?.email || "Google user"}.`
                : "No Google account is currently connected to this editor session."}
            </p>
            {session.user?.email && (
              <p className="mt-2 text-xs text-muted-foreground">
                {session.user.email}
              </p>
            )}
          </div>

          {errorMessage && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {errorMessage}
            </div>
          )}

          <div className="flex flex-wrap justify-end gap-2">
            {connected ? (
              <Button
                data-visual-target="workspace-disconnect"
                disabled={isDisconnecting}
                onClick={onDisconnect}
                type="button"
                variant="outline"
              >
                <Unplug className="mr-2 h-4 w-4" />
                {isDisconnecting ? "Disconnecting..." : "Disconnect"}
              </Button>
            ) : (
              <Button
                data-visual-target="workspace-connect"
                disabled={isConnecting}
                onClick={onConnect}
                type="button"
              >
                <Link2 className="mr-2 h-4 w-4" />
                {isConnecting ? "Redirecting..." : "Connect Google"}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default WorkspaceConnectionDialog;
