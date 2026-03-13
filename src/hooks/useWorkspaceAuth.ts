import { useCallback, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  checkWorkspaceApiHealth,
  connectGoogleWorkspace,
  disconnectGoogleWorkspace,
  getWorkspaceSession,
  getWorkspaceApiBaseUrl,
  type WorkspaceApiHealthStatus,
} from "@/lib/workspace/client";

const WORKSPACE_AUTH_QUERY_KEY = ["workspace-auth-session"];

interface WorkspaceConnectivityDiagnostic {
  target: string;
  details?: string;
}

export const useWorkspaceAuth = () => {
  const [apiHealth, setApiHealth] = useState<WorkspaceApiHealthStatus | null>(null);
  const [connectivityError, setConnectivityError] = useState<Error | null>(null);
  const [connectivityDiagnostic, setConnectivityDiagnostic] = useState<WorkspaceConnectivityDiagnostic | null>(null);
  const queryClient = useQueryClient();
  const sessionQuery = useQuery({
    queryFn: getWorkspaceSession,
    queryKey: WORKSPACE_AUTH_QUERY_KEY,
    refetchOnWindowFocus: false,
    retry: false,
    staleTime: 30_000,
  });

  const connectMutation = useMutation({
    mutationFn: connectGoogleWorkspace,
  });

  const disconnectMutation = useMutation({
    mutationFn: disconnectGoogleWorkspace,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: WORKSPACE_AUTH_QUERY_KEY });
    },
  });

  const verifyWorkspaceApi = useCallback(async () => {
    try {
      const health = await checkWorkspaceApiHealth();
      setApiHealth(health);
      setConnectivityError(null);
      setConnectivityDiagnostic(null);
      return health;
    } catch (error) {
      const baseUrl = getWorkspaceApiBaseUrl();
      const message = error instanceof Error ? error.message : "Workspace API health check failed.";
      const wrapped = new Error("Workspace API is not reachable.");
      const diagnostic = {
        target: baseUrl,
        details: message,
      };
      setApiHealth(null);
      setConnectivityDiagnostic(diagnostic);
      setConnectivityError(wrapped);
      throw wrapped;
    }
  }, []);

  const openGoogleConnect = useCallback(async (returnTo: string) => {
    await verifyWorkspaceApi();
    const result = await connectMutation.mutateAsync({ returnTo });
    window.location.assign(result.authUrl);
  }, [connectMutation, verifyWorkspaceApi]);

  useEffect(() => {
    void verifyWorkspaceApi().catch(() => undefined);
  }, [verifyWorkspaceApi]);

  const disconnect = useCallback(async () => {
    await disconnectMutation.mutateAsync();
  }, [disconnectMutation]);

  const session = useMemo(() => sessionQuery.data || {
    connected: false,
    provider: null,
    user: null,
  }, [sessionQuery.data]);

  const error = connectivityError
    || connectMutation.error
    || disconnectMutation.error
    || sessionQuery.error
    || null;

  return {
    aiSummaryAvailable: Boolean(apiHealth?.ok && apiHealth.configured),
    apiHealth,
    connected: session.connected,
    connectivityDiagnostic,
    disconnect,
    error,
    isConnecting: connectMutation.isPending,
    isDisconnecting: disconnectMutation.isPending,
    isLoading: sessionQuery.isLoading,
    openGoogleConnect,
    refetch: sessionQuery.refetch,
    session,
  };
};
