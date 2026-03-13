import { describe, expect, it } from "vitest";
import { htmlToLatex } from "@/components/editor/utils/htmlToLatex";
import { renderAstToLatex } from "@/lib/ast/renderAstToLatex";
import { exportDocsyToLatex } from "@/lib/latex/exportDocsyToLatex";
import { resumeLatexFixture } from "@/test/fixtures/resumeLatex.fixture";
import type { DocumentAst } from "@/types/documentAst";

describe("resume latex support", () => {
  it("adds resume macro support to wrapped HTML exports", () => {
    const latex = htmlToLatex(
      '<div data-type="resume-summary" data-summary="Owned editor architecture."></div>',
      true,
    );

    expect(latex).toContain("% Docsy resume support");
    expect(latex).toContain("\\usepackage{enumitem}");
    expect(latex).toContain("\\resumeSummary{Owned editor architecture.}");
    expect(latex).toContain("\\@ifundefined{resumeSummary}");
  });

  it("adds resume macro support to wrapped AST exports", () => {
    const ast: DocumentAst = {
      type: "document",
      nodeId: "doc_resume",
      blocks: [
        {
          kind: "block",
          nodeId: "resume_summary_1",
          summary: "Owned editor architecture.",
          type: "resume_summary",
        },
        {
          commandName: "resumeEmployment",
          details: ["Shipped LaTeX export fixes."],
          kind: "block",
          nodeId: "resume_entry_1",
          subtitle: "Senior Engineer",
          tertiaryText: "2024 - Present",
          title: "Docsy Labs",
          trailingText: "Seoul",
          type: "resume_entry",
        },
      ],
    };

    const latex = renderAstToLatex(ast, { includeWrapper: true });

    expect(latex).toContain("% Docsy resume support");
    expect(latex).toContain("\\usepackage{enumitem}");
    expect(latex).toContain("\\resumeEmploymentListStart");
    expect(latex).toContain("\\@ifundefined{resumeEmployment}");
  });

  it("repairs preserved resume wrappers with compile-safe macro support", () => {
    const importedHtml = [
      '<div data-type="resume-summary" data-summary="Owned editor architecture."></div>',
      '<div data-type="resume-entry" data-command-name="resumeCommunity" data-title="Open Source Seoul" data-trailing-text="Seoul" data-subtitle="Organizer" data-details="[&quot;Hosted monthly contributor sessions.&quot;]"></div>',
    ].join("");

    const latex = exportDocsyToLatex({
      currentLatexSource: resumeLatexFixture,
      html: importedHtml,
      title: "Resume",
    });

    expect(latex).toContain("% Docsy resume support");
    expect(latex).toContain("\\usepackage{enumitem}");
    expect(latex).toContain("\\@ifundefined{resumeCommunity}");
    expect(latex).toContain("\\resumeSummary{Owned editor architecture.}");
  });
});
