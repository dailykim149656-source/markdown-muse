const KEY_VALUE_LINE_PATTERN = /^(?<prefix>\s*(?:[-*]\s*(?:\[[ xX]\]\s*)?)?)(?<label>[^:：\-\n|]+?)\s*(?<separator>:|：|-|\uC740|\uB294|\uC774|\uAC00)\s*(?<value>.+?)\s*$/u;
const MARKDOWN_TABLE_SEPARATOR_PATTERN = /^\s*\|?(?:\s*:?-{3,}:?\s*\|)+\s*$/;

export interface DocumentFieldLineContext {
  headingNodeId?: string;
  headingTitle?: string;
  sectionId?: string;
}

export type DocumentFieldCandidateKind =
  | "key_value_line"
  | "checklist_line"
  | "table_cell";

export interface DocumentFieldCandidate {
  fieldKey: string;
  fieldLabel: string;
  headingNodeId?: string;
  headingTitle?: string;
  kind: DocumentFieldCandidateKind;
  lineIndex: number;
  lineText: string;
  sectionId?: string;
  tableColumnIndex?: number;
  tableHeaders?: string[];
}

export interface RequestedFieldAssignment {
  fieldKey: string;
  label: string;
  value: string;
}

const trimCell = (value: string) => value.replace(/\s+/g, " ").trim();

export const normalizeFieldKey = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "")
    .trim();

const trimKoreanParticle = (value: string) =>
  value.replace(/(은|는|이|가|을|를|와|과|로|으로)$/u, "");

const parseTableLine = (line: string) => {
  const trimmed = line.trim();

  if (!trimmed.startsWith("|") || !trimmed.endsWith("|")) {
    return null;
  }

  return trimmed
    .slice(1, -1)
    .split("|")
    .map((cell) => trimCell(cell));
};

const buildLineContext = (
  lineContexts: DocumentFieldLineContext[] | undefined,
  lineIndex: number,
) => lineContexts?.[lineIndex] || {};

export const parseRequestedFieldAssignments = (text: string) => {
  const assignments = new Map<string, RequestedFieldAssignment>();
  const patterns = [
    /([^\s,.\n:]+?)\s*(?:\uC740|\uB294|\uC774|\uAC00)\s*([^,.\n]+?)(?=(?:,|\.|\n|\uADF8\uB9AC\uACE0|\uBC0F|$))/gu,
    /([^\s,.\n:]+?)\s*(?:\uC744|\uB97C)\s*([^,.\n]+?)(?:\uB85C|\uC73C\uB85C)\s*(?:\uBC14\uAFD4|\uBCC0\uACBD|\uC218\uC815|\uC785\uB825|\uAE30\uC785|\uC801\uC6A9)(?:\uD574|\uD574\uC918|\uD569\uB2C8\uB2E4)?/gu,
    /set\s+([a-z][a-z0-9 _/-]{0,40}?)\s+to\s+([^,.\n]+?)(?=(?:,|\.|\n|and|$))/giu,
    /([a-z][a-z0-9 _/-]{0,40}?)\s*(?:is|=|:)\s*([^,.\n]+?)(?=(?:,|\.|\n|and|$))/giu,
  ];

  patterns.forEach((pattern) => {
    for (const match of text.matchAll(pattern)) {
      const label = match[1]?.trim();
      const value = match[2]?.trim();

      if (!label || !value) {
        continue;
      }

      const fieldKey = normalizeFieldKey(label);
      assignments.set(fieldKey, { fieldKey, label, value });
    }
  });

  return Array.from(assignments.values());
};

