import type { LatexRoundtripMetadata } from "@/types/documentAst";

export interface LatexImportResult {
  html: string;
  metadata: LatexRoundtripMetadata;
}
