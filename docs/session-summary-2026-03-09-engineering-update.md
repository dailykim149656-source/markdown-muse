# 2026-03-09 Engineering Session Summary

## 목적

이 문서는 2026-03-09 세션에서 `markdown-muse` 저장소에 대해 진행한 분석, 설계, 구현, 검증 작업을 한 번에 정리한 기록이다.
기존 `docs` 폴더에 같은 날짜의 문서가 이미 있으므로, 이 문서는 그 후속 작업까지 포함한 최신 요약본으로 본다.

## 이번 세션의 핵심 결과

- 편집기 아키텍처를 `문서 상태`, `UI 상태`, `변환`, `입출력` 단위로 분리했다.
- HTML DOM 직접 조회에 의존하던 preview/export/print 흐름을 editor state 기반으로 줄였다.
- `Document AST`, patch schema, patch apply/validate/review 흐름을 실제 코드로 추가했다.
- AI 워크플로를 patch review 중심 구조에 맞춰 붙였고, Gemini 서버 프록시까지 연결했다.
- 앱 전반에 `ko/en` UI i18n을 도입했고, 툴바까지 포함해 한국어 깨짐과 번역 구조를 정리했다.
- 모바일 툴바 사용성을 위해 삽입 도구를 `More` 드로어로 분리했다.

## 1. 분석 및 문서화

### 1.1 저장소 구조와 데이터 흐름 분석

초기에 다음 내용을 중심으로 구조를 분석했다.

- 페이지/컴포넌트/변환 유틸 분리 상태
- `Index.tsx` 집중 구조
- 에디터 로컬 상태와 부모 문서 상태의 관계
- preview/export/print가 어떤 경로로 최신 내용을 읽는지
- DOM 조작 기반 find/replace의 위험 지점

이 분석을 바탕으로 이후 리팩터링 우선순위를 정했다.

### 1.2 README 정리

`README.md`를 실제 프로젝트 기준으로 다시 정리했다.

- 프로젝트 개요
- 기능 목록
- 디렉터리 구조
- 데이터 흐름
- 실행 방법
- Gemini 설정

### 1.3 PRD 기반 실행 문서 작성

`PRD` 폴더 내부 문서를 읽고, 다음 문서를 작성했다.

- `PRD/docsy_execution_plan_v0.1.md`
- `PRD/docsy_issue_backlog_v0.1.md`
- `PRD/docsy_document_ast_design_spec_v0.1.md`

핵심 판단은 다음과 같았다.

- AI 기능보다 먼저 `Document AST`와 `patch system`을 도입해야 한다.
- 제품 차별점은 “AI가 제안한 변경을 reviewable patch로 적용하는 구조”에 있다.
- 따라서 `AST -> patch -> ingestion -> retrieval -> AI` 순서가 맞다.

## 2. 상태와 화면 구조 리팩터링

### 2.1 문서 상태/화면 상태 분리

다음 훅을 분리했다.

- `src/hooks/useDocumentManager.ts`
- `src/hooks/useEditorUiState.ts`

이로 인해 `src/pages/Index.tsx`의 역할을 줄이고 문서 CRUD, autosave, 활성 문서 선택, UI 토글을 분리했다.

### 2.2 변환/입출력 훅 분리

추가로 다음 훅을 만들거나 정리했다.

- `src/hooks/useFormatConversion.ts`
- `src/hooks/useDocumentIO.ts`

여기서 맡는 책임은 다음과 같다.

- 모드 변환
- preview/export용 renderable content 계산
- 파일 열기/저장
- print/PDF 처리

### 2.3 레이아웃 컴포넌트 분리

`src/components/editor/EditorWorkspace.tsx`를 추가해 `Index`의 조립 책임을 일부 이동했다.

## 3. editor state 일관성 개선

### 3.1 live HTML 상태 도입

이전 구조는 export/preview/print 시점에 DOM을 다시 읽는 구간이 많았다.
이를 줄이기 위해 다음 에디터들이 부모에 현재 HTML을 올리도록 바꿨다.

- `src/components/editor/MarkdownEditor.tsx`
- `src/components/editor/HtmlEditor.tsx`
- `src/components/editor/LatexEditor.tsx`

### 3.2 Find/Replace 안전화