export const extractFieldCandidates = ({
  lineContexts,
  markdown,
}: {
  lineContexts?: DocumentFieldLineContext[];
  markdown: string;
}): DocumentFieldCandidate[] => {
  const lines = markdown.split(/\r?\n/);
  const candidates: DocumentFieldCandidate[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const lineContext = buildLineContext(lineContexts, index);

    const tableHeaderCells = parseTableLine(line);
    const tableSeparatorLine = lines[index + 1];

    if (tableHeaderCells && tableSeparatorLine && MARKDOWN_TABLE_SEPARATOR_PATTERN.test(tableSeparatorLine.trim())) {
      const headers = tableHeaderCells;
      let rowIndex = index + 2;

      while (rowIndex < lines.length) {
        const rowCells = parseTableLine(lines[rowIndex]);

        if (!rowCells) {
          break;
        }

        rowCells.forEach((cellValue, columnIndex) => {
          const fieldLabel = headers[columnIndex];

          if (!fieldLabel || !cellValue) {
            return;
          }

          candidates.push({
            fieldKey: normalizeFieldKey(fieldLabel),
            fieldLabel,
            headingNodeId: buildLineContext(lineContexts, rowIndex).headingNodeId,
            headingTitle: buildLineContext(lineContexts, rowIndex).headingTitle,
            kind: "table_cell",
            lineIndex: rowIndex,
            lineText: lines[rowIndex],
            sectionId: buildLineContext(lineContexts, rowIndex).sectionId,
            tableColumnIndex: columnIndex,
            tableHeaders: headers,
          });
        });

        rowIndex += 1;
      }

      index = rowIndex - 1;
      continue;
    }

    const lineMatch = line.match(KEY_VALUE_LINE_PATTERN);

    if (!lineMatch?.groups?.label || !lineMatch.groups.value) {
      continue;
    }

    const fieldLabel = lineMatch.groups.label.trim();
    const value = lineMatch.groups.value.trim();

    if (!fieldLabel || !value) {
      continue;
    }

    candidates.push({
      fieldKey: normalizeFieldKey(fieldLabel),
      fieldLabel,
      headingNodeId: lineContext.headingNodeId,
      headingTitle: lineContext.headingTitle,
      kind: lineMatch.groups.prefix?.includes("[") ? "checklist_line" : "key_value_line",
      lineIndex: index,
      lineText: line,
      sectionId: lineContext.sectionId,
    });
  }

  return candidates;
};

export const scoreFieldCandidates = ({
  candidates,
  latestUserMessage,
}: {
  candidates: DocumentFieldCandidate[];
  latestUserMessage: string;
}) => {
  const normalizedQuery = latestUserMessage.toLowerCase();
  const terms = Array.from(new Set(
    normalizedQuery
      .split(/[^a-z0-9\uAC00-\uD7A3]+/i)
      .map((term) => term.trim())
      .flatMap((term) => {
        const trimmedParticle = trimKoreanParticle(term);
        return trimmedParticle && trimmedParticle !== term ? [term, trimmedParticle] : [term];
      })
      .filter((term) => term.length >= 2),
  ));

  return candidates
    .map((candidate) => {
      const haystack = `${candidate.fieldLabel}\n${candidate.lineText}\n${candidate.headingTitle || ""}`.toLowerCase();
      const normalizedFieldKey = candidate.fieldKey;
      const matchedTerms = terms.filter((term) => haystack.includes(term) || normalizedFieldKey.includes(normalizeFieldKey(term)));

      if (matchedTerms.length === 0) {
        return null;
      }

      let score = matchedTerms.length * 10;

      if (haystack.includes(normalizedQuery)) {
        score += 18;
      }

      if (candidate.headingTitle && matchedTerms.some((term) => candidate.headingTitle?.toLowerCase().includes(term))) {
        score += 8;
      }

      return {
        ...candidate,
        matchedTerms,
        score,
      };
    })
    .filter((candidate): candidate is DocumentFieldCandidate & { matchedTerms: string[]; score: number } => Boolean(candidate))
    .sort((left, right) =>
      right.score - left.score
      || left.lineIndex - right.lineIndex
      || left.fieldLabel.localeCompare(right.fieldLabel))
    .slice(0, 5);
};
