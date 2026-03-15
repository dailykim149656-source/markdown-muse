# 구현 기능 요약

날짜: 2026-03-11
상태: 현재 구현 기준 요약
범위: Markdown Muse에 이미 들어간 기능

## 목적

이 문서는 현재 저장소에 구현된 기능을 빠르게 훑어볼 수 있도록 표 중심으로 정리한 요약입니다.

## 현재 해석

현재 저장소 상태는 다음과 같이 보는 것이 맞습니다.

- 핵심 제품 범위 구현 완료
- review-first AI와 다문서 유지보수 흐름 구현 완료
- 랜딩 온보딩과 `/guide` 설명서 구현 완료
- 남은 일은 주로 QA, 성능 기준 고정, 선택적 확장

## 기능 매트릭스

| 기능 영역 | 상태 | 대표 화면 / 파일 | 비고 |
| --- | --- | --- | --- |
| 핵심 편집 | 구현됨 | `src/pages/Index.tsx`, `src/components/editor/MarkdownEditor.tsx`, `src/components/editor/LatexEditor.tsx`, `src/components/editor/HtmlEditor.tsx`, `src/components/editor/JsonYamlEditor.tsx` | 다중 문서 편집, 리치 텍스트 편집, 구조 편집, source/WYSIWYG 동기화 |
| 템플릿과 문서 생성 | 구현됨 | `src/components/editor/TemplateDialog.tsx` | locale-aware 템플릿, fallback 본문, 운영/엔지니어링/프로젝트 템플릿 |
| 자동 저장과 버전 기록 | 구현됨 | `src/hooks/useVersionHistory.ts`, `src/components/editor/VersionHistoryPanel.tsx` | snapshot preview, restore, patch/export 이후 스냅샷 기록 |
| 공유와 내보내기 | 구현됨 | `src/components/editor/ShareLinkDialog.tsx`, `src/hooks/useDocumentIO.ts` | share link, QR, clipboard export, print, file export |
| AI 작성/분석 | 구현됨 | `src/components/editor/AiAssistantDialog.tsx`, `src/components/editor/AiAssistantRuntime.tsx`, `src/hooks/useAiAssistant.ts` | 요약, 섹션 생성, 비교, 업데이트 제안, 절차 추출, TOC |
| Patch Review | 구현됨 | `src/components/editor/PatchReviewDialog.tsx`, `src/components/editor/PatchReviewPanel.tsx`, `src/hooks/usePatchReview.ts` | accept/reject/edit/apply, confidence 지표, provenance 지표, provenance-gap 필터 |
| Knowledge index와 검색 | 구현됨 | `src/hooks/useKnowledgeBase.ts`, `src/lib/knowledge/knowledgeIndex.ts`, `src/components/editor/KnowledgeSearchPanel.tsx` | local index, stale/fresh 상태, image retrieval, semantic rerank, strict keyword 모드 |
| Workspace Graph | 구현됨 | `src/pages/WorkspaceGraph.tsx`, `src/components/editor/GraphExplorerDialog.tsx`, `src/components/editor/WorkspaceGraphPanel.tsx` | graph route, 검색, 필터, issues-only, source-target chain, graph handoff |
| 진단 패널 | 구현됨 | `src/components/editor/DocumentImpactPanel.tsx`, `src/components/editor/DocumentHealthPanel.tsx`, `src/components/editor/ConsistencyIssuesPanel.tsx`, `src/components/editor/ChangeMonitoringPanel.tsx` | impact, health, consistency, change monitoring, 우선순위/사유/원인 설명 |
| Suggestion Queue | 구현됨 | `src/components/editor/SuggestionQueuePanel.tsx`, `src/pages/Index.tsx` | 다문서 queue, retry/rerun, dedupe, graph re-entry, patch review reopen |
| 모바일/반응형 | 구현됨 | `src/components/editor/EditorToolbar.tsx`, `src/components/editor/FileSidebar.tsx` | 모바일 툴바 overflow 처리, More 접근, 줄바꿈 대응, 모바일 sidebar 닫기 |
| 랜딩과 설명서 | 구현됨 | `src/pages/Landing.tsx`, `src/pages/Guide.tsx`, `src/content/guideContent.ts` | quick start, workflow 카드, 기능 안내, visual tour, 검색, FAQ, audience filter, 시나리오 |
| 검증 기준선 | 구현됨 | `src/test/guidePage.test.tsx`, `src/test/dialogSmoke.test.tsx`, `src/test/patchReviewMetrics.test.tsx`, `src/test/suggestionQueuePanel.test.tsx`, `src/test/i18nCoverage.test.ts` | 집중 회귀 테스트 존재, production build 통과 |

## 형식과 작업 흐름 지원

| 지원 항목 | 상태 | 비고 |
| --- | --- | --- |
| Markdown 리치 텍스트 편집 | 구현됨 | 기본 리치 텍스트 흐름 |
| LaTeX 리치 텍스트 편집 | 구현됨 | 리치 텍스트 기반 작업 가능 |
| HTML 리치 텍스트 편집 | 구현됨 | HTML 소스와 호환되는 편집 흐름 |
| JSON 편집 | 구현됨 | structured editing |
| YAML 편집 | 구현됨 | structured editing |
| Typst export | 구현됨 | export surface |
| AsciiDoc import/export | 구현됨 | import/export surface |
| RST import/export | 구현됨 | import/export surface |
| PDF 출력 | 구현됨 | export / print 흐름 |
| `.docsy` persistence | 구현됨 | richer editor state 보존 |

## review-first 보장

| 보장 항목 | 상태 | 비고 |
| --- | --- | --- |
| AI 결과 자동 적용 금지 | 유지됨 | Patch Review를 반드시 거침 |
| provenance 표시 | 구현됨 | Queue와 Patch Review에서 확인 가능 |
| confidence 표시 | 구현됨 | Queue와 Patch Review에서 확인 가능 |
| 다문서 제안의 문맥 유지 | 구현됨 | source/target, issue metadata, queue context 유지 |

## 후속 작업으로 보는 항목

아래는 핵심 기능 공백이라기보다 후속 강화 항목입니다.

| 후속 항목 | 현재 상태 | 왜 아직 중요함 |
| --- | --- | --- |
| benchmark 기반 성능 한계 문서화 | 부분 구현 | UI 가이드는 있지만, 수치화된 운영 한계는 아직 고정되지 않음 |
| heuristic beyond retrieval | 부분 구현 | semantic assist는 있지만 embedding/vector retrieval은 없음 |
| 실제 workspace 기준 최종 수동 QA | 대기 | 집중 회귀 테스트는 충분하지만, 최종 sign-off용 실사용 검증은 별도 필요 |
| 설명서 예시 / 상태별 스크린샷 확장 | 진행 중 | 설명서는 이미 있지만 더 실전적인 예시 추가 여지 있음 |

## 실무적 결론

Markdown Muse는 현재:

- 기능이 많은 release candidate
- review-first AI 문서 편집기
- 다문서 유지보수와 handoff 문서화가 필요한 제품

으로 보는 것이 가장 정확합니다.
