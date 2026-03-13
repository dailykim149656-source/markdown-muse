import { describe, expect, it } from "vitest";
import { exportDocsyToLatex } from "@/lib/latex/exportDocsyToLatex";
import { importLatexToDocsy } from "@/lib/latex/importLatexToDocsy";
import { resumeLatexFixture } from "@/test/fixtures/resumeLatex.fixture";

describe("latex import/export roundtrip", () => {
  const latexPaperFixture = String.raw`\documentclass[12pt]{article}
\usepackage[utf8]{inputenc}
\usepackage{amsmath}
\usepackage{amssymb}
\usepackage{graphicx}
\usepackage[hidelinks]{hyperref}
\title{Paper Title}
\author{Author Name}
\date{\today}

\begin{document}
\maketitle

\begin{abstract}
Summarize the problem, method, and result.
\end{abstract}

\section{Introduction}
Describe the problem and motivation.

\section{Method}
Explain the method or experiment design.
\end{document}`;

  it("recognizes the resume template into structured WYSIWYG blocks", () => {
    const imported = importLatexToDocsy(resumeLatexFixture);

    expect(imported.metadata.profile).toBe("resume");
    expect(imported.html).toContain('data-type="resume-header"');
    expect(imported.html).toContain('data-type="resume-summary"');
    expect(imported.html).toContain('data-type="resume-entry"');
    expect(imported.html).toContain('data-type="resume-skill-row"');
    expect(imported.html).toContain('data-type="opaque-latex-block"');
    expect(imported.html).toContain('data-command-name="resumeCommunity"');
  });

  it("exports structured resume blocks back to resume macros while preserving wrappers", () => {
    const imported = importLatexToDocsy(resumeLatexFixture);
    const exported = exportDocsyToLatex({
      currentLatexSource: resumeLatexFixture,
      html: imported.html,
      title: "Resume",
    });

    expect(exported).toContain("\\documentclass[letterpaper,11pt]{article}");
    expect(exported).toContain("\\resumeSummary{");
    expect(exported).toContain("\\resumeEmployment{Docsy Labs}{Seoul, South Korea}{Senior Engineer}{Apr. 2021 - Present}");
    expect(exported).toContain("\\resumeProject{Resume Importer}{Parsed LaTeX resumes into editable content}");
    expect(exported).toContain("\\resumeSkills{\\textbf{Programming} - TypeScript, Python}");
    expect(exported).toContain("\\resumeCommunity{Open Source Seoul}{Seoul, South Korea}{Organizer}");
    expect(exported).toContain("\\resumeItem{Hosted monthly contributor sessions.}");
    expect(exported).toContain("\\resumeItemListStart");
    expect(exported).toContain("\\resumeItem{Hosted monthly contributor sessions.}");
    expect(exported).toContain("\\customunknown{keep me}");
    expect(exported).toContain("\\end{document}");
  });

  it("groups malformed resume list syntax into one opaque latex block", () => {
    const malformed = String.raw`\begin{document}
\resumeItemListStart
\resumeItem{A}
\resumeItem{B}
\customunknown{oops}
\section{Next}
\end{document}`;

    const imported = importLatexToDocsy(malformed);
    const opaqueMatches = imported.html.match(/data-type="opaque-latex-block"/g) || [];

    expect(opaqueMatches).toHaveLength(1);
    expect(imported.html).toContain("\\resumeItemListStart");
    expect(imported.html).toContain("\\customunknown{oops}");
    expect(imported.html).toContain("<h1>Next</h1>");
  });

  it("imports the built-in paper template without opaque fallback for title and abstract", () => {
    const imported = importLatexToDocsy(latexPaperFixture);

    expect(imported.html).toContain('data-type="latex-title-block"');
    expect(imported.html).toContain('data-type="latex-abstract"');
    expect(imported.html).not.toContain('data-type="opaque-latex-block"');
  });

  it("exports title block values back into preamble and body", () => {
    const imported = importLatexToDocsy(latexPaperFixture)
      .html
      .replace('data-title="Paper Title"', 'data-title="Rewritten Title"')
      .replace('data-author="Author Name"', 'data-author="Jane Author"');

    const exported = exportDocsyToLatex({
      currentLatexSource: latexPaperFixture,
      html: imported,
      title: "Fallback",
    });

    expect(exported).toContain("\\title{Rewritten Title}");
    expect(exported).toContain("\\author{Jane Author}");
    expect(exported).toContain("\\maketitle");
    expect(exported).toContain("\\begin{abstract}");
  });
});
