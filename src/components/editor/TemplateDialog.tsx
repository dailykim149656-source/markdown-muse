import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  BookOpen,
  Braces,
  Briefcase,
  FileCode,
  FileText,
  LayoutTemplate,
  ScrollText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useI18n } from "@/i18n/useI18n";
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

type CategoryKey = "engineering" | "general" | "operations" | "project";
type TemplateKey =
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

type TemplateLocale = "en" | "ko";

interface TemplateDefinition {
  categoryKey: CategoryKey;
  content: string;
  iconName: string;
  id: string;
  itemKey: TemplateKey;
  mode: TemplateMode;
}

interface TemplateDialogText {
  all: string;
  categoryLabel: string;
  categories: Record<CategoryKey, string>;
  items: Record<TemplateKey, { description: string; name: string }>;
  modeLabel: string;
  modeLabels: Record<TemplateMode | "all", string>;
  noResults: string;
  resetFilters: string;
  searchPlaceholder: string;
  title: string;
}

const todayIso = new Date().toISOString().slice(0, 10);

const ICON_MAP: Record<string, ReactNode> = {
  BookOpen: <BookOpen className="h-5 w-5" />,
  Braces: <Braces className="h-5 w-5" />,
  Briefcase: <Briefcase className="h-5 w-5" />,
  FileCode: <FileCode className="h-5 w-5" />,
  FileText: <FileText className="h-5 w-5" />,
  ScrollText: <ScrollText className="h-5 w-5" />,
};

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

