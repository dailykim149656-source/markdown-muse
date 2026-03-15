import type { EditorMode } from "@/types/document";

export type TemplateMode = EditorMode;

export interface DocumentTemplate {
  category: string;
  content: string;
  description: string;
  iconName: string;
  id: string;
  mode: TemplateMode;
  name: string;
}

export interface BuiltInTemplateDefinition {
  content: string;
  id: string;
  mode: TemplateMode;
}

export type CategoryKey = "engineering" | "general" | "operations" | "project";
export type TemplateKey =
  | "adr"
  | "apiSchemaChange"
  | "blank"
  | "changeImpact"
  | "crossDocPlan"
  | "dependencyContract"
  | "handover"
  | "htmlSpec"
  | "jsonConfig"
  | "meeting"
  | "paper"
  | "report"
  | "runbook"
  | "sop"
  | "troubleshooting"
  | "yamlConfig";

export interface TemplateDefinition {
  categoryKey: CategoryKey;
  content: string;
  iconName: string;
  id: string;
  itemKey: TemplateKey;
  mode: TemplateMode;
}

const todayIso = new Date().toISOString().slice(0, 10);

const REPORT_CONTENT = [
  "# Technical Report",
  "",
  "## Summary",
  "",
  "Describe the scope of the report and the main conclusion.",
  "",
  "## Background",
  "",
  "Capture the problem statement, assumptions, and current state.",
  "",
  "## Analysis",
  "",
  "### Findings",
  "",
  "- Finding 1",
  "- Finding 2",
  "- Finding 3",
  "",
  "### Risks",
  "",
  "- Risk 1",
  "- Risk 2",
  "",
  "## Recommendation",
  "",
  "Document the recommended action and why it is preferred.",
].join("\n");

const MEETING_CONTENT = [
  "# Meeting Notes",
  "",
  `- Date: ${todayIso}`,
  "- Participants: ",
  "- Topic: ",
  "",
  "## Agenda",
  "",
  "1. ",
  "2. ",
  "3. ",
  "",
  "## Decisions",
  "",
  "- ",
  "",
  "## Action Items",
  "",
  "- [ ] ",
  "- [ ] ",
].join("\n");

const HANDOVER_CONTENT = [
  "# Project Handover Notes",
  "",
  "## Context",
  "",
  "Summarize project background and current status.",
  "",
  "## Current Architecture",
  "",
  "- Core modules",
  "- Dependencies",
  "- Environment assumptions",
  "",
  "## Open Issues",
  "",
  "- Issue 1",
  "- Issue 2",
  "",
  "## Next Milestones",
  "",
  "1. ",
  "2. ",
  "3. ",
  "",
  "## Operational Notes",
  "",
  "- Deployment checklist",
  "- Rollback path",
  "- Contact points",
].join("\n");

const CHANGE_IMPACT_CONTENT = [
  "# Change Impact Report",
  "",
  `- Date: ${todayIso}`,
  "- Change owner: ",
  "- Scope: ",
  "",
  "## Change Summary",
  "",
  "What changed and why.",
  "",
  "## Source Documents",
  "",
  "- Primary source:",
  "- Supporting source:",
  "",
  "## Impacted Documents",
  "",
  "| Document | Impact Type | Priority | Status |",
  "| --- | --- | --- | --- |",
  "|  |  |  |  |",
  "",
  "## Suggested Patch Plan",
  "",
  "1. ",
  "2. ",
  "3. ",
].join("\n");

const CROSS_DOC_PLAN_CONTENT = [
  "# Cross-Document Update Plan",
  "",
  `- Date: ${todayIso}`,
  "- Coordinator: ",
  "",
  "## Trigger",
  "",
  "Describe the event that triggered this cross-document update.",
  "",
  "## Source and Target Set",
  "",
  "- Source document:",
  "- Target documents:",
  "",
  "## Update Queue",
  "",
  "| Order | Target Doc | Reason | Suggested Action | Owner |",
  "| --- | --- | --- | --- | --- |",
  "| 1 |  |  |  |  |",
  "",
  "## Patch Review Strategy",
  "",
  "- Batch strategy:",
  "- Acceptance criteria:",
  "- Exception handling:",
].join("\n");

const ADR_CONTENT = [
  "# ADR-000: Decision Title",
  "",
  "- Status: Proposed",
  `- Date: ${todayIso}`,
  "- Owners: ",
  "",
  "## Context",
  "",
  "Describe the background and constraints that require this decision.",
  "",
  "## Decision",
  "",
  "State the selected decision clearly.",
  "",
  "## Alternatives Considered",
  "",
  "1. Alternative A",
  "2. Alternative B",
  "3. Alternative C",
  "",
  "## Consequences",
  "",
  "- Positive:",
  "- Negative:",
  "- Follow-up tasks:",
].join("\n");

