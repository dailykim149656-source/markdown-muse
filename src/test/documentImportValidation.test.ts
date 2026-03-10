import { describe, expect, it } from "vitest";
import {
  MAX_IMPORT_FILE_SIZE_BYTES,
  validateImportFileCandidate,
} from "@/hooks/useDocumentIO";

describe("document import validation", () => {
  it("accepts supported files within the size limit", () => {
    const result = validateImportFileCandidate({
      name: "runbook.docsy",
      size: MAX_IMPORT_FILE_SIZE_BYTES,
    });

    expect(result).toEqual({ ok: true });
  });

  it("rejects unsupported file extensions", () => {
    const result = validateImportFileCandidate({
      name: "diagram.png",
      size: 1024,
    });

    expect(result).toEqual({
      code: "unsupported_extension",
      ok: false,
    });
  });

  it("rejects oversized files", () => {
    const result = validateImportFileCandidate({
      name: "large.md",
      size: MAX_IMPORT_FILE_SIZE_BYTES + 1,
    });

    expect(result).toEqual({
      code: "file_too_large",
      ok: false,
    });
  });
});
