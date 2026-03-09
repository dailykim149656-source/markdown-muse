import { useMemo, useState } from "react";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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

const todayIso = new Date().toISOString().slice(0, 10);

const ICON_MAP: Record<string, React.ReactNode> = {
  BookOpen: <BookOpen className="h-5 w-5" />,
  Braces: <Braces className="h-5 w-5" />,
  Briefcase: <Briefcase className="h-5 w-5" />,
  FileCode: <FileCode className="h-5 w-5" />,
  FileText: <FileText className="h-5 w-5" />,
  ScrollText: <ScrollText className="h-5 w-5" />,
};

const MARKDOWN_REPORT = [
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

const MEETING_NOTES = [
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

const OPERATIONS_SOP = [
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

const LATEX_PAPER = [
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

const JSON_CONFIG = JSON.stringify({
  app: { name: "docsy-service", version: "1.0.0" },
  logging: { level: "info", pretty: true },
  server: { host: "0.0.0.0", port: 3000 },
}, null, 2);

const YAML_CONFIG = [
  "service:",
  "  name: docsy-worker",
  "  replicas: 2",
  "logging:",
  "  level: info",
  "features:",
  "  patchReview: true",
  "  aiAssistant: true",
].join("\n");

const MODE_LABELS: Record<TemplateMode | "all", string> = {
  all: "All",
  html: "HTML",
  json: "JSON",
  latex: "LaTeX",
  markdown: "Markdown",
  yaml: "YAML",
};

interface TemplateDialogProps {
  onOpenChange: (open: boolean) => void;
  onSelect: (template: DocumentTemplate) => void;
  open: boolean;
}

const TemplateDialog = ({ onOpenChange, onSelect, open }: TemplateDialogProps) => {
  const { t } = useI18n();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedMode, setSelectedMode] = useState<TemplateMode | "all">("all");
  const [searchKeyword, setSearchKeyword] = useState("");

  const templates = useMemo<DocumentTemplate[]>(() => [
    {
      category: t("templates.categories.general"),
      content: "",
      description: t("templates.items.blank.description"),
      iconName: "FileText",
      id: "blank-markdown",
      mode: "markdown",
      name: t("templates.items.blank.name"),
    },
    {
      category: t("templates.categories.project"),
      content: MARKDOWN_REPORT,
      description: t("templates.items.report.description"),
      iconName: "Briefcase",
      id: "technical-report",
      mode: "markdown",
      name: t("templates.items.report.name"),
    },
    {
      category: t("templates.categories.project"),
      content: MEETING_NOTES,
      description: t("templates.items.meeting.description"),
      iconName: "ScrollText",
      id: "meeting-notes",
      mode: "markdown",
      name: t("templates.items.meeting.name"),
    },
    {
      category: t("templates.categories.operations"),
      content: OPERATIONS_SOP,
      description: t("templates.items.sop.description"),
      iconName: "BookOpen",
      id: "operations-sop",
      mode: "markdown",
      name: t("templates.items.sop.name"),
    },
    {
      category: t("templates.categories.engineering"),
      content: LATEX_PAPER,
      description: t("templates.items.paper.description"),
      iconName: "FileCode",
      id: "latex-paper",
      mode: "latex",
      name: t("templates.items.paper.name"),
    },
    {
      category: t("templates.categories.engineering"),
      content: JSON_CONFIG,
      description: t("templates.items.jsonConfig.description"),
      iconName: "Braces",
      id: "json-config",
      mode: "json",
      name: t("templates.items.jsonConfig.name"),
    },
    {
      category: t("templates.categories.engineering"),
      content: YAML_CONFIG,
      description: t("templates.items.yamlConfig.description"),
      iconName: "Braces",
      id: "yaml-config",
      mode: "yaml",
      name: t("templates.items.yamlConfig.name"),
    },
  ], [t]);

  const categories = useMemo(() => Array.from(new Set(templates.map((template) => template.category))), [templates]);
  const normalizedKeyword = searchKeyword.trim().toLowerCase();
  const filteredTemplates = templates.filter((template) => {
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
            {t("templates.title")}
          </DialogTitle>
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
            {t("templates.resetFilters")}
          </Button>
          <div className="w-64">
            <Input
              onChange={(event) => setSearchKeyword(event.target.value)}
              placeholder={t("templates.searchPlaceholder")}
              value={searchKeyword}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <span className="px-2 text-xs text-muted-foreground">{t("templates.categoryLabel")}</span>
          <Button
            className="h-7 text-xs"
            onClick={() => setSelectedCategory(null)}
            size="sm"
            variant={selectedCategory === null ? "default" : "outline"}
          >
            {t("templates.all")}
          </Button>
          {categories.map((category) => (
            <Button
              key={category}
              className="h-7 text-xs"
              onClick={() => setSelectedCategory(category)}
              size="sm"
              variant={selectedCategory === category ? "default" : "outline"}
            >
              {category}
            </Button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <span className="px-2 text-xs text-muted-foreground">{t("templates.modeLabel")}</span>
          {(["all", "markdown", "latex", "html", "json", "yaml"] as Array<TemplateMode | "all">).map((mode) => (
            <Button
              key={mode}
              className="h-7 text-xs"
              onClick={() => setSelectedMode(mode)}
              size="sm"
              variant={selectedMode === mode ? "default" : "outline"}
            >
              {mode === "all" ? t("templates.all") : MODE_LABELS[mode]}
            </Button>
          ))}
        </div>

        <ScrollArea className="h-[50vh]">
          <div className="grid grid-cols-1 gap-3 pr-3 sm:grid-cols-2">
            {filteredTemplates.length === 0 && (
              <div className="col-span-2 py-8 text-center text-sm text-muted-foreground">
                {t("templates.noResults")}
              </div>
            )}
            {filteredTemplates.map((template) => (
              <button
                key={template.id}
                className="group flex items-start gap-3 rounded-lg border border-border p-3 text-left transition-all hover:border-primary hover:bg-secondary/30"
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