const API_SCHEMA_CHANGE_CONTENT = [
  "# API / Schema Change Notice",
  "",
  `- Date: ${todayIso}`,
  "- Service/domain: ",
  "- Change owner: ",
  "",
  "## Change Type",
  "",
  "- [ ] New field/endpoint",
  "- [ ] Updated field/endpoint",
  "- [ ] Removed field/endpoint",
  "- [ ] Breaking change",
  "",
  "## Before",
  "",
  "```json",
  "{",
  '  "example": "before"',
  "}",
  "```",
  "",
  "## After",
  "",
  "```json",
  "{",
  '  "example": "after"',
  "}",
  "```",
  "",
  "## Migration Notes",
  "",
  "- Impacted clients/docs:",
  "- Migration steps:",
  "- Deadline:",
].join("\n");

const DEPENDENCY_CONTRACT_CONTENT = [
  "# Dependency Contract Spec",
  "",
  `- Date: ${todayIso}`,
  "- Contract owner: ",
  "",
  "## Upstream",
  "",
  "- System/document:",
  "- Provided interface/data:",
  "",
  "## Downstream",
  "",
  "- Consumers:",
  "- Dependency path:",
  "",
  "## Contract Rules",
  "",
  "- Required invariants:",
  "- Versioning policy:",
  "- Compatibility guarantees:",
  "",
  "## Validation",
  "",
  "- [ ] Contract tests defined",
  "- [ ] Monitoring checkpoints defined",
  "- [ ] Rollback strategy documented",
].join("\n");

const SOP_CONTENT = [
  "---",
  'title: "Operations SOP"',
  "owner: ",
  `lastReviewedAt: ${todayIso}`,
  "status: draft",
  "---",
  "",
  "# Operations SOP",
  "",
  "## Purpose",
  "",
  "Describe why this procedure exists and when to use it.",
  "",
  "## Preconditions",
  "",
  "- Access required",
  "- Dependent systems",
  "",
  "## Procedure",
  "",
  "1. ",
  "2. ",
  "3. ",
  "",
  "## Verification",
  "",
  "- [ ] Expected output confirmed",
  "- [ ] Logs reviewed",
  "",
  "## Rollback",
  "",
  "Document rollback steps if execution fails.",
].join("\n");

const INCIDENT_RUNBOOK_CONTENT = [
  "# Incident Runbook",
  "",
  "## Overview",
  "",
  "Describe incident scope and expected service impact.",
  "",
  "## Detection",
  "",
  "- Alert source:",
  "- Primary metrics:",
  "- Error signatures:",
  "",
  "## Immediate Actions",
  "",
  "1. Acknowledge the incident and assign commander.",
  "2. Capture current system state and recent changes.",
  "3. Stabilize customer-facing impact.",
  "",
  "## Recovery Procedure",
  "",
  "1. ",
  "2. ",
  "3. ",
  "",
  "## Post-Recovery Verification",
  "",
  "- [ ] Error rate returned to baseline",
  "- [ ] Latency/throughput validated",
  "- [ ] Monitoring and dashboards checked",
].join("\n");

const TROUBLESHOOTING_CONTENT = [
  "# Troubleshooting Guide",
  "",
  "## Symptom",
  "",
  "Describe what users or operators observe.",
  "",
  "## Possible Causes",
  "",
  "- Cause 1",
  "- Cause 2",
  "- Cause 3",
  "",
  "## Diagnostics",
  "",
  "1. Command/check:",
  "2. Expected output:",
  "3. Failure signal:",
  "",
  "## Resolution Steps",
  "",
  "1. ",
  "2. ",
  "3. ",
  "",
  "## Prevention",
  "",
  "- Monitoring improvement",
  "- Runbook update",
].join("\n");

const LATEX_PAPER_CONTENT = [
  "\\documentclass[12pt]{article}",
  "\\usepackage[utf8]{inputenc}",
  "\\usepackage{amsmath}",
  "\\usepackage{amssymb}",
  "\\usepackage{graphicx}",
  "\\usepackage[hidelinks]{hyperref}",
  "\\title{Paper Title}",
  "\\author{Author Name}",
  "\\date{\\today}",
  "",
  "\\begin{document}",
  "\\maketitle",
  "",
  "\\begin{abstract}",
  "Summarize the problem, method, and result.",
  "\\end{abstract}",
  "",
  "\\section{Introduction}",
  "Describe the problem and motivation.",
  "",
  "\\section{Method}",
  "Explain the method or experiment design.",
  "",
  "\\section{Results}",
  "Capture the main findings.",
  "",
  "\\section{Conclusion}",
  "Summarize the contribution and next steps.",
  "",
  "\\end{document}",
].join("\n");

