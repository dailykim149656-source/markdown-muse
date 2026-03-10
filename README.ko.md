# Markdown Muse

Markdown Muse는 `.docsy`, `Document AST`, review-first AI patch workflow를 중심으로 만든 local-first 기술 문서 편집기입니다.

핵심 특징:

- Markdown, LaTeX, HTML, JSON, YAML, AsciiDoc, RST 지원
- 리치 텍스트 편집과 구조 편집을 함께 지원
- AI 결과를 문서에 바로 반영하지 않고 `Patch Review`를 통해 검토
- 로컬 knowledge index, graph, suggestion queue 기반 다문서 유지보수 지원
- 랜딩 페이지와 `/guide` 설명서 제공

![Markdown Muse preview](src/assets/editor-preview.png)

## 언어

- [기본 README](README.md)
- [English README](README.en.md)

## 빠른 요약

- 다중 문서 편집과 파일 사이드바
- Markdown, LaTeX, HTML 리치 텍스트 편집
- JSON, YAML 구조 편집
- `.docsy` 저장 및 복원
- `Document AST` 기반 렌더링, 검증, 패치 적용
- review-first AI 기능
  - 요약
  - 섹션 생성
  - 비교
  - 업데이트 제안
  - 절차 추출
  - TOC 제안
- local knowledge index와 검색
- version history와 snapshot 복원
- share link / QR 공유
- clipboard export
- desktop / tablet / mobile 대응 editor shell

## 빌드 프로필

Markdown Muse는 두 가지 빌드/실행 프로필을 가집니다.

- `desktop`
  전체 편집 표면을 기본으로 노출합니다. 문서 도구, structured editing, AI, history, knowledge panel, advanced blocks를 바로 사용할 수 있습니다.
- `web`
  기본 에디터는 더 가볍게 시작합니다. 무거운 기능은 필요할 때만 열리도록 분리되어 있습니다.

주요 명령:

- `npm run build`
  데스크톱 중심 프로덕션 빌드
- `npm run build:web`
  웹 중심 프로덕션 빌드

예시:

```bash
# desktop profile
npm run build

# web profile
npm run build:web
```

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

### AI 서버 실행

1. 환경 파일 생성

```bash
cp .env.example .env.local
```

Windows PowerShell:

```powershell
Copy-Item .env.example .env.local
```

2. `.env.local` 설정

- `GEMINI_API_KEY`
- `GEMINI_MODEL`
- `AI_SERVER_PORT`
- `AI_ALLOWED_ORIGIN`
- `VITE_AI_API_BASE_URL`

3. AI 서버 실행

```bash
npm run ai:server
```

4. 다른 터미널에서 프런트엔드 실행

```bash
npm run dev
```

## 주요 스크립트

- `npm run dev` - Vite 개발 서버
- `npm run build` - desktop 프로덕션 빌드
- `npm run build:web` - web 프로덕션 빌드
- `npm run build:dev` - development 모드 빌드
- `npm run preview` - 프로덕션 빌드 미리보기
- `npm run lint` - ESLint 실행
- `npm run test` - Vitest 실행
- `npm run test:watch` - Vitest watch 모드
- `npm run ai:server` - Gemini proxy server 실행
- `npm run typecheck:server` - 서버 타입체크

## 현재 구현된 기능 문서

- [구현 기능 요약 (Korean)](docs/implemented-features-summary-ko-2026-03-11.md)
- [Implemented Features Summary](docs/implemented-features-summary-2026-03-11.md)
- [Developer Feature Map](docs/developer-feature-map-2026-03-11.md)
- [PRD 상태 점검](docs/prd-status-check-2026-03-11.md)

## 문서 역할 안내

문서 종류마다 목적이 다릅니다.

- `/guide`
  제품 안에 있는 사용자 설명서입니다. 실제 사용 방법을 익힐 때 봅니다.
- `docs/`
  저장소 기준의 제품 상태, 구현 계획, 릴리즈 관련 문서입니다. 현재 제품 상태나 개발 계획을 파악할 때 봅니다.
- `PRD/`
  원본 요구사항 초안과 과거 PRD 보관소입니다. 초기 요구사항이나 이전 버전 문맥을 추적할 때 봅니다.

## 주요 문서

- [Docs Index](docs/README.md)
- [PRD Index](PRD/README.md)
- [Architecture Overview](docs/architecture-overview-2026-03-10.md)
- [Landing Guide Implementation Plan](docs/landing-guide-implementation-plan-2026-03-11.md)
- [Release Gate and DoD for v1.0](docs/release-gate-and-dod-v1-2026-03-10.md)
- [v0.8-v1.0 Execution Plan](docs/prd-v0.8-to-v1.0-execution-plan-2026-03-10.md)
- [Web Performance Optimization Summary](docs/session-summary-2026-03-10-web-performance-optimization.md)
- [GCP Deployment Guide](docs/gcp-deployment.md)

## 보안 메모

- `GEMINI_API_KEY`는 브라우저 번들에 포함되지 않습니다.
- Gemini 호출은 `server/aiServer.ts`를 통해 처리됩니다.
- 프런트엔드는 문서 payload만 proxy로 보내고, 비밀 값은 서버 환경 변수로 관리합니다.
