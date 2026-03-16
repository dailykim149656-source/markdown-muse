import { describe, expect, it } from "vitest";
import { normalizeAgentTurnResponse } from "../../server/modules/agent/turnResponse";

describe("normalizeAgentTurnResponse", () => {
  it("downgrades invalid import actions to drive candidate selection", () => {
    const response = normalizeAgentTurnResponse({
      availableImportTargets: [{
        fileId: "file-1",
        fileName: "Runbook",
      }],
      driveCandidates: [{
        excerpt: "Runbook excerpt",
        fileId: "file-1",
        fileName: "Runbook",
        relevanceReason: "Matched terms: runbook.",
      }],
      response: {
        assistantText: "Importing the best match.",
        effect: {
          fileId: "missing-file",
          type: "ready_to_import_drive_file",
        },
      },
    });

    expect(response.effect).toEqual({
      query: "google drive document search",
      type: "show_drive_candidates",
    });
    expect(response.driveCandidates).toHaveLength(1);
  });

  it("keeps valid current-document drafts", () => {
    const response = normalizeAgentTurnResponse({
      availableImportTargets: [],
      driveCandidates: [],
      response: {
        assistantText: "I prepared a reviewable draft.",
        currentDocumentDraft: {
          edits: [{
            kind: "replace_section",
            markdownBody: "Updated body",
            rationale: "Refresh the section.",
            targetHeadingNodeId: "heading-1",
          }],
          kind: "current_document",
        },
        effect: {
          changeSetTitle: "Live agent update",
          summary: "Review the updates.",
          type: "draft_current_document",
        },
      },
    });

    expect(response.effect.type).toBe("draft_current_document");
    expect(response.currentDocumentDraft?.edits).toHaveLength(1);
  });

  it("keeps full-body current-document drafts for headingless documents", () => {
    const response = normalizeAgentTurnResponse({
      availableImportTargets: [],
      driveCandidates: [],
      response: {
        assistantText: "I prepared a reviewable full-body update.",
        currentDocumentDraft: {
          edits: [{
            kind: "replace_document_body",
            markdownBody: "Handover owner: Hong Gil-dong",
            rationale: "Apply the new handover owner.",
          }],
          kind: "current_document",
        },
        effect: {
          changeSetTitle: "Update current document",
          summary: "Review the new handover values.",
          type: "draft_current_document",
        },
      },
    });

    expect(response.effect.type).toBe("draft_current_document");
    expect(response.currentDocumentDraft?.edits[0]?.kind).toBe("replace_document_body");
  });

  it("adds a draft creation hint for new-document responses", () => {
    const response = normalizeAgentTurnResponse({
      availableImportTargets: [],
      driveCandidates: [],
      response: {
        assistantText: "새 자기소개서 초안을 준비했습니다.",
        effect: {
          summary: "Review the draft.",
          title: "자기소개서 초안",
          type: "draft_new_document",
        },
        newDocumentDraft: {
          kind: "new_document",
          markdown: "# 자기소개서\n\n## 지원 동기\n\n- 내용을 작성하세요.",
          rationale: "사용자 요청에 맞는 자기소개서 양식입니다.",
          title: "자기소개서 초안",
        },
      },
    });

    expect(response.assistantMessage.text).toContain("Create Draft");
    expect(response.effect.type).toBe("draft_new_document");
  });

  it("keeps agent status responses as reply_only without draft payloads", () => {
    const response = normalizeAgentTurnResponse({
      availableImportTargets: [],
      driveCandidates: [],
      response: {
        agentStatus: {
          kind: "gemini_unavailable",
          message: "Gemini가 연결되어 있지 않습니다.",
        },
        assistantText: "Gemini가 연결되어 있지 않습니다.",
        effect: {
          type: "reply_only",
        },
      },
    });

    expect(response.agentStatus?.kind).toBe("gemini_unavailable");
    expect(response.effect.type).toBe("reply_only");
    expect(response.newDocumentDraft).toBeUndefined();
    expect(response.currentDocumentDraft).toBeUndefined();
  });

  it("normalizes delegated assistant capability effects", () => {
    const response = normalizeAgentTurnResponse({
      availableImportTargets: [],
      driveCandidates: [],
      response: {
        assistantText: "I prepared a summary request.",
        effect: {
          capability: "summarize_document",
          createDocumentAfter: true,
          objective: "Summarize the current document.",
          type: "delegate_ai_capability",
        },
      },
    });

    expect(response.effect).toEqual({
      capability: "summarize_document",
      createDocumentAfter: true,
      objective: "Summarize the current document.",
      prompt: undefined,
      targetDocumentId: undefined,
      targetDocumentName: undefined,
      type: "delegate_ai_capability",
    });
    expect(response.assistantMessage.text).toContain("summary document");
  });
});