const HTML_SPEC_CONTENT = [
  "<h1>System Specification</h1>",
  "<p>Describe the system scope, assumptions, and constraints.</p>",
  "<h2>Requirements</h2>",
  "<ul>",
  "  <li>Functional requirement A</li>",
  "  <li>Functional requirement B</li>",
  "  <li>Non-functional requirement C</li>",
  "</ul>",
  "<h2>Interfaces</h2>",
  "<p>Document internal/external interfaces and contracts.</p>",
  "<h2>Validation</h2>",
  "<ol>",
  "  <li>Test plan summary</li>",
  "  <li>Acceptance criteria</li>",
  "  <li>Rollback and recovery conditions</li>",
  "</ol>",
].join("\n");

const JSON_CONFIG_CONTENT = JSON.stringify({
  app: { name: "docsy-service", version: "1.0.0" },
  logging: { level: "info", pretty: true },
  server: { host: "0.0.0.0", port: 3000 },
}, null, 2);

const YAML_CONFIG_CONTENT = [
  "service:",
  "  name: docsy-worker",
  "  replicas: 2",
  "logging:",
  "  level: info",
  "features:",
  "  patchReview: true",
  "  aiAssistant: true",
].join("\n");

export const TEMPLATE_DEFINITIONS: TemplateDefinition[] = [
  { categoryKey: "project", content: REPORT_CONTENT, iconName: "Briefcase", id: "technical-report", itemKey: "report", mode: "markdown" },
  { categoryKey: "project", content: MEETING_CONTENT, iconName: "ScrollText", id: "meeting-notes", itemKey: "meeting", mode: "markdown" },
  { categoryKey: "project", content: HANDOVER_CONTENT, iconName: "Briefcase", id: "project-handover", itemKey: "handover", mode: "markdown" },
  { categoryKey: "project", content: CHANGE_IMPACT_CONTENT, iconName: "Briefcase", id: "change-impact-report", itemKey: "changeImpact", mode: "markdown" },
  { categoryKey: "project", content: CROSS_DOC_PLAN_CONTENT, iconName: "Briefcase", id: "cross-document-update-plan", itemKey: "crossDocPlan", mode: "markdown" },
  { categoryKey: "engineering", content: ADR_CONTENT, iconName: "FileCode", id: "adr-record", itemKey: "adr", mode: "markdown" },
  { categoryKey: "engineering", content: API_SCHEMA_CHANGE_CONTENT, iconName: "Braces", id: "api-schema-change-notice", itemKey: "apiSchemaChange", mode: "markdown" },
  { categoryKey: "engineering", content: DEPENDENCY_CONTRACT_CONTENT, iconName: "BookOpen", id: "dependency-contract-spec", itemKey: "dependencyContract", mode: "markdown" },
  { categoryKey: "operations", content: SOP_CONTENT, iconName: "BookOpen", id: "operations-sop", itemKey: "sop", mode: "markdown" },
  { categoryKey: "operations", content: INCIDENT_RUNBOOK_CONTENT, iconName: "BookOpen", id: "incident-runbook", itemKey: "runbook", mode: "markdown" },
  { categoryKey: "operations", content: TROUBLESHOOTING_CONTENT, iconName: "ScrollText", id: "troubleshooting-guide", itemKey: "troubleshooting", mode: "markdown" },
  { categoryKey: "engineering", content: LATEX_PAPER_CONTENT, iconName: "FileCode", id: "latex-paper", itemKey: "paper", mode: "latex" },
  { categoryKey: "engineering", content: HTML_SPEC_CONTENT, iconName: "FileCode", id: "html-system-spec", itemKey: "htmlSpec", mode: "html" },
  { categoryKey: "engineering", content: JSON_CONFIG_CONTENT, iconName: "Braces", id: "json-config", itemKey: "jsonConfig", mode: "json" },
  { categoryKey: "engineering", content: YAML_CONFIG_CONTENT, iconName: "Braces", id: "yaml-config", itemKey: "yamlConfig", mode: "yaml" },
  { categoryKey: "general", content: "", iconName: "FileText", id: "blank-markdown", itemKey: "blank", mode: "markdown" },
];

export const getBuiltInTemplateDefinitions = (): BuiltInTemplateDefinition[] =>
  TEMPLATE_DEFINITIONS.map(({ content, id, mode }) => ({
    content,
    id,
    mode,
  }));
