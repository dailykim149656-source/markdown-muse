import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import WorkspaceConnectionDialog from "@/components/editor/WorkspaceConnectionDialog";
import WorkspaceExportDialog from "@/components/editor/WorkspaceExportDialog";
import WorkspaceImportDialog from "@/components/editor/WorkspaceImportDialog";

describe("WorkspaceConnectionDialog", () => {
  it("shows disconnected state and starts Google connect", () => {
    const onConnect = vi.fn();

    render(
      <WorkspaceConnectionDialog
        onConnect={onConnect}
        onDisconnect={vi.fn()}
        onOpenChange={vi.fn()}
        open
        session={{
          connected: false,
          provider: null,
          user: null,
        }}
      />,
    );

    expect(screen.getByText("Google Workspace")).toBeInTheDocument();
    expect(screen.getByText("Not connected")).toBeInTheDocument();
    expect(screen.getByText("No Google account is currently connected to this editor session.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Connect Google" }));

    expect(onConnect).toHaveBeenCalledTimes(1);
  });

  it("shows connected state, email, and disconnect action", () => {
    const onDisconnect = vi.fn();

    render(
      <WorkspaceConnectionDialog
        errorMessage="Workspace auth failed."
        onConnect={vi.fn()}
        onDisconnect={onDisconnect}
        onOpenChange={vi.fn()}
        open
        session={{
          connected: true,
          provider: "google_drive",
          user: {
            email: "user@example.com",
            name: "Workspace User",
          },
        }}
      />,
    );

    expect(screen.getByText("Connected")).toBeInTheDocument();
    expect(screen.getByText("Signed in as Workspace User.")).toBeInTheDocument();
    expect(screen.getByText("user@example.com")).toBeInTheDocument();
    expect(screen.getByText("Workspace auth failed.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Disconnect" }));

    expect(onDisconnect).toHaveBeenCalledTimes(1);
  });
});

describe("WorkspaceImportDialog", () => {
  it("supports search, refresh, and import actions", () => {
    const onImport = vi.fn();
    const onRefresh = vi.fn();
    const onSearchChange = vi.fn();

    render(
      <WorkspaceImportDialog
        files={[
          {
            fileId: "file-123",
            modifiedTime: "2026-03-12T00:00:00Z",
            mimeType: "application/vnd.google-apps.document",
            name: "Runbook",
          },
        ]}
        onImport={onImport}
        onOpenChange={vi.fn()}
        onRefresh={onRefresh}
        onSearchChange={onSearchChange}
        open
        query=""
      />,
    );

    expect(screen.getByText("Import from Google Drive")).toBeInTheDocument();
    expect(screen.getByText("Runbook")).toBeInTheDocument();
    expect(screen.getByText(/Modified/)).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText("Search Google Docs by name"), {
      target: { value: "run" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Refresh" }));
    fireEvent.click(screen.getByRole("button", { name: "Import" }));

    expect(onSearchChange).toHaveBeenCalledWith("run");
    expect(onRefresh).toHaveBeenCalledTimes(1);
    expect(onImport).toHaveBeenCalledWith("file-123");
  });

  it("shows loading and empty states", () => {
    const { rerender } = render(
      <WorkspaceImportDialog
        files={[]}
        isLoading
        onImport={vi.fn()}
        onOpenChange={vi.fn()}
        onSearchChange={vi.fn()}
        open
        query=""
      />,
    );

    expect(screen.getByText("Loading Google Drive files...")).toBeInTheDocument();

    rerender(
      <WorkspaceImportDialog
        files={[]}
        onImport={vi.fn()}
        onOpenChange={vi.fn()}
        onSearchChange={vi.fn()}
        open
        query="missing"
      />,
    );

    expect(screen.getByText("No Google Docs files match the current search.")).toBeInTheDocument();
  });
});

describe("WorkspaceExportDialog", () => {
  it("shows the current title and triggers export", () => {
    const onExport = vi.fn();

    render(
      <WorkspaceExportDialog
        defaultTitle="Runbook"
        onExport={onExport}
        onOpenChange={vi.fn()}
        open
      />,
    );

    expect(screen.getByText("Export to Google Docs")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Runbook")).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText("Untitled"), {
      target: { value: "Operations Runbook" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Export" }));

    expect(onExport).toHaveBeenCalledWith("Operations Runbook");
  });
});
