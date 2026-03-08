import { useState } from "react";
import { FileText, FileCode, Braces, BookOpen, Briefcase, GraduationCap, Newspaper, ScrollText, LayoutTemplate } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export type TemplateMode = "markdown" | "latex" | "html" | "json" | "yaml";

export interface DocumentTemplate {
  id: string;
  name: string;
  description: string;
  mode: TemplateMode;
  iconName: string;
  category: string;
  content: string;
}

const today = new Date().toLocaleDateString("ko-KR");

const ICON_MAP: Record<string, React.ReactNode> = {
  FileText: <FileText className="h-5 w-5" />,
  FileCode: <FileCode className="h-5 w-5" />,
  Braces: <Braces className="h-5 w-5" />,
  BookOpen: <BookOpen className="h-5 w-5" />,
  Briefcase: <Briefcase className="h-5 w-5" />,
  GraduationCap: <GraduationCap className="h-5 w-5" />,
  Newspaper: <Newspaper className="h-5 w-5" />,
  ScrollText: <ScrollText className="h-5 w-5" />,
};

const TEMPLATES: DocumentTemplate[] = [
  {
    id: "md-blank",
    name: "빈 문서",
    description: "빈 마크다운 문서",
    mode: "markdown",
    iconName: "FileText",
    category: "기본",
    content: "",
  },
  {
    id: "md-report",
    name: "보고서",
    description: "제목, 목차, 섹션이 포함된 비즈니스 보고서",
    mode: "markdown",
    iconName: "Briefcase",
    category: "비즈니스",
    content: [
      "# 보고서 제목",
      "",
      "## 개요",
      "",
      "본 보고서는 ...에 대한 분석 결과를 정리한 문서입니다.",
      "",
      "## 배경",
      "",
      "프로젝트의 배경과 목적을 설명합니다.",
      "",
      "## 분석 내용",
      "",
      "### 현황 분석",
      "",
      "현재 상황에 대한 분석 내용을 작성합니다.",
      "",
      "### 문제점",
      "",
      "1. 첫 번째 문제점",
      "2. 두 번째 문제점",
      "3. 세 번째 문제점",
      "",
      "## 결론 및 제언",
      "",
      "분석 결과를 바탕으로 한 결론과 향후 제언을 작성합니다.",
      "",
      "---",
      "",
      "*작성일: " + today + "*",
    ].join("\n"),
  },
  {
    id: "md-meeting",
    name: "회의록",
    description: "참석자, 안건, 결정사항이 포함된 회의록",
    mode: "markdown",
    iconName: "ScrollText",
    category: "비즈니스",
    content: [
      "# 회의록",
      "",
      "**일시**: " + today,
      "**장소**: ",
      "**참석자**: ",
      "",
      "---",
      "",
      "## 안건",
      "",
      "1. ",
      "2. ",
      "3. ",
      "",
      "## 논의 내용",
      "",
      "### 안건 1",
      "",
      "- ",
      "",
      "### 안건 2",
      "",
      "- ",
      "",
      "## 결정 사항",
      "",
      "- [ ] ",
      "- [ ] ",
      "",
      "## 다음 회의",
      "",
      "**일시**: ",
      "**안건**: ",
    ].join("\n"),
  },
  {
    id: "md-blog",
    name: "블로그 포스트",
    description: "소개, 본문, 결론 구조의 블로그 글",
    mode: "markdown",
    iconName: "Newspaper",
    category: "콘텐츠",
    content: [
      "# 블로그 포스트 제목",
      "",
      "> 한 줄 요약 또는 인용구",
      "",
      "## 들어가며",
      "",
      "독자의 관심을 끌 수 있는 도입부를 작성합니다.",
      "",
      "## 본문",
      "",
      "### 핵심 포인트 1",
      "",
      "내용을 작성합니다.",
      "",
      "### 핵심 포인트 2",
      "",
      "내용을 작성합니다.",
      "",
      "## 마치며",
      "",
      "글의 핵심 내용을 요약합니다.",
      "",
      "---",
      "",
      "*태그: #주제1 #주제2 #주제3*",
    ].join("\n"),
  },
  {
    id: "tex-blank",
    name: "빈 LaTeX",
    description: "기본 LaTeX 문서",
    mode: "latex",
    iconName: "FileCode",
    category: "기본",
    content: "",
  },
  {
    id: "tex-paper",
    name: "학술 논문",
    description: "초록, 서론, 본론, 결론 구조의 학술 논문",
    mode: "latex",
    iconName: "GraduationCap",
    category: "학술",
    content: [
      "\\documentclass[12pt]{article}",
      "\\usepackage[utf8]{inputenc}",
      "\\usepackage{amsmath}",
      "\\usepackage{amssymb}",
      "\\usepackage{graphicx}",
      "\\usepackage[hidelinks]{hyperref}",
      "\\usepackage{geometry}",
      "\\geometry{a4paper, margin=2.5cm}",
      "",
      "\\title{논문 제목}",
      "\\author{저자명\\\\소속 기관}",
      "\\date{\\today}",
      "",
      "\\begin{document}",
      "",
      "\\maketitle",
      "",
      "\\begin{abstract}",
      "본 논문에서는 ...에 대해 연구하였다.",
      "\\end{abstract}",
      "",
      "\\section{서론}",
      "연구의 배경과 목적을 설명한다.",
      "",
      "\\section{관련 연구}",
      "기존 연구들을 검토한다.",
      "",
      "\\section{연구 방법}",
      "\\subsection{실험 설계}",
      "실험 설계 및 데이터 수집 방법을 설명한다.",
      "",
      "\\section{결과}",
      "실험 결과를 제시한다.",
      "",
      "\\section{논의}",
      "결과의 의미를 해석한다.",
      "",
      "\\section{결론}",
      "연구의 주요 발견을 요약한다.",
      "",
      "\\begin{thebibliography}{9}",
      "\\bibitem{ref1} 저자, ``제목,'' 학회지, 2024.",
      "\\end{thebibliography}",
      "",
      "\\end{document}",
    ].join("\n"),
  },
  {
    id: "tex-resume",
    name: "이력서 / CV",
    description: "경력, 학력, 기술이 포함된 이력서",
    mode: "latex",
    iconName: "BookOpen",
    category: "개인",
    content: [
      "\\documentclass[11pt]{article}",
      "\\usepackage[utf8]{inputenc}",
      "\\usepackage{geometry}",
      "\\usepackage{enumitem}",
      "\\usepackage[hidelinks]{hyperref}",
      "\\geometry{a4paper, margin=2cm}",
      "\\pagestyle{empty}",
      "",
      "\\begin{document}",
      "",
      "\\begin{center}",
      "{\\Huge\\bfseries 홍길동}\\\\[0.3em]",
      "{\\large 소프트웨어 엔지니어}\\\\[0.5em]",
      "hong@email.com \\quad | \\quad 010-1234-5678",
      "\\end{center}",
      "",
      "\\vspace{1em}",
      "\\noindent{\\Large\\bfseries 경력}\\\\\\rule{\\textwidth}{0.4pt}",
      "",
      "\\noindent\\textbf{시니어 개발자} \\hfill 2022 -- 현재\\\\",
      "ABC 테크 주식회사",
      "\\begin{itemize}[leftmargin=1.5em, topsep=0pt]",
      "  \\item 주요 서비스 백엔드 아키텍처 설계",
      "  \\item 팀 리드 (5명 관리)",
      "\\end{itemize}",
      "",
      "\\vspace{0.5em}",
      "\\noindent{\\Large\\bfseries 학력}\\\\\\rule{\\textwidth}{0.4pt}",
      "",
      "\\noindent\\textbf{컴퓨터공학 학사} \\hfill 2016 -- 2020\\\\",
      "서울대학교",
      "",
      "\\vspace{0.5em}",
      "\\noindent{\\Large\\bfseries 기술}\\\\\\rule{\\textwidth}{0.4pt}",
      "",
      "\\noindent\\textbf{프로그래밍}: Python, TypeScript, Go\\\\",
      "\\textbf{프레임워크}: React, Node.js, Django\\\\",
      "\\textbf{도구}: Docker, Kubernetes, AWS",
      "",
      "\\end{document}",
    ].join("\n"),
  },
  {
    id: "json-config",
    name: "설정 파일",
    description: "앱 설정을 위한 JSON 구조",
    mode: "json",
    iconName: "Braces",
    category: "개발",
    content: JSON.stringify({
      app: { name: "My App", version: "1.0.0", debug: false },
      server: { host: "localhost", port: 3000 },
      database: { host: "localhost", port: 5432, name: "mydb" },
      logging: { level: "info", file: "app.log" },
    }, null, 2),
  },
  {
    id: "json-package",
    name: "package.json",
    description: "Node.js 패키지 설정",
    mode: "json",
    iconName: "Braces",
    category: "개발",
    content: JSON.stringify({
      name: "my-project",
      version: "1.0.0",
      description: "",
      main: "index.js",
      scripts: { start: "node index.js", dev: "nodemon index.js", test: "jest", build: "tsc" },
      dependencies: {},
      devDependencies: {},
    }, null, 2),
  },
];

