import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { buildShareLinkInfo } from "@/hooks/useDocumentIO";
import { buildDocShareHash } from "@/lib/share/docShare";

const createDocumentShare = vi.fn();

vi.mock("@/lib/share/shareClient", async () => {
  const actual = await vi.importActual<typeof import("@/lib/share/shareClient")>("@/lib/share/shareClient");

  return {
    ...actual,
    createDocumentShare: (...args: Parameters<typeof createDocumentShare>) => createDocumentShare(...args),
  };
});

const createDocument = (content: string) => ({
  ast: null,
  content,
  createdAt: 1,
  id: "doc-readme",
  metadata: { title: "README" },
  mode: "markdown" as const,
  name: "README",
  sourceSnapshots: {
    markdown: content,
  },
  storageKind: "docsy" as const,
  tiptapJson: null,
  updatedAt: 2,
});

describe("document share link", () => {
  it("creates a server-backed share link for README-scale documents that exceed legacy hash sharing", async () => {
    createDocumentShare.mockReset();
    createDocumentShare.mockResolvedValueOnce({
      expiresAt: 1_900_000_000_000,
      link: "https://app.docsy.dev/s/abc123share",
      shareId: "abc123share",
    });

    const readmeContent = readFileSync(path.resolve(process.cwd(), "README.md"), "utf8");
    const document = createDocument(readmeContent);

    expect(buildDocShareHash(document)).toBeNull();

    const result = await buildShareLinkInfo(document);

    expect(createDocumentShare).toHaveBeenCalledOnce();
    expect(result).toEqual({
      available: true,
      errorCode: null,
      expiresAt: 1_900_000_000_000,
      link: "https://app.docsy.dev/s/abc123share",
      shareId: "abc123share",
    });
  });
});
