const RESUME_SUPPORT_MARKER = "% Docsy resume support";

const buildResumeCommandDefinition = (name: string, body: string, argCount = 0) => {
  const argSuffix = argCount > 0 ? `[${argCount}]` : "";

  return [
    `\\@ifundefined{${name}}{`,
    `  \\newcommand{\\${name}}${argSuffix}{%`,
    body,
    "  }",
    "}{",
    `  \\renewcommand{\\${name}}${argSuffix}{%`,
    body,
    "  }",
    "}",
  ].join("\n");
};

export const hasResumeLatexCommands = (latex: string) =>
  /\\resume(?:Community|Employment|EmploymentList(?:Start|End)?|Item(?:List(?:Start|End)?)?|Project|Research|Skills|SubHeadingList(?:Start|End)?|Subheading|Summary|Talk)\b/.test(latex);

export const buildResumeSupportBlock = () => [
  RESUME_SUPPORT_MARKER,
  "\\makeatletter",
  buildResumeCommandDefinition("resumeSummary", [
    "    \\par\\noindent #1\\par",
  ].join("\n"), 1),
  buildResumeCommandDefinition("resumeEmployment", [
    "    \\item",
    "      \\textbf{#1}\\hfill #4\\\\",
    "      \\textit{#3}\\hfill #2",
  ].join("\n"), 4),
  buildResumeCommandDefinition("resumeCommunity", [
    "    \\item",
    "      \\textbf{#1}\\hfill #2\\\\",
    "      \\textit{#3}",
  ].join("\n"), 3),
  buildResumeCommandDefinition("resumeSubheading", [
    "    \\item",
    "      \\textbf{#1}\\hfill #2\\\\",
    "      \\textit{#3}\\hfill #4",
  ].join("\n"), 4),
  buildResumeCommandDefinition("resumeProject", [
    "    \\item",
    "      \\textbf{#1}\\\\",
    "      #2",
  ].join("\n"), 2),
  buildResumeCommandDefinition("resumeResearch", [
    "    \\item",
    "      \\textbf{#1}\\hfill #2\\\\",
    "      \\textit{#3}\\hfill #5\\\\",
    "      #4",
  ].join("\n"), 5),
  buildResumeCommandDefinition("resumeTalk", [
    "    \\item",
    "      \\textbf{#1}\\hfill #2",
  ].join("\n"), 2),
  buildResumeCommandDefinition("resumeSkills", [
    "    \\item #1",
  ].join("\n"), 1),
  buildResumeCommandDefinition("resumeEmploymentListStart", [
    "    \\begin{itemize}[leftmargin=0pt,label={}]",
  ].join("\n")),
  buildResumeCommandDefinition("resumeEmploymentListEnd", [
    "    \\end{itemize}",
  ].join("\n")),
  buildResumeCommandDefinition("resumeSubHeadingListStart", [
    "    \\begin{itemize}[leftmargin=0pt,label={}]",
  ].join("\n")),
  buildResumeCommandDefinition("resumeSubHeadingListEnd", [
    "    \\end{itemize}",
  ].join("\n")),
  buildResumeCommandDefinition("resumeItemListStart", [
    "    \\begin{itemize}[leftmargin=1.5em]",
  ].join("\n")),
  buildResumeCommandDefinition("resumeItemListEnd", [
    "    \\end{itemize}",
  ].join("\n")),
  buildResumeCommandDefinition("resumeItem", [
    "    \\item #1",
  ].join("\n"), 1),
  "\\makeatother",
].join("\n");

export const ensureResumePreambleSupport = (preamble: string) => {
  if (preamble.includes(RESUME_SUPPORT_MARKER)) {
    return preamble;
  }

  const supportLines: string[] = [];
  if (!/\\usepackage(?:\[[^\]]*\])?\{enumitem\}/.test(preamble)) {
    supportLines.push("\\usepackage{enumitem}");
  }
  supportLines.push(buildResumeSupportBlock());

  const supportBlock = `\n${supportLines.join("\n\n")}\n`;
  const beginDocumentIndex = preamble.indexOf("\\begin{document}");

  if (beginDocumentIndex === -1) {
    return `${preamble.trimEnd()}${supportBlock}`;
  }

  return `${preamble.slice(0, beginDocumentIndex)}${supportBlock}${preamble.slice(beginDocumentIndex)}`;
};
