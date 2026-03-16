import type { AgentAvailableTargetDocument, AgentTurnRequest } from "../../../src/types/liveAgent";

export interface AgentDriveReferenceCandidate {
  excerpt: string;
  fileId: string;
  fileName: string;
}

export interface AgentPreRouteHints {
  activeDocumentPinned: boolean;
  ambiguousDriveReferences: Array<Pick<AgentDriveReferenceCandidate, "fileId" | "fileName">>;
  ambiguousLocalTargets: AgentAvailableTargetDocument[];
  driveReferenceTarget: Pick<AgentDriveReferenceCandidate, "fileId" | "fileName"> | null;
  localTarget: AgentAvailableTargetDocument | null;
}

const ACTIVE_DOCUMENT_PATTERN = /\b(?:this\s+document|current\s+document|current\s+doc|this\s+doc)\b|(?:\uC774\s*\uBB38\uC11C)|(?:\uD604\uC7AC\s*\uBB38\uC11C)/iu;

const normalizeName = (value: string) =>
  value
    .toLowerCase()
    .replace(/\.[a-z0-9]+$/iu, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();

const tokenizeName = (value: string) =>
  normalizeName(value)
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2);

const scoreNameMatch = (latestUserMessage: string, fileName: string) => {
  const normalizedMessage = normalizeName(latestUserMessage);
  const normalizedName = normalizeName(fileName);

  if (!normalizedMessage || !normalizedName) {
    return 0;
  }

  if (normalizedMessage.includes(normalizedName)) {
    return 1;
  }

  const tokens = tokenizeName(fileName);

  if (tokens.length === 0) {
    return 0;
  }

  const matchedTokenCount = tokens.filter((token) => normalizedMessage.includes(token)).length;

  if (matchedTokenCount === tokens.length) {
    return 0.9;
  }

  if (matchedTokenCount >= Math.max(2, Math.ceil(tokens.length * 0.75))) {
    return 0.82;
  }

  return 0;
};

const resolveBestMatch = <T extends { fileName: string }>(
  latestUserMessage: string,
  candidates: T[],
) => {
  const scored = candidates
    .map((candidate) => ({
      candidate,
      score: scoreNameMatch(latestUserMessage, candidate.fileName),
    }))
    .filter((entry) => entry.score >= 0.82)
    .sort((left, right) => right.score - left.score || left.candidate.fileName.localeCompare(right.candidate.fileName));

  if (scored.length === 0) {
    return {
      ambiguous: [] as T[],
      exact: null as T | null,
    };
  }

  if (scored.length === 1) {
    return {
      ambiguous: [] as T[],
      exact: scored[0].candidate,
    };
  }

  if (Math.abs(scored[0].score - scored[1].score) < 0.08) {
    return {
      ambiguous: scored.map((entry) => entry.candidate),
      exact: null as T | null,
    };
  }

  return {
    ambiguous: [] as T[],
    exact: scored[0].candidate,
  };
};

export const buildAgentPreRouteHints = ({
  driveReferences,
  latestUserMessage,
  request,
}: {
  driveReferences: AgentDriveReferenceCandidate[];
  latestUserMessage: string;
  request: AgentTurnRequest;
}): AgentPreRouteHints => {
  const localResolution = resolveBestMatch(latestUserMessage, request.availableTargetDocuments || []);
  const driveResolution = resolveBestMatch(latestUserMessage, driveReferences);

  return {
    activeDocumentPinned: ACTIVE_DOCUMENT_PATTERN.test(latestUserMessage),
    ambiguousDriveReferences: driveResolution.ambiguous.map((candidate) => ({
      fileId: candidate.fileId,
      fileName: candidate.fileName,
    })),
    ambiguousLocalTargets: localResolution.ambiguous,
    driveReferenceTarget: driveResolution.exact
      ? {
        fileId: driveResolution.exact.fileId,
        fileName: driveResolution.exact.fileName,
      }
      : null,
    localTarget: localResolution.exact,
  };
};
