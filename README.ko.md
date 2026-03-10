# Markdown Muse

Markdown Muse는 rich-text 편집, `.docsy` 저장 형식, `Document AST`,
reviewable AI patch workflow를 중심으로 설계된 local-first 기술 문서 편집기입니다.

`Markdown`, `LaTeX`, `HTML`, `JSON`, `YAML`, `AsciiDoc`,
`reStructuredText`를 지원하며, AI 결과를 문서에 바로 반영하지 않고
검토 가능한 patch set으로 생성합니다.

![Markdown Muse preview](src/assets/editor-preview.png)

## 주요 기능

- 탭과 파일 사이드바 기반 다중 문서 편집
- Markdown, LaTeX, HTML rich-text 편집
- JSON, YAML structured editing
- local autosave와 세션 복원
- `.docsy` 저장/복원과 richer editor state 보존
- `Document AST` 직렬화, 렌더링, 검증, patch 적용
- 요약, 섹션 생성, 비교, 업데이트 제안, 절차 추출, TOC 제안까지 포함한 review-first AI 흐름
- normalized document chunk 기반 local knowledge index와 검색
- snapshot preview와 restore가 가능한 local version history
- share link와 QR 기반 경량 문서 공유
- Markdown, HTML, JSON, YAML clipboard export
- 데스크톱, 태블릿, 모바일 대응 editor shell

## 데스크톱 / 웹 프로필

현재 Markdown Muse는 두 가지 실행 프로필을 갖습니다.

- `desktop`
  전체 기능이 기본 노출됩니다. 문서 도구, structured editing, AI,
  history, knowledge panel, 고급 블록이 모두 바로 사용 가능합니다.
- `web`
  기본 편집기는 더 가볍게 시작합니다. 텍스트, 제목, 리스트, blockquote,
  inline formatting, link 중심으로 열리고, 무거운 기능은 필요할 때만
  로드됩니다.

빌드 명령:

- `npm run build`
  데스크톱 중심 프로덕션 빌드
- `npm run build:web`
  웹 중심 프로덕션 빌드

예시:

```bash
# 데스크톱 프로필
npm run build

# 웹 프로필
npm run build:web
```

## 최근 최적화 요약

최근 작업은 웹 기본 진입 성능을 낮추면서 데스크톱 기능 범위를 유지하는 데
집중했습니다.

- core rich-text 편집기와 문서 도구, 고급 블록을 분리했습니다.
- 웹에서는 문서 도구가 기본 비활성입니다.
  표, 이미지, 캡션, cross-reference, 각주, admonition, TOC placeholder,
  code-block UI, font controls가 여기에 포함됩니다.
- 웹에서는 고급 블록도 기본 비활성입니다.
  수식과 Mermaid 편집이 여기에 포함됩니다.
- JSON/YAML 편집은 유지하지만, 웹 기본 모드 스위치에는 노출하지 않고
  명시적 structured flow로 진입합니다.
- AI, knowledge, history, share, structured editing 경로는 lazy runtime
  경계로 분리했습니다.
- 데스크톱은 전체 기능 노출을 유지하면서 내부 로딩만 점진적으로 줄였습니다.

대표적인 웹 빌드 기준 수치:

- `/editor` 메인 청크: 약 `270KB raw / 79KB gzip`
- `EditorToolbarDocumentTools` 청크: 약 `21KB raw`
- `EditorToolbarAdvancedTools` 청크: 약 `3KB raw`

## 제품 모델

- source format은 import/export surface입니다.
- `.docsy`는 richer editor state를 보존하는 persistence format입니다.
- `Document AST`는 canonical structured representation입니다.
- AI 결과는 reviewable patch set으로 변환됩니다.
- 사용자는 변경 전 patch를 검토하고 accept, reject, edit를 결정합니다.

## 아키텍처 개요

### UI Layer

- `src/components/editor`
- `src/pages`
- `src/i18n`

에디터 UI, dialog, toolbar, preview, sidebar, 번역 문자열이 여기에 있습니다.

### State / Workflow Layer

- `src/hooks/useDocumentManager.ts`
- `src/hooks/useEditorUiState.ts`
- `src/hooks/useFormatConversion.ts`
- `src/hooks/useDocumentIO.ts`
- `src/hooks/usePatchReview.ts`
- `src/hooks/useKnowledgeBase.ts`

문서 상태, UI 상태, conversion, file IO, patch review, knowledge workflow를
조합합니다.

### Domain Layer

- `src/lib/ast`
- `src/lib/docsy`
- `src/lib/patches`
- `src/lib/ai`
- `src/lib/ingestion`
- `src/lib/retrieval`
- `src/lib/knowledge`

AST 변환, `.docsy` persistence, patch 검증/적용, AI orchestration,
ingestion normalization, retrieval, knowledge indexing을 담당합니다.

### Server Layer

- `server/aiServer.ts`

Gemini 요청은 브라우저에서 직접 호출하지 않고 local Node proxy를 통해 처리합니다.

## 시작하기

### 요구 사항

- Node.js 18 이상
- npm

### 설치

```bash
npm install
```

### 프런트엔드 실행

```bash
npm run dev
```

기본 Vite 개발 서버는 `http://localhost:8080`에서 실행됩니다.

### AI 서버 실행

1. 로컬 환경 파일을 만듭니다.

```bash
cp .env.example .env.local
```

Windows PowerShell:

```powershell
Copy-Item .env.example .env.local
```

2. `.env.local`을 설정합니다.

- `GEMINI_API_KEY`
- `GEMINI_MODEL`
- `AI_SERVER_PORT`
- `AI_ALLOWED_ORIGIN`
- `VITE_AI_API_BASE_URL`

3. AI 서버를 시작합니다.

```bash
npm run ai:server
```

4. 다른 터미널에서 프런트엔드를 실행합니다.

```bash
npm run dev
```

## 스크립트

- `npm run dev` - Vite 개발 서버
- `npm run build` - 데스크톱 중심 프로덕션 빌드
- `npm run build:web` - 웹 중심 프로덕션 빌드
- `npm run build:dev` - 개발 모드 빌드
- `npm run preview` - 프로덕션 빌드 미리보기
- `npm run lint` - ESLint 실행
- `npm run test` - Vitest 실행
- `npm run test:watch` - Vitest watch 모드
- `npm run ai:server` - Gemini proxy server 실행
- `npm run typecheck:server` - 서버 타입 체크

## 문서

- [문서 인덱스](docs/README.md)
- [PRD 인덱스](PRD/README.md)
- [아키텍처 개요](docs/architecture-overview-2026-03-10.md)
- [웹 성능 최적화 요약](docs/session-summary-2026-03-10-web-performance-optimization.md)
- [GCP 배포 가이드](docs/gcp-deployment.md)
- [v0.7 구현 업데이트](docs/session-summary-2026-03-10-v0.7-implementation-update.md)
- [v0.7 구현 계획](docs/prd-v0.7-implementation-plan-2026-03-10.md)
- [실행 가능한 로드맵](docs/prd-feasible-implementation-roadmap-2026-03-09.md)

## 보안 메모

- `GEMINI_API_KEY`는 브라우저 번들에 포함되지 않습니다.
- Gemini 호출은 `server/aiServer.ts`를 통해 처리됩니다.
- 프런트엔드는 document payload만 proxy로 보내고, secret은 서버 환경 변수로 관리합니다.
