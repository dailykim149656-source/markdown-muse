import { useCallback, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  connectGoogleWorkspace,
  disconnectGoogleWorkspace,
  getWorkspaceSession,
} from "@/lib/workspace/client";

const WORKSPACE_AUTH_QUERY_KEY = ["workspace-auth-session"];

export const useWorkspaceAuth = () => {
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

  const openGoogleConnect = useCallback(async (returnTo: string) => {
    const result = await connectMutation.mutateAsync({ returnTo });
    window.location.assign(result.authUrl);
  }, [connectMutation]);

  const disconnect = useCallback(async () => {
    await disconnectMutation.mutateAsync();
  }, [disconnectMutation]);

  const session = useMemo(() => sessionQuery.data || {
    connected: false,
    provider: null,
    user: null,
  }, [sessionQuery.data]);

  const error = connectMutation.error || disconnectMutation.error || sessionQuery.error || null;

  return {
    connected: session.connected,
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