const CATEGORIES: string[] = Array.from(new Set(TEMPLATES.map(t => t.category)));

interface TemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (template: DocumentTemplate) => void;
}

const TemplateDialog = ({ open, onOpenChange, onSelect }: TemplateDialogProps) => {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const filtered = selectedCategory
    ? TEMPLATES.filter(t => t.category === selectedCategory)
    : TEMPLATES;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LayoutTemplate className="h-5 w-5" />
            문서 템플릿 선택
          </DialogTitle>
        </DialogHeader>

        <div className="flex items-center gap-1.5 flex-wrap">
          <Button
            variant={selectedCategory === null ? "default" : "outline"}
            size="sm"
            className="h-7 text-xs"
            onClick={() => setSelectedCategory(null)}
          >
            전체
          </Button>
          {CATEGORIES.map(cat => (
            <Button
              key={cat}
              variant={selectedCategory === cat ? "default" : "outline"}
              size="sm"
              className="h-7 text-xs"
              onClick={() => setSelectedCategory(cat)}
            >
              {cat}
            </Button>
          ))}
        </div>

        <ScrollArea className="h-[50vh]">
          <div className="grid grid-cols-2 gap-3 pr-3">
            {filtered.map(template => (
              <button
                key={template.id}
                className="flex items-start gap-3 p-3 rounded-lg border border-border hover:border-primary hover:bg-secondary/30 transition-all text-left group"
                onClick={() => {
                  onSelect(template);
                  onOpenChange(false);
                }}
              >
                <div className="shrink-0 h-10 w-10 rounded-md bg-secondary/50 flex items-center justify-center text-muted-foreground group-hover:text-primary transition-colors">
                  {ICON_MAP[template.iconName] || <FileText className="h-5 w-5" />}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium truncate">{template.name}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground shrink-0">
                      {template.mode.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{template.description}</p>
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
export { TEMPLATES };