const TEMPLATE_DEFINITIONS: TemplateDefinition[] = [
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

const TEMPLATE_DIALOG_TEXT: Record<TemplateLocale, TemplateDialogText> = {
  en: {
    all: "All",
    categoryLabel: "Category",
    categories: {
      engineering: "Engineering",
      general: "General",
      operations: "Operations",
      project: "Project",
    },
    items: {
      adr: { description: "Capture architecture decisions with alternatives and consequences.", name: "ADR record" },
      apiSchemaChange: { description: "Announce API/schema changes with before-after examples and migration notes.", name: "API/schema change notice" },
      blank: { description: "Start a new document with no predefined structure.", name: "Blank document" },
      changeImpact: { description: "Track changed sources, impacted documents, and patch follow-up plan.", name: "Change impact report" },
      crossDocPlan: { description: "Plan and prioritize cross-document update queues and patch-review batches.", name: "Cross-document update plan" },
      dependencyContract: { description: "Define upstream/downstream dependency contracts and compatibility rules.", name: "Dependency contract spec" },
      handover: { description: "Hand off architecture context, open issues, and next milestones.", name: "Handover notes" },
      htmlSpec: { description: "A structured HTML template for requirements, interfaces, and validation.", name: "HTML system spec" },
      jsonConfig: { description: "Application configuration template in JSON.", name: "JSON config" },
      meeting: { description: "Capture agenda, decisions, and follow-up items.", name: "Meeting notes" },
      paper: { description: "A LaTeX paper template with abstract, methods, results, and conclusion sections.", name: "Academic paper" },
      report: { description: "A report template with background, analysis, and conclusion sections.", name: "Technical report" },
      runbook: { description: "Define detection, immediate response, and recovery validation steps.", name: "Incident runbook" },
      sop: { description: "Document purpose, procedure, and verification steps for repeatable operations.", name: "Operations SOP" },
      troubleshooting: { description: "Record symptoms, diagnostics, resolutions, and prevention guidance.", name: "Troubleshooting guide" },
      yamlConfig: { description: "Service configuration template in YAML.", name: "YAML config" },
    },
    modeLabel: "Mode",
    modeLabels: { all: "All", html: "HTML", json: "JSON", latex: "LaTeX", markdown: "Markdown", yaml: "YAML" },
    noResults: "No templates match the current filters.",
    resetFilters: "Reset filters",
    searchPlaceholder: "Search templates by name or description",
    title: "Choose a document template",
  },
  ko: {
    all: "전체",
    categoryLabel: "카테고리",
    categories: {
      engineering: "엔지니어링",
      general: "일반",
      operations: "운영",
      project: "프로젝트",
    },
    items: {
      adr: { description: "아키텍처 의사결정의 배경, 대안, 결과를 기록합니다.", name: "ADR 기록" },
      apiSchemaChange: { description: "API와 스키마 변경 사항을 전후 비교와 함께 정리합니다.", name: "API/스키마 변경 공지" },
      blank: { description: "미리 정의된 구조 없이 새 문서를 시작합니다.", name: "빈 문서" },
      changeImpact: { description: "변경 소스와 영향 문서를 추적하고 후속 패치 계획을 정리합니다.", name: "변경 영향 보고서" },
      crossDocPlan: { description: "문서 간 업데이트 큐와 패치 리뷰 배치를 계획합니다.", name: "문서 간 업데이트 계획" },
      dependencyContract: { description: "업스트림과 다운스트림 간 의존 계약과 호환성 규칙을 정리합니다.", name: "의존성 계약 명세" },
      handover: { description: "아키텍처 맥락, 미해결 이슈, 다음 마일스톤 인계를 위한 템플릿입니다.", name: "인수인계 노트" },
      htmlSpec: { description: "요구사항, 인터페이스, 검증 항목을 정리하는 HTML 템플릿입니다.", name: "HTML 시스템 명세" },
      jsonConfig: { description: "애플리케이션 설정용 JSON 템플릿입니다.", name: "JSON 설정" },
      meeting: { description: "안건, 결정 사항, 후속 작업을 정리합니다.", name: "회의록" },
      paper: { description: "초록, 방법, 결과, 결론 구조의 LaTeX 논문 템플릿입니다.", name: "학술 논문" },
      report: { description: "배경, 분석, 결론 구조의 기술 보고서 템플릿입니다.", name: "기술 보고서" },
      runbook: { description: "탐지, 초기 대응, 복구 검증 단계를 정리합니다.", name: "인시던트 런북" },
      sop: { description: "반복 가능한 운영 절차의 목적, 절차, 검증 단계를 문서화합니다.", name: "운영 SOP" },
      troubleshooting: { description: "증상, 진단, 해결, 예방 가이드를 정리합니다.", name: "트러블슈팅 가이드" },
      yamlConfig: { description: "서비스 설정용 YAML 템플릿입니다.", name: "YAML 설정" },
    },
    modeLabel: "모드",
    modeLabels: { all: "전체", html: "HTML", json: "JSON", latex: "LaTeX", markdown: "Markdown", yaml: "YAML" },
    noResults: "조건에 맞는 템플릿이 없습니다.",
    resetFilters: "필터 초기화",
    searchPlaceholder: "템플릿 이름 또는 설명 검색",
    title: "문서 템플릿 선택",
  },
};

interface TemplateDialogProps {
  onOpenChange: (open: boolean) => void;
  onSelect: (template: DocumentTemplate) => void;
  open: boolean;
  templateFilter?: (template: DocumentTemplate) => boolean;
}

const toTemplateLocale = (locale: string): TemplateLocale => (locale === "ko" ? "ko" : "en");

const TemplateDialog = ({ onOpenChange, onSelect, open, templateFilter }: TemplateDialogProps) => {
  const { locale } = useI18n();
  const ui = TEMPLATE_DIALOG_TEXT[toTemplateLocale(locale)];
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedMode, setSelectedMode] = useState<TemplateMode | "all">("all");
  const [searchKeyword, setSearchKeyword] = useState("");

  useEffect(() => {
    setSelectedCategory(null);
  }, [locale]);

  const templates = useMemo(
    () =>
      TEMPLATE_DEFINITIONS.map((definition) => ({
        category: ui.categories[definition.categoryKey],
        content: definition.content,
        description: ui.items[definition.itemKey].description,
        iconName: definition.iconName,
        id: definition.id,
        mode: definition.mode,
        name: ui.items[definition.itemKey].name,
      })),
    [ui],
  );
  const visibleTemplates = useMemo(
    () => templateFilter ? templates.filter((template) => templateFilter(template)) : templates,
    [templateFilter, templates],
  );

  const categories = useMemo(
    () => Array.from(new Set(visibleTemplates.map((template) => template.category))),
    [visibleTemplates],
  );
  const normalizedKeyword = searchKeyword.trim().toLowerCase();
  const filteredTemplates = visibleTemplates.filter((template) => {
    const matchesCategory = selectedCategory === null || template.category === selectedCategory;
    const matchesMode = selectedMode === "all" || template.mode === selectedMode;
    const matchesKeyword = !normalizedKeyword
      || template.name.toLowerCase().includes(normalizedKeyword)
      || template.description.toLowerCase().includes(normalizedKeyword)
      || template.category.toLowerCase().includes(normalizedKeyword);

    return matchesCategory && matchesMode && matchesKeyword;
  });

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="max-h-[80vh] max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LayoutTemplate className="h-5 w-5" />
            {ui.title}
          </DialogTitle>
          <DialogDescription>{ui.searchPlaceholder}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap items-center gap-1.5">
          <Button
            className="h-7 text-xs"
            onClick={() => {
              setSelectedCategory(null);
              setSelectedMode("all");
              setSearchKeyword("");
            }}
            size="sm"
            variant="outline"
          >
            {ui.resetFilters}
          </Button>
          <div className="w-64">
            <Input
              onChange={(event) => setSearchKeyword(event.target.value)}
              placeholder={ui.searchPlaceholder}
              value={searchKeyword}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <span className="px-2 text-xs text-muted-foreground">{ui.categoryLabel}</span>
          <Button
            className="h-7 text-xs"
            onClick={() => setSelectedCategory(null)}
            size="sm"
            variant={selectedCategory === null ? "default" : "outline"}
          >
            {ui.all}
          </Button>
          {categories.map((category) => (
            <Button
              className="h-7 text-xs"
              key={category}
              onClick={() => setSelectedCategory(category)}
              size="sm"
              variant={selectedCategory === category ? "default" : "outline"}
            >
              {category}
            </Button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <span className="px-2 text-xs text-muted-foreground">{ui.modeLabel}</span>
          {(["all", "markdown", "latex", "html", "json", "yaml"] as Array<TemplateMode | "all">).map((mode) => (
            <Button
              className="h-7 text-xs"
              key={mode}
              onClick={() => setSelectedMode(mode)}
              size="sm"
              variant={selectedMode === mode ? "default" : "outline"}
            >
              {ui.modeLabels[mode]}
            </Button>
          ))}
        </div>

        <ScrollArea className="h-[50vh]">
          <div className="grid grid-cols-1 gap-3 pr-3 sm:grid-cols-2">
            {filteredTemplates.length === 0 && (
              <div className="col-span-2 py-8 text-center text-sm text-muted-foreground">
                {ui.noResults}
              </div>
            )}
            {filteredTemplates.map((template) => (
              <button
                className="group flex items-start gap-3 rounded-lg border border-border p-3 text-left transition-all hover:border-primary hover:bg-secondary/30"
                key={template.id}
                onClick={() => {
                  onSelect(template);
                  onOpenChange(false);
                }}
                type="button"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-secondary/50 text-muted-foreground transition-colors group-hover:text-primary">
                  {ICON_MAP[template.iconName] || <FileText className="h-5 w-5" />}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium">{template.name}</span>
                    <span className="shrink-0 rounded bg-secondary px-1.5 py-0.5 text-[10px] text-muted-foreground">
                      {template.mode.toUpperCase()}
                    </span>
                  </div>
                  <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{template.description}</p>
                </div>
              </button>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default TemplateDialog;