기존에는 DOM text node를 직접 조작하는 방식이 섞여 있었다.
이를 다음 방향으로 바꿨다.

- TipTap editor state 기반 탐색/치환
- highlight extension 기반 현재 매치/전체 매치 표시
- JSON/YAML의 경우 plain-text adapter 기반 검색/치환

관련 구현:

- `src/components/editor/FindReplaceBar.tsx`
- `src/components/editor/extensions/FindReplaceHighlight.ts`
- `src/components/editor/StructuredDataHighlightEditor.tsx`
- `src/components/editor/utils/structuredDataHighlight.ts`

## 4. JSON/YAML 편집 경험 개선

다음 작업을 진행했다.

- source panel을 하이라이트 가능한 구조화 데이터 에디터로 교체
- JSON/YAML 토크나이저 정교화
- plain-text 검색/치환 연동
- 전체 검색어 하이라이트 지원

관련 파일:

- `src/components/editor/JsonYamlEditor.tsx`
- `src/components/editor/StructuredDataHighlightEditor.tsx`
- `src/components/editor/utils/structuredDataHighlight.ts`
- `src/test/structuredDataHighlight.test.ts`

## 5. AST 및 lossless 문서 모델 기반 작업

### 5.1 공용 타입 정리

다음 타입 파일을 추가했다.

- `src/types/document.ts`
- `src/types/documentAst.ts`

여기서 다음을 정의했다.

- `DocumentData`
- `EditorMode`
- rich text AST
- structured data AST
- patch target / patch operation 타입

### 5.2 Docsy 파일 형식

세션 중 `.docsy` 형식을 도입해 lossless 저장 경로를 보강했다.
이 형식은 일반 export 포맷과 별개로 앱 내부 상태를 보존하기 위한 용도다.

관련 구현:

- `src/lib/docsy/`
- `src/test/docsyFileFormat.test.ts`
- `src/test/docsyRichTextRoundtrip.test.ts`

### 5.3 AST 기반 렌더링/내보내기 경로

다음 기반 코드를 추가했다.

- AST -> HTML
- AST -> LaTeX
- renderable HTML / LaTeX helper

관련 구현:

- `src/lib/ast/renderAstToHtml.ts`
- `src/lib/ast/renderAstToLatex.ts`
- `src/lib/ast/getRenderableHtml.ts`
- `src/lib/ast/getRenderableLatex.ts`

preview/export 경로도 점진적으로 AST 기반 renderer를 우선 사용하도록 연결했다.

### 5.4 stable node identity

문서 블록 단위 식별을 위해 stable `nodeId` 흐름을 추가했다.

- `src/components/editor/extensions/NodeIdExtension.ts`
- `src/lib/ast/tiptapAst.ts`
- `src/test/nodeIdExtension.test.ts`

이 작업은 이후 patch target 안정성과 diff 계산 정확도에 직접 연결된다.

## 6. patch system 및 review workflow

### 6.1 patch 타입/검증/적용

다음 기반 기능을 구현했다.

- patch set 구조 판별
- AST validator
- AST patch apply 엔진
- apply 후 경고/실패 반환

관련 구현:

- `src/lib/patches/isDocumentPatchSet.ts`
- `src/lib/ast/validateDocumentAst.ts`
- `src/lib/ast/applyDocumentPatch.ts`

### 6.2 review UI

패치 검토 UI를 추가했다.

- `src/components/editor/PatchReviewDialog.tsx`
- `src/components/editor/PatchReviewPanel.tsx`
- `src/hooks/usePatchReview.ts`

사용자는 patch set JSON을 불러온 뒤 각 patch를 accept/reject/edit 할 수 있고,
accept된 patch만 현재 rich-text 문서에 적용할 수 있다.

## 7. ingestion / retrieval / AI 기반 기능

### 7.1 ingestion / retrieval 기반

다음 기초 레이어를 추가했다.

- 문서 ingestion contract
- section parsing / metadata extraction normalization
- keyword retrieval
- semantic chunk schema
- vector store skeleton

관련 구현:

- `src/lib/ingestion/`
- `src/lib/retrieval/`

### 7.2 AI 워크플로

다음 기능을 코드 레벨로 추가했다.

- 문서 비교
- section generation
- document update suggestion
- procedure extraction

관련 구현:

