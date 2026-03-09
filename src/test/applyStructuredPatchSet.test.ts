import { describe, expect, it } from "vitest";
import {
  applyStructuredPatchSet,
  parseStructuredPatchDocument,
  serializeStructuredContent,
} from "@/lib/patches/applyStructuredPatchSet";
import { canApplyEditedSuggestedText } from "@/lib/patches/reviewPatchSet";
import type { DocumentPatchSet } from "@/types/documentPatch";

describe("applyStructuredPatchSet", () => {
  it("applies updates and deletions on structured object paths", () => {
    const document = {
      service: {
        host: "old.example.com",
        port: 8080,
      },
      enabled: true,
    };
    const patchSet: DocumentPatchSet = {
      patchSetId: "structured-set-1",
      documentId: "doc-json",
      title: "Structured updates",
      author: "system",
      status: "in_review",
      createdAt: Date.now(),
      patches: [
        {
          patchId: "patch-host",
          title: "Update host",
          operation: "update_attribute",
          target: { targetType: "structured_path", path: "$.service.host" },
          payload: { kind: "update_attribute", value: "api.example.com" },
          author: "system",
          status: "accepted",
        },
        {
          patchId: "patch-enabled",
          title: "Delete enabled",
          operation: "delete_node",
          target: { targetType: "structured_path", path: "$.enabled" },
          author: "system",
          status: "accepted",
        },
      ],
    };

    const result = applyStructuredPatchSet(document, patchSet);

    expect(result.failures).toEqual([]);
    expect(result.appliedPatchIds).toEqual(["patch-host", "patch-enabled"]);
    expect(result.value).toEqual({
      service: {
        host: "api.example.com",
        port: 8080,
      },
    });
  });

  it("inserts array items before and after a target path", () => {
    const patchSet: DocumentPatchSet = {
      patchSetId: "structured-set-2",
      documentId: "doc-json",
      title: "Array insertions",
      author: "system",
      status: "in_review",
      createdAt: Date.now(),
      patches: [
        {
          patchId: "patch-before",
          title: "Insert before item",
          operation: "insert_before",
          target: { targetType: "structured_path", path: "$.steps[1]" },
          payload: { kind: "update_attribute", value: "prepare" },
          author: "system",
          status: "accepted",
        },
        {
          patchId: "patch-after",
          title: "Insert after item",
          operation: "insert_after",
          target: { targetType: "structured_path", path: "$.steps[2]" },
          payload: { kind: "update_attribute", value: "verify" },
          author: "system",
          status: "accepted",
        },
      ],
    };

    const result = applyStructuredPatchSet({ steps: ["start", "restart", "finish"] }, patchSet);

    expect(result.failures).toEqual([]);
    expect(result.value).toEqual({
      steps: ["start", "prepare", "restart", "verify", "finish"],
    });
  });

  it("parses and serializes structured documents for patch review", () => {
    const parsedJson = parseStructuredPatchDocument('{"service":{"port":8080}}', "json");
    const parsedYaml = parseStructuredPatchDocument("service:\n  port: 8080\n", "yaml");

    expect(parsedJson).toEqual({ service: { port: 8080 } });
    expect(parsedYaml).toEqual({ service: { port: 8080 } });
    expect(serializeStructuredContent(parsedJson, "json")).toContain('"port": 8080');
    expect(serializeStructuredContent(parsedYaml, "yaml")).toContain("port: 8080");
  });

  it("disables free-form text edits for structured patches", () => {
    expect(canApplyEditedSuggestedText({
      patchId: "patch-structured",
      title: "Structured change",
      operation: "update_attribute",
      target: { targetType: "structured_path", path: "$.service.port" },
      payload: { kind: "update_attribute", value: 9090 },
      author: "system",
      status: "pending",
    })).toBe(false);
  });
});
