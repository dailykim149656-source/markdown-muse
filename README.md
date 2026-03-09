# Markdown Muse

`Markdown Muse`는 멀티포맷 기술 문서 편집기입니다. `Markdown`, `LaTeX`, `HTML`, `JSON`, `YAML`을 편집하고, 앱 전용 `.docsy` 포맷으로 손실을 줄인 저장/복원을 지원합니다.

현재 코드베이스의 성격은 단순 에디터보다 `AI-assisted technical document editor`에 가깝습니다. 핵심 축은 다음 네 가지입니다.

- 멀티포맷 편집과 변환
- `.docsy` 기반 loss-minimizing 저장
- `Document AST`와 patch review 기반 변경 적용
- Gemini 프록시를 통한 AI 보조 기능

![Markdown Muse preview](src/assets/editor-preview.png)

## 핵심 기능

- 다중 문서 탭과 사이드바 기반 문서 관리
- `Markdown`, `LaTeX`, `HTML`, `JSON`, `YAML` 편집
- Rich text 편집과 source 편집 병행
- autosave 및 세션 복원
- `Docsy (.docsy)` 저장/불러오기
- `Document AST` 기반 렌더링 및 패치 적용
- reviewable patch 기반 문서 비교/섹션 생성
- `Typst`, `AsciiDoc`, `reStructuredText`, `HTML`, `PDF` 내보내기
- `Mermaid`, 수식, 각주, 목차, admonition, cross reference 지원
- `ko/en` UI i18n

## 기술 스택

- `React 18`
- `TypeScript`
- `Vite`
- `Tailwind CSS`
- `shadcn/ui`
- `TipTap`
- `Vitest`
- `@google/genai`

## 디렉터리 구조

```text
.
├─ docs/                      # 세션 요약 및 작업 기록
├─ PRD/                       # 제품/설계 문서
├─ public/
├─ server/                    # Gemini 프록시 서버
├─ src/
│  ├─ assets/
│  ├─ components/
│  │  ├─ editor/              # 에디터 UI, 툴바, 다이얼로그, 확장
│  │  │  ├─ extensions/
│  │  │  └─ utils/
│  │  └─ ui/                  # shadcn/ui 기반 공용 UI
│  ├─ hooks/                  # 문서 상태, UI 상태, 입출력, AI orchestration
│  ├─ i18n/                   # ko/en 번역과 provider
│  ├─ lib/
│  │  ├─ ai/                  # 비교, 요약, 섹션 생성, 절차 추출
│  │  ├─ ast/                 # AST 변환, 검증, 렌더링, patch apply
│  │  ├─ docsy/               # .docsy 파일 포맷
│  │  ├─ ingestion/           # 문서 ingestion 계약/정규화
│  │  ├─ patches/             # patch set 검토 로직
│  │  └─ retrieval/           # keyword retrieval, semantic chunk, vector store
│  ├─ pages/
│  ├─ test/
│  └─ types/
├─ .env.example
├─ package.json
└─ README.md
```

## 아키텍처 개요

### 1. 편집기 레이어

- `src/components/editor`
- 포맷별 에디터, 툴바, 파일 사이드바, export preview, patch review, AI dialog가 이 레이어에 모여 있습니다.
- TipTap 확장도 이 레이어 아래 `extensions/`에서 관리합니다.

### 2. 상태와 입출력 레이어

- `src/hooks/useDocumentManager.ts`
- `src/hooks/useEditorUiState.ts`
- `src/hooks/useFormatConversion.ts`
- `src/hooks/useDocumentIO.ts`
- `src/hooks/useAiAssistant.ts`
- `src/hooks/usePatchReview.ts`

문서 상태, UI 상태, 포맷 변환, 파일 저장/불러오기, AI 요청, patch review 흐름을 분리한 구조입니다.

### 3. 문서 모델 레이어

- `src/lib/ast/`
- `src/lib/docsy/`
- `src/types/document.ts`
- `src/types/documentAst.ts`
- `src/types/documentPatch.ts`

핵심 개념은 `plain text만 저장하지 않는다`는 점입니다. 앱은 필요에 따라 source text 외에도 TipTap JSON, AST, source snapshot을 함께 다룹니다.

### 4. AI 및 retrieval 레이어

- `src/lib/ai/`
- `src/lib/ingestion/`
- `src/lib/retrieval/`
- `server/`

Gemini는 브라우저에서 직접 호출하지 않고 Node 프록시를 통해 호출합니다. 생성 결과는 바로 문서에 삽입하지 않고 patch review 흐름으로 연결됩니다.

## 저장과 포맷 전략

### 편집/가져오기 포맷

- `.md`
- `.tex`
- `.html`, `.htm`
- `.json`
- `.yaml`, `.yml`
- `.adoc`, `.asciidoc`
- `.rst`
- `.docsy`

### 내보내기 포맷

- Markdown
- LaTeX
- HTML
- JSON
- YAML
- Typst
- AsciiDoc
- reStructuredText
- PDF(브라우저 인쇄 기반)

### `.docsy` 포맷

`.docsy`는 앱 전용 저장 포맷입니다. 최근 세션에서 추가된 핵심 기능이며, 다음 데이터를 함께 보존하는 방향으로 설계되어 있습니다.

