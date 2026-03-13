import { describe, expect, it } from "vitest";
import { migrateStoredDocumentData } from "@/lib/documents/storedDocument";

describe("migrateStoredDocumentData", () => {
  it("drops empty tiptapJson when source content exists", () => {
    const migrated = migrateStoredDocumentData({
      content: "# Restored",
      createdAt: 1,
      id: "doc-1",
      mode: "markdown",
      name: "Restored",
      sourceSnapshots: {
        markdown: "# Restored",
      },
      tiptapJson: {
        type: "doc",
        content: [{ type: "paragraph" }],
      },
      updatedAt: 2,
    } as any);

    expect(migrated.tiptapJson).toBeNull();
  });

  it("keeps meaningful tiptapJson intact", () => {
    const meaningful = {
      type: "doc",
      content: [{
        type: "paragraph",
        content: [{ type: "text", text: "Hello" }],
      }],
    };

    const migrated = migrateStoredDocumentData({
      content: "# Restored",
      createdAt: 1,
      id: "doc-1",
      mode: "markdown",
      name: "Restored",
      sourceSnapshots: {
        markdown: "# Restored",
      },
      tiptapJson: meaningful,
      updatedAt: 2,
    } as any);

    expect(migrated.tiptapJson).toEqual(meaningful);
  });
});
