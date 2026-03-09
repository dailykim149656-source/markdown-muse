import type { NormalizedIngestionDocument } from "@/lib/ingestion/contracts";

export interface ProcedureSourceAttribution {
  chunkId: string;
  ingestionId: string;
  sectionId?: string;
}

export interface ProcedureStep {
  attributions: ProcedureSourceAttribution[];
  order: number;
  stepId: string;
  text: string;
}

export interface ProcedureExtractionResult {
  procedureId: string;
  steps: ProcedureStep[];
  title: string;
  warnings: string[];
}

export interface ProcedureExtractionOptions {
  maxSteps?: number;
}

const PROCEDURE_SECTION_HINT = /(procedure|steps|recovery|runbook|workflow|install|setup|deployment|audit)/i;
const IMPERATIVE_HINT = /^(reset|rotate|enable|disable|configure|install|verify|validate|notify|provision|deploy|open|create|remove|update|restart|check|review)\b/i;

const sentenceSplit = (text: string) =>
  text
    .split(/(?:\.\s+|\n+)/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);

const normalizeStepText = (text: string) =>
  text
    .replace(/^[-\d.)\s]+/, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[.;:,]+$/, "");

const isProceduralSentence = (text: string) => {
  const normalized = normalizeStepText(text);
  return IMPERATIVE_HINT.test(normalized) || /\bthen\b/i.test(normalized);
};

export const extractProcedure = (
  documents: NormalizedIngestionDocument[],
  options: ProcedureExtractionOptions = {},
): ProcedureExtractionResult => {
  const maxSteps = options.maxSteps ?? 12;
  const seenSteps = new Set<string>();
  const steps: ProcedureStep[] = [];
  const warnings: string[] = [];

  for (const document of documents) {
    for (const chunk of document.chunks) {
      const section = chunk.sectionId
        ? document.sections.find((candidateSection) => candidateSection.sectionId === chunk.sectionId)
        : undefined;
      const sectionTitle = section?.title || document.metadata.title || document.fileName;
      const shouldPrefer = PROCEDURE_SECTION_HINT.test(sectionTitle) || PROCEDURE_SECTION_HINT.test(document.fileName);

      for (const sentence of sentenceSplit(chunk.text)) {
        if (!shouldPrefer && !isProceduralSentence(sentence)) {
          continue;
        }

        const normalized = normalizeStepText(sentence);

        if (normalized.length === 0 || !isProceduralSentence(normalized) || seenSteps.has(normalized.toLowerCase())) {
          continue;
        }

        seenSteps.add(normalized.toLowerCase());
        steps.push({
          attributions: [{
            chunkId: chunk.chunkId,
            ingestionId: document.ingestionId,
            sectionId: chunk.sectionId,
          }],
          order: steps.length + 1,
          stepId: `step-${String(steps.length + 1).padStart(3, "0")}`,
          text: normalized,
        });

        if (steps.length >= maxSteps) {
          break;
        }
      }

      if (steps.length >= maxSteps) {
        break;
      }
    }

    if (steps.length >= maxSteps) {
      break;
    }
  }

  if (steps.length === 0) {
    warnings.push("No procedural steps were detected in the provided documents.");
  }

  return {
    procedureId: `proc-${documents.map((document) => document.ingestionId).join("-")}`,
    steps,
    title: documents[0]?.metadata.title || documents[0]?.fileName || "Extracted procedure",
    warnings,
  };
};
