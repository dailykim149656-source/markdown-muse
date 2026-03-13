import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useWorkspaceAuth } from "@/hooks/useWorkspaceAuth";

const checkWorkspaceApiHealth = vi.fn();
const connectGoogleWorkspace = vi.fn();
const disconnectGoogleWorkspace = vi.fn();
const getWorkspaceSession = vi.fn();
const getWorkspaceApiBaseUrl = vi.fn();

vi.mock("@/lib/workspace/client", async () => {
  const actual = await vi.importActual<typeof import("@/lib/workspace/client")>("@/lib/workspace/client");

  return {
    ...actual,
    checkWorkspaceApiHealth: (...args: Parameters<typeof checkWorkspaceApiHealth>) => checkWorkspaceApiHealth(...args),
    connectGoogleWorkspace: (...args: Parameters<typeof connectGoogleWorkspace>) => connectGoogleWorkspace(...args),
    disconnectGoogleWorkspace: (...args: Parameters<typeof disconnectGoogleWorkspace>) => disconnectGoogleWorkspace(...args),
    getWorkspaceSession: (...args: Parameters<typeof getWorkspaceSession>) => getWorkspaceSession(...args),
    getWorkspaceApiBaseUrl: (...args: Parameters<typeof getWorkspaceApiBaseUrl>) => getWorkspaceApiBaseUrl(...args),
  };
});

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      mutations: {
        retry: false,
      },
      queries: {
        retry: false,
      },
    },
  });

  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe("useWorkspaceAuth", () => {
  beforeEach(() => {
    checkWorkspaceApiHealth.mockReset();
    connectGoogleWorkspace.mockReset();
    disconnectGoogleWorkspace.mockReset();
    getWorkspaceSession.mockReset();
    getWorkspaceApiBaseUrl.mockReset();

    getWorkspaceSession.mockResolvedValue({
      connected: false,
      provider: null,
      user: null,
    });
    getWorkspaceApiBaseUrl.mockReturnValue("/api");
  });

  it("stores connectivity diagnostics when the workspace API health check fails", async () => {
    checkWorkspaceApiHealth.mockRejectedValueOnce(new Error("Workspace API call to /api/ai/health returned HTML instead of JSON."));

    const { result } = renderHook(
      () => useWorkspaceAuth(),
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(result.current.error).toBeInstanceOf(Error);
      expect(result.current.error?.message).toBe("Workspace API is not reachable.");
    });

    expect(result.current.connectivityDiagnostic).toEqual({
      details: "Workspace API call to /api/ai/health returned HTML instead of JSON.",
      target: "/api",
    });
  });

  it("exposes structured API health when the health check succeeds", async () => {
    checkWorkspaceApiHealth.mockResolvedValueOnce({
      configured: true,
      model: "gemini-2.5-flash",
      ok: true,
    });

    const { result } = renderHook(
      () => useWorkspaceAuth(),
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(result.current.apiHealth).toEqual({
        configured: true,
        model: "gemini-2.5-flash",
        ok: true,
      });
    });

    expect(result.current.aiSummaryAvailable).toBe(true);
  });
});
