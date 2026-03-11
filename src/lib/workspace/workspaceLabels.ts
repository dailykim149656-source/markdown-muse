import type { WorkspaceBinding } from "@/types/workspace";

export const getWorkspaceProviderLabel = (workspaceBinding?: WorkspaceBinding) => {
  if (!workspaceBinding) {
    return null;
  }

  return workspaceBinding.provider === "google_drive" ? "Google Drive" : workspaceBinding.provider;
};

export const getWorkspaceSyncLabel = (workspaceBinding?: WorkspaceBinding) => {
  if (!workspaceBinding) {
    return null;
  }

  switch (workspaceBinding.syncStatus) {
    case "imported":
      return "Imported";
    case "dirty_local":
      return "Local changes";
    case "syncing":
      return "Syncing";
    case "synced":
      return "Synced";
    case "conflict":
      return "Conflict";
    case "error":
      return "Sync error";
    case "local_only":
    default:
      return "Local only";
  }
};

export const getWorkspaceSyncBadgeClassName = (workspaceBinding?: WorkspaceBinding) => {
  if (!workspaceBinding) {
    return "border-border/60 bg-muted/20 text-muted-foreground";
  }

  switch (workspaceBinding.syncStatus) {
    case "imported":
      return "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300";
    case "dirty_local":
      return "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300";
    case "syncing":
      return "border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-300";
    case "synced":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
    case "conflict":
      return "border-destructive/30 bg-destructive/10 text-destructive";
    case "error":
      return "border-destructive/30 bg-destructive/10 text-destructive";
    case "local_only":
    default:
      return "border-border/60 bg-muted/20 text-muted-foreground";
  }
};
