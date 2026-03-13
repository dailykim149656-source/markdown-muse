import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const createDocumentEditorExtensionsMock = vi.fn(() => ["document-extension"]);
const createAdvancedEditorExtensionsMock = vi.fn(() => ["advanced-extension"]);

vi.mock("@/components/editor/editorConfigDocument", () => ({
  createDocumentEditorExtensions: () => createDocumentEditorExtensionsMock(),
}));

vi.mock("@/components/editor/editorConfigAdvanced", () => ({
  createAdvancedEditorExtensions: () => createAdvancedEditorExtensionsMock(),
}));

import { useEditorExtensions } from "@/components/editor/editorConfig";

describe("useEditorExtensions", () => {
  beforeEach(() => {
    createDocumentEditorExtensionsMock.mockClear();
    createAdvancedEditorExtensionsMock.mockClear();
  });

  it("keeps lazy extension factories unloaded when optional features are disabled", () => {
    const { result } = renderHook(() => useEditorExtensions("Placeholder", false, false));

    expect(createDocumentEditorExtensionsMock).not.toHaveBeenCalled();
    expect(createAdvancedEditorExtensionsMock).not.toHaveBeenCalled();
    expect(result.current.extensionsReady).toBe(true);
  });

  it("loads document and advanced extensions only when the related features are enabled", async () => {
    const { result } = renderHook(() => useEditorExtensions("Placeholder", true, true));

    await waitFor(() => {
      expect(createDocumentEditorExtensionsMock).toHaveBeenCalledTimes(1);
      expect(createAdvancedEditorExtensionsMock).toHaveBeenCalledTimes(1);
    });

    expect(result.current.extensions).toEqual(expect.arrayContaining([
      "document-extension",
      "advanced-extension",
    ]));
  });
});
