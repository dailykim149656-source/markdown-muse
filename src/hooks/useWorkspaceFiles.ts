import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { importWorkspaceFile, listWorkspaceFiles } from "@/lib/workspace/client";

export const useWorkspaceFiles = ({
  enabled,
}: {
  enabled: boolean;
}) => {
  const [query, setQuery] = useState("");

  const filesQuery = useQuery({
    enabled,
    queryFn: () => listWorkspaceFiles({ pageSize: 20, q: query }),
    queryKey: ["workspace-files", query],
    retry: false,
    staleTime: 15_000,
  });

  const importMutation = useMutation({
    mutationFn: importWorkspaceFile,
  });

  const error = filesQuery.error || importMutation.error || null;
  const files = useMemo(
    () => filesQuery.data?.files || [],
    [filesQuery.data?.files],
  );

  return {
    error,
    files,
    importFile: importMutation.mutateAsync,
    isImporting: importMutation.isPending,
    isLoading: filesQuery.isLoading,
    isRefreshing: filesQuery.isFetching,
    nextCursor: filesQuery.data?.nextCursor || null,
    query,
    refetch: filesQuery.refetch,
    setQuery,
  };
};