- `src/lib/ai/compareDocuments.ts`
- `src/lib/ai/sectionGeneration.ts`
- `src/lib/ai/suggestDocumentUpdates.ts`
- `src/lib/ai/procedureExtraction.ts`

핵심 원칙은 “AI 결과를 바로 문서에 쓰지 않고 reviewable patch로 만든다”는 점이다.

### 7.3 Gemini 서버 프록시

Gemini API 사용을 고려해 다음을 추가했다.

- `server/aiServer.ts`
- `server/geminiClient.ts`
- `src/hooks/useAiAssistant.ts`
- `src/components/editor/AiAssistantDialog.tsx`
- `.env.example`
- `tsconfig.server.json`

요약과 section generation은 서버 프록시를 통해 Gemini를 호출하고,
비교는 deterministic patch 경로를 유지하도록 설계했다.

## 8. i18n 및 한글 UI 품질 개선

### 8.1 i18n 레이어 도입

다음 구조를 추가했다.

- `src/i18n/core.ts`
- `src/i18n/I18nProvider.tsx`
- `src/i18n/useI18n.ts`
- `src/i18n/messages/ko.ts`
- `src/i18n/messages/en.ts`

지원 범위는 `ko/en` UI 언어 전환이며, 선택한 언어는 localStorage에 저장된다.

### 8.2 한글 깨짐 복구

상단 헤더와 여러 다이얼로그에서 손상된 문자열을 복구했다.
특히 다음 영역을 정리했다.

- `EditorHeader`
- `ExportPreviewPanel`
- `FindReplaceBar`
- `AiAssistantDialog`
- `PatchReviewDialog`
- `PatchReviewPanel`

### 8.3 폰트 스택 및 툴바 i18n 마감

추가로 다음 작업을 했다.

- 기본 한글 폰트 스택 정리
- `fonts.ts` 라벨 정리
- 툴바 전체 i18n 적용
- 모바일 툴바 `More` 드로어 추가

관련 구현:

- `src/components/editor/EditorToolbar.tsx`
- `src/components/editor/AdvancedColorPicker.tsx`
- `src/components/editor/fonts.ts`

## 9. 검증 결과

세션 중 반복적으로 다음 검증을 수행했다.

- `npx tsc --noEmit`
- `npm run test`
- `npm run build`
- 변경 파일 대상 `eslint`
- `git diff --check`

최종 기준 결과:

- 타입체크 통과
- 테스트 통과: `33 files`, `230 tests`
- 프로덕션 빌드 통과
- `git diff --check` 통과

현재 남아 있는 비차단 이슈:

- 전체 번들 크기 경고
- 기존 코드베이스 전역 lint debt
- 일부 오래된 `docs`/문서 파일의 콘솔 표시 인코딩 이슈

## 10. 현재 코드베이스 상태 평가

현재 저장소는 초기 단순 편집기 수준을 넘어 다음 단계까지 올라와 있다.

- 멀티포맷 문서 편집기
- lossless 저장을 위한 app-specific model
- AST 기반 렌더링 기반
- patch review 기반 변경 적용 흐름
- AI assistant + Gemini 연결 준비
- `ko/en` UI 전환 지원

즉, PRD에서 정의한 “AI-assisted technical document editor”의 기반 레이어는 상당 부분 갖춰졌고,
이후 초점은 기능 추가보다 품질 고도화와 배포 준비에 맞는 상태다.

## 11. 다음 권장 작업

우선순위는 다음 순서가 적절하다.

1. 대형 번들 분할
2. patch diff UI 가독성 개선
3. ingestion / retrieval 고도화
4. Gemini 결과의 source attribution 강화
5. `.docsy` 중심 저장/복원 UX 명확화
6. 남은 전역 lint debt 정리

## 참고

이번 세션에서 특히 많이 다룬 핵심 경로는 다음과 같다.

- `src/pages/Index.tsx`
- `src/components/editor/EditorWorkspace.tsx`
- `src/components/editor/EditorToolbar.tsx`
- `src/hooks/useDocumentManager.ts`
- `src/hooks/useFormatConversion.ts`
- `src/hooks/useDocumentIO.ts`
- `src/lib/ast/`
- `src/lib/ai/`
- `src/lib/patches/`
- `server/`
