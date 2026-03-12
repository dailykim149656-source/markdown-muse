export type WorkspaceScale = "small" | "medium" | "large";

export const SMALL_WORKSPACE_MAX_NODES = 120;
export const SMALL_WORKSPACE_MAX_EDGES = 180;
export const MEDIUM_WORKSPACE_MAX_NODES = 480;
export const MEDIUM_WORKSPACE_MAX_EDGES = 900;

export const VALIDATED_REVIEW_MAX_NODES = MEDIUM_WORKSPACE_MAX_NODES;
export const VALIDATED_REVIEW_MAX_EDGES = MEDIUM_WORKSPACE_MAX_EDGES;

export const resolveWorkspaceScale = (nodeCount: number, edgeCount: number): WorkspaceScale => {
  if (nodeCount <= SMALL_WORKSPACE_MAX_NODES && edgeCount <= SMALL_WORKSPACE_MAX_EDGES) {
    return "small";
  }

  if (nodeCount <= MEDIUM_WORKSPACE_MAX_NODES && edgeCount <= MEDIUM_WORKSPACE_MAX_EDGES) {
    return "medium";
  }

  return "large";
};

export const resolveRecommendedReviewBatchSize = (workspaceScale: WorkspaceScale) => {
  switch (workspaceScale) {
    case "small":
      return 4;
    case "medium":
      return 2;
    case "large":
    default:
      return 1;
  }
};
