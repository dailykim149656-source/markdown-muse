import { describe, expect, it } from "vitest";
import {
  assertTexCompilationAllowed,
  extractRequestedTexPackages,
  findDisallowedTexPackage,
  findRestrictedTexPrimitive,
  getAllowedTexPackages,
  isFullLatexDocument,
  isRestrictedTexCommandsAllowed,
} from "../../server/modules/tex/security";

describe("tex security", () => {
  it("allows safe generated and raw fragment latex", () => {
    expect(() => assertTexCompilationAllowed({
      latex: "\\section{Overview}\nBody content.",
      sourceType: "generated-latex",
    })).not.toThrow();

    expect(() => assertTexCompilationAllowed({
      latex: "\\resumeProject{Docsy}{Secure preview path}",
      sourceType: "raw-latex",
    })).not.toThrow();
  });

  it("rejects restricted file and process primitives", () => {
    expect(findRestrictedTexPrimitive("\\input{secret.tex}")).toBe("\\input");

    expect(() => assertTexCompilationAllowed({
      latex: "\\includegraphics{secret.png}",
      sourceType: "raw-latex",
    })).toThrow(/restricted command/i);
  });

  it("extracts requested packages and rejects packages outside the allowlist", () => {
    const latex = "\\documentclass{article}\n\\usepackage{amsmath,graphicx}\n\\usepackage[utf8]{inputenc}\n\\usepackage[table]{xcolor}\n\\begin{document}\nHi\n\\end{document}";

    expect(extractRequestedTexPackages(latex)).toEqual(["amsmath", "graphicx", "inputenc", "xcolor"]);
    expect(getAllowedTexPackages().has("amsmath")).toBe(true);
    expect(getAllowedTexPackages().has("inputenc")).toBe(true);
    expect(getAllowedTexPackages().has("caption")).toBe(true);
    expect(getAllowedTexPackages().has("etoolbox")).toBe(true);
    expect(getAllowedTexPackages().has("float")).toBe(true);
    expect(getAllowedTexPackages().has("latexsym")).toBe(true);
    expect(getAllowedTexPackages().has("listings")).toBe(true);
    expect(getAllowedTexPackages().has("soul")).toBe(true);
    expect(getAllowedTexPackages().has("tcolorbox")).toBe(true);
    expect(getAllowedTexPackages().has("ulem")).toBe(true);
    expect(findDisallowedTexPackage("\\usepackage[utf8]{inputenc}", {})).toBe(null);
    expect(findDisallowedTexPackage("\\usepackage{latexsym}", {})).toBe(null);
    expect(findDisallowedTexPackage("\\usepackage{minted}", {})).toBe("minted");

    expect(() => assertTexCompilationAllowed({
      env: {
        TEX_ALLOW_RAW_DOCUMENT: "true",
        TEX_ALLOW_RESTRICTED_COMMANDS: "false",
      },
      latex: "\\documentclass{article}\n\\usepackage{minted}\n\\begin{document}\nHi\n\\end{document}",
      sourceType: "raw-latex",
    })).toThrow(/allowed package list/i);
  });

  it("allows the repo-generated package bundle by default", () => {
    const latex = [
      "\\documentclass{article}",
      "\\usepackage[utf8]{inputenc}",
      "\\usepackage{amsmath,amssymb,graphicx}",
      "\\usepackage[hidelinks]{hyperref}",
      "\\usepackage{xcolor}",
      "\\usepackage{caption}",
      "\\usepackage{etoolbox}",
      "\\usepackage{float}",
      "\\usepackage{latexsym}",
      "\\usepackage{listings}",
      "\\usepackage{soul}",
      "\\usepackage[most]{tcolorbox}",
      "\\usepackage{ulem}",
      "\\begin{document}",
      "Hello",
      "\\end{document}",
    ].join("\n");

    expect(findDisallowedTexPackage(latex, {})).toBe(null);
    expect(() => assertTexCompilationAllowed({
      env: {
        TEX_ALLOW_RAW_DOCUMENT: "true",
        TEX_ALLOW_RESTRICTED_COMMANDS: "false",
      },
      latex,
      sourceType: "raw-latex",
    })).not.toThrow();
  });

  it("rejects full raw latex documents unless explicitly enabled", () => {
    const fullDocument = "\\documentclass{article}\n\\begin{document}\nHi\n\\end{document}";

    expect(isFullLatexDocument(fullDocument)).toBe(true);
    expect(() => assertTexCompilationAllowed({
      env: {
        TEX_ALLOW_RAW_DOCUMENT: "false",
      },
      latex: fullDocument,
      sourceType: "raw-latex",
    })).toThrow(/disabled for this deployment/i);

    expect(() => assertTexCompilationAllowed({
      env: {
        TEX_ALLOW_RAW_DOCUMENT: "true",
      },
      latex: fullDocument,
      sourceType: "raw-latex",
    })).not.toThrow();
  });

  it("keeps restricted primitives blocked unless explicitly enabled", () => {
    const restrictedDocument = "\\documentclass{article}\n\\begin{document}\n\\includegraphics{secret.png}\n\\end{document}";

    expect(isRestrictedTexCommandsAllowed({
      TEX_ALLOW_RESTRICTED_COMMANDS: "false",
    })).toBe(false);

    expect(() => assertTexCompilationAllowed({
      env: {
        TEX_ALLOW_RAW_DOCUMENT: "true",
        TEX_ALLOW_RESTRICTED_COMMANDS: "false",
      },
      latex: restrictedDocument,
      sourceType: "raw-latex",
    })).toThrow(/restricted command/i);

    expect(() => assertTexCompilationAllowed({
      env: {
        TEX_ALLOW_RAW_DOCUMENT: "true",
        TEX_ALLOW_RESTRICTED_COMMANDS: "true",
      },
      latex: restrictedDocument,
      sourceType: "raw-latex",
    })).not.toThrow();
  });
});