- richer document metadata
- TipTap JSON
- AST
- mode별 source snapshot
- autosave 복원에 필요한 canonical state

즉 `md`, `tex`, `html`은 주로 import/export 포맷이고, `.docsy`는 앱 내부 상태를 최대한 보존하기 위한 persistence 포맷입니다.

## AI와 Patch Review

현재 AI 관련 구현은 다음 원칙 위에 있습니다.

- 요약, 섹션 생성, 문서 비교는 Gemini 또는 내부 비교 로직을 사용
- 결과를 문서에 즉시 삽입하지 않음
- reviewable patch set으로 변환
- 사용자가 patch를 검토한 뒤 적용

관련 핵심 경로:

- `src/components/editor/AiAssistantDialog.tsx`
- `src/components/editor/PatchReviewDialog.tsx`
- `src/components/editor/PatchReviewPanel.tsx`
- `src/hooks/useAiAssistant.ts`
- `src/hooks/usePatchReview.ts`
- `src/lib/ai/compareDocuments.ts`
- `src/lib/ai/sectionGeneration.ts`
- `src/lib/ai/suggestDocumentUpdates.ts`
- `src/lib/ast/applyDocumentPatch.ts`

## i18n과 UI

- `src/i18n/`에 `ko/en` 번역 레이어가 있습니다.
- `I18nProvider`가 앱 루트에서 적용됩니다.
- 편집기 헤더, 툴바, AI dialog, patch review UI까지 i18n이 연결되어 있습니다.

## 테스트 범위

테스트는 `src/test/`에 있으며, 현재 다음 영역을 중심으로 구성되어 있습니다.

- 포맷 변환과 round-trip
- AST 렌더링/검증
- `.docsy` 파일 포맷과 autosave migration
- patch set 판별, review, apply
- retrieval schema와 vector store
- 편집기 UI 일부 회귀 테스트

주요 예시:

- `src/test/docsyFileFormat.test.ts`
- `src/test/docsyAutosaveMigration.test.ts`
- `src/test/docsyRichTextRoundtrip.test.ts`
- `src/test/applyDocumentPatch.test.ts`
- `src/test/reviewPatchSet.test.ts`
- `src/test/compareDocuments.test.ts`
- `src/test/patchReviewPanel.test.tsx`

## 빠른 시작

### 요구 사항

- Node.js 18 이상
- npm

### 설치

```bash
npm install
```

### 앱만 실행

```bash
npm run dev
```

기본 개발 서버는 `http://localhost:8080`에서 실행됩니다.

### AI 기능까지 함께 실행

1. 환경 파일 생성

```bash
cp .env.example .env.local
```

Windows PowerShell에서는:

```powershell
Copy-Item .env.example .env.local
```

2. `.env.local` 설정

- `GEMINI_API_KEY`
- `GEMINI_MODEL` 기본값: `gemini-2.5-flash`
- `AI_SERVER_PORT` 기본값: `8787`
- `AI_ALLOWED_ORIGIN` 기본값: `http://localhost:8080`
- `VITE_AI_API_BASE_URL` 기본값: `http://localhost:8787`

3. AI 서버 실행

```bash
npm run ai:server
```

4. 다른 터미널에서 프런트엔드 실행

```bash
npm run dev
```

## 스크립트

- `npm run dev`: Vite 개발 서버 실행
- `npm run build`: 프로덕션 빌드
- `npm run build:dev`: 개발 모드 빌드
- `npm run preview`: 빌드 결과 미리보기
- `npm run lint`: ESLint 실행
- `npm run test`: Vitest 실행
- `npm run test:watch`: Vitest watch 모드
- `npm run ai:server`: Gemini 프록시 서버 실행
- `npm run typecheck:server`: 서버 TypeScript 타입체크

## 참고 문서

### docs

- [2026-03-09 Session Summary](docs/session-summary-2026-03-09.md)
- [2026-03-09 Docsy Lossless Storage](docs/session-summary-2026-03-09-docsy.md)
- [2026-03-09 Engineering Update](docs/session-summary-2026-03-09-engineering-update.md)

### PRD

- [Execution Plan v0.1](PRD/docsy_execution_plan_v0.1.md)
- [Issue Backlog v0.1](PRD/docsy_issue_backlog_v0.1.md)
- [Document AST Design Spec v0.1](PRD/docsy_document_ast_design_spec_v0.1.md)

## 개발 메모

- 현재 README는 온보딩 중심 문서입니다.
- 세션별 구현 상세와 변경 이력은 `docs/`를 우선 확인하는 편이 맞습니다.
- 설계 의도와 중장기 방향은 `PRD/` 문서를 기준으로 보는 편이 정확합니다.
- 저장소에는 `package-lock.json`, `bun.lock`, `bun.lockb`가 함께 있으나, 현재 실행 예시는 `npm` 기준으로 정리되어 있습니다.

## 보안 메모

- `GEMINI_API_KEY`는 브라우저 번들에 넣지 않습니다.
- Gemini 호출은 `server/aiServer.ts` 프록시를 통해 처리합니다.
- 클라이언트는 편집기 payload만 서버로 전달하고, 비밀키는 서버 환경 변수로 관리합니다.
