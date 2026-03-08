import { useState } from "react";
import {
  BookOpen,
  Bug,
  ClipboardList,
  FileCode,
  FileText,
  GraduationCap,
  LayoutTemplate,
  Newspaper,
  ScrollText,
  Wrench,
  Braces,
  Briefcase,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
const todayIso = new Date().toISOString().slice(0, 10);

const frontmatter = (title: string, docType: string) => [
  "---",
  `title: "${title}"`,
  "category: 사내 위키형 기술 문서",
  `docType: ${docType}`,
  "status: draft",
  `createdAt: ${todayIso}`,
  `lastReviewedAt: ${todayIso}`,
  "owner: ",
  "reviewer: ",
  "tags:",
  "  - wiki",
  `  - ${docType}`,
  "---",
  "",
].join("\n");

const ICON_MAP: Record<string, React.ReactNode> = {
  FileText: <FileText className="h-5 w-5" />,
  FileCode: <FileCode className="h-5 w-5" />,
  Braces: <Braces className="h-5 w-5" />,
  BookOpen: <BookOpen className="h-5 w-5" />,
  Briefcase: <Briefcase className="h-5 w-5" />,
  GraduationCap: <GraduationCap className="h-5 w-5" />,
  Newspaper: <Newspaper className="h-5 w-5" />,
  ScrollText: <ScrollText className="h-5 w-5" />,
  Bug: <Bug className="h-5 w-5" />,
  Wrench: <Wrench className="h-5 w-5" />,
  ClipboardList: <ClipboardList className="h-5 w-5" />,
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
    id: "wiki-sop",
    name: "사내 위키 SOP",
    description: "표준 운영 절차(SOP) 문서 템플릿",
    mode: "markdown",
    iconName: "ScrollText",
    category: "사내 위키",
    content: [
      ...frontmatter("사내 SOP 템플릿", "sop").split("\n"),
      "# SOP (표준 운영 절차)",
      "",
      "## 1. 문서 정보",
      "- 문서명:",
      "- 문서 번호:",
      "- 최종 버전: v1.0",
      `- 작성일: ${today}`,
      "- 작성자:",
      "- 검토자:",
      "",
      "## 2. 목적",
      "- 이 SOP의 목적을 한 줄로 정리한다.",
      "",
      "## 3. 적용 범위",
      "- 적용 대상 시스템/팀:",
      "- 적용 버전/환경:",
      "",
      "## 4. 선행 조건",
      "- 권한:",
      "- 사전 점검 항목:",
      "",
      "## 5. 절차",
      "### 5.1 사전 준비",
      "- [ ] 실행 전 점검",
      "- [ ] 관련 권한 확인",
      "",
      "### 5.2 실행",
      "1. ",
      "2. ",
      "3. ",
      "",
      "### 5.3 완료 확인",
      "- [ ] 산출물 저장",
      "- [ ] 승인 등록",
      "",
      "## 6. 확인 항목",
      "- [ ] 목표 상태 달성",
      "- [ ] 장애 로그 없음",
      "- [ ] 변경 이력 기록",
      "",
      "## 7. 예외 및 이슈",
      "-",
      "",
      "## 8. 변경 이력",
      "| 날짜 | 버전 | 변경자 | 내용 |",
      "| --- | --- | --- | --- |",
      `| ${today} | v1.0 |  | 최초 작성 |`,
      "",
    ].join("\n"),
  },
  {
    id: "wiki-operations",
    name: "운영 매뉴얼",
    description: "운영/점검/알림 대응 체크리스트 템플릿",
    mode: "markdown",
    iconName: "Wrench",
    category: "사내 위키",
    content: [
      ...frontmatter("운영 매뉴얼", "operations-manual").split("\n"),
      "# 운영 매뉴얼",
      "",
      "## 1. 시스템 개요",
      "- 시스템명: ",
      "- 목적:",
      "- 운영 파트:",
      "",
      "## 2. 운영 시간 및 책임",
      "| 항목 | 내용 |",
      "| --- | --- |",
      "| 운영 시간 | 24x7/주간 등 |",
      "| 1차 책임자 |  |",
      "| 2차 책임자 |  |",
      "| 전달 채널 |  |",
      "",
      "## 3. 정기 점검",
      "### 일일",
      "- [ ] 헬스체크",
      "- [ ] CPU/메모리 임계치 확인",
      "- [ ] 에러 로그 추이 확인",
      "### 주간",
      "- [ ] 백업 성공 여부 확인",
      "- [ ] 취약점 스캔 결과 확인",
      "- [ ] 라이선스/시크릿 만료 점검",
      "",
      "## 4. 장애 대응",
      "- 초기 대응 시간:",
      "- 에스컬레이션 룰:",
      "- 복구 종료 조건:",
      "",
      "## 5. 운영 기록",
      "- 운영 일지 링크:",
      "- 점검 리포트 링크:",
      "- 변경 승인 링크:",
      "",
    ].join("\n"),
  },
  {
    id: "wiki-equipment",
    name: "실험/장비 문서",
    description: "장비 운영·실험 재현성 확보용 템플릿",
    mode: "markdown",
    iconName: "BookOpen",
    category: "사내 위키",
    content: [
      ...frontmatter("실험/장비 문서", "experiment-equipment").split("\n"),
      "# 실험/장비 문서",
      "",
      "## 1. 문서 정보",
      `- 작성일: ${today}`,
      "- 장비명/ID:",
      "- 위치:",
      "- 담당자:",
      "",
      "## 2. 자산 정보",
      "| 항목 | 값 |",
      "| --- | --- |",
      "| 모델 |  |",
      "| 제조사 |  |",
      "| 관리 책임자 |  |",
      "| 점검 주기 |  |",
      "",
      "## 3. 실험/운영 절차",
      "1. 사전 점검",
      "2. 설정 적용",
      "3. 실험/작업 실행",
      "4. 결과 수집",
      "5. 종료 정리",
      "",
      "## 4. 파라미터",
      "- 기본 파라미터:",
      "- 실험 조건:",
      "- 환경 변수:",
      "",
      "## 5. 안전 및 주의사항",
      "-",
      "",
      "## 6. 결과 기록",
      "- 결과 저장 위치:",
      "- 샘플 로그:",
      "",
    ].join("\n"),
  },
  {
    id: "wiki-troubleshooting",
    name: "트러블슈팅 가이드",
    description: "증상-원인-조치 방식으로 정리한 대응 템플릿",
    mode: "markdown",
    iconName: "Bug",
    category: "사내 위키",
    content: [
      ...frontmatter("트러블슈팅 가이드", "troubleshooting-guide").split("\n"),
      "# 트러블슈팅 가이드",
      "",
      "## 1. 증상 수집",
      "- 증상:",
      "- 발생 시간:",
      "- 영향 범위:",
      "- 재현 여부:",
      "",
      "## 2. 원인 분석",
      "| 증상 | 의심 원인 | 확인 방법 | 결과 |",
      "| --- | --- | --- | --- |",
      "| | | | |",
      "",
      "## 3. 조치",
      "### 3.1 즉시 조치",
      "- [ ] 임시 우회 조치",
      "- [ ] 서비스 영향 최소화",
      "",
      "### 3.2 원인 제거",
      "- ",
      "",
      "### 3.3 영구 대책",
      "- ",
      "",
      "## 4. 복구 확인",
      "- [ ] 지표 회복",
      "- [ ] 재발 여부 모니터링",
      "- [ ] 사용자 안내 완료",
      "",
      "## 5. 재발 방지",
      "- 변경 항목:",
      "- 다음 점검일:",
      "",
    ].join("\n"),
  },
  {
    id: "wiki-handover",
    name: "기술 인수인계 문서",
    description: "온보딩·인수인계용 표준 템플릿",
    mode: "markdown",
    iconName: "ClipboardList",
    category: "사내 위키",
    content: [
      ...frontmatter("기술 인수인계 문서", "handover").split("\n"),
      "# 기술 인수인계 문서",
      "",
      "## 1. 개요",
      "- 인수 대상:",
      "- 인수일:",
      "- 인계자:",
      "- 인수자:",
      "",
      "## 2. 시스템 아키텍처 요약",
      "- 핵심 컴포넌트:",
      "- 의존성/연동:",
      "- 배포 방식:",
      "",
      "## 3. 운영/운영 이력",
      "- 현재 버전:",
      "- 최근 배포 일자:",
      "- 주요 이슈 현황:",
      "",
      "## 4. 인수인계 체크리스트",
      "- [ ] 핵심 기능 데모",
      "- [ ] 장애 대응 시나리오 리뷰",
      "- [ ] 권한/접근 관리 점검",
      "- [ ] 문서 링크 갱신",
      "",
      "## 5. 미해결 항목",
      "-",
      "",
      "## 6. 후속 액션",
      "-",
      "",
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
const MODES: Array<TemplateMode | "all"> = ["all", "markdown", "latex", "html", "json", "yaml"];
const MODE_LABELS: Record<TemplateMode | "all", string> = {
  all: "전체",
  markdown: "Markdown",
  latex: "LaTeX",
  html: "HTML",
  json: "JSON",
  yaml: "YAML",
};

interface TemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (template: DocumentTemplate) => void;
}

const TemplateDialog = ({ open, onOpenChange, onSelect }: TemplateDialogProps) => {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedMode, setSelectedMode] = useState<TemplateMode | "all">("all");
  const [searchKeyword, setSearchKeyword] = useState("");

  const normalizedKeyword = searchKeyword.trim().toLowerCase();
  const filtered = TEMPLATES.filter(template => {
    const matchCategory = selectedCategory === null || template.category === selectedCategory;
    const matchMode = selectedMode === "all" || template.mode === selectedMode;
    const matchKeyword = !normalizedKeyword
      || template.name.toLowerCase().includes(normalizedKeyword)
      || template.description.toLowerCase().includes(normalizedKeyword)
      || template.category.toLowerCase().includes(normalizedKeyword);

    return matchCategory && matchMode && matchKeyword;
  });

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
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            onClick={() => {
              setSelectedCategory(null);
              setSelectedMode("all");
              setSearchKeyword("");
            }}
          >
            필터 초기화
          </Button>
          <div className="w-64">
            <Input
              value={searchKeyword}
              onChange={(event) => setSearchKeyword(event.target.value)}
              placeholder="템플릿 이름/설명/카테고리 검색"
            />
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs text-muted-foreground px-2">카테고리</span>
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

        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs text-muted-foreground px-2">모드</span>
          {MODES.map(mode => (
            <Button
              key={mode}
              variant={selectedMode === mode ? "default" : "outline"}
              size="sm"
              className="h-7 text-xs"
              onClick={() => setSelectedMode(mode)}
            >
              {MODE_LABELS[mode]}
            </Button>
          ))}
        </div>

        <ScrollArea className="h-[50vh]">
          <div className="grid grid-cols-2 gap-3 pr-3">
            {filtered.length === 0 && (
              <div className="col-span-2 py-8 text-center text-sm text-muted-foreground">
                검색 조건에 맞는 템플릿이 없습니다.
              </div>
            )}
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
