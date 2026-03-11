# Markdown Muse 기술스택 정리

Date: 2026-03-11

## 목적

이 문서는 `package.json`, `vite.config.ts`, `server/`, `src/`, `docs/architecture-overview-2026-03-10.md`를 기준으로 현재 저장소가 실제로 사용하는 기술스택을 개발 관점에서 빠르게 파악할 수 있도록 정리한 문서다.

## 한눈에 보는 스택

| 영역 | 현재 스택 | 메모 |
| --- | --- | --- |
| 프론트엔드 런타임 | React 18.3, TypeScript 5.8, Vite 5, `@vitejs/plugin-react-swc` | SPA 구조, SWC 기반 React 빌드 |
| 라우팅 | `react-router-dom` 6 | `/`, `/guide`, `/editor`, `/editor/graph` |
| 상태 관리 | React 기본 훅 + 커스텀 훅 | Redux, Zustand 같은 외부 전역 스토어는 없음 |
| 데이터 패칭 기반 | `@tanstack/react-query` 5 | `QueryClientProvider`는 연결되어 있지만 주 흐름은 커스텀 훅 중심 |
| UI 시스템 | Tailwind CSS 3, shadcn/ui, Radix UI, CVA, `clsx`, `tailwind-merge`, `lucide-react` | CSS 변수 기반 테마 |
| 에디터 엔진 | Tiptap 3, ProseMirror, lowlight | Markdown/LaTeX/HTML 리치 텍스트 편집 |
| 구조화 데이터 편집 | JSON, YAML, `js-yaml`, Ajv | JSON/YAML 편집과 스키마 검증 |
| 문서 모델 | 커스텀 `Document AST`, `.docsy` 포맷 | AST 중심 직렬화/렌더링/패치 |
| 로컬 저장 | `localStorage`, IndexedDB | autosave, 버전 히스토리, knowledge index |
| AI 백엔드 | Node.js native `http`, `tsx`, `@google/genai` | Gemini 프록시 서버 |
| 테스트 | Vitest, Testing Library, jsdom | 단위 테스트 + UI 테스트 |
| 품질 도구 | ESLint 9, `typescript-eslint` | 타입 검사 설정은 느슨한 편(`strict: false`) |
| 배포/운영 | Vite 정적 번들, Docker, Cloud Build | AI 서버는 컨테이너화 가능 |

## 1. 프론트엔드 애플리케이션 계층

프론트엔드는 전형적인 React SPA 구조다.

- 엔트리 포인트는 `src/main.tsx`, 루트 구성은 `src/App.tsx`
- `BrowserRouter` 기반 라우팅
- `Suspense` + `lazy()`로 페이지 단위 지연 로딩
- `QueryClientProvider`, `I18nProvider`, 툴팁/토스트 프로바이더를 루트에 배치

현재 확인되는 주요 라우트는 다음과 같다.

- `/`: 랜딩 페이지
- `/guide`: 사용자 가이드
- `/editor`: 메인 편집기
- `/editor/graph`: 워크스페이스 그래프 화면

## 2. 빌드 시스템과 런타임 프로파일

빌드는 Vite 중심이다.

- 번들러: Vite 5
- React 트랜스파일: SWC 플러그인
- 경로 별칭: `@ -> ./src`
- 모드 기반 프로파일: `desktop`, `web`

`vite.config.ts` 기준으로 이 프로젝트는 단순 Vite 설정이 아니라 프로파일 분기와 수동 청크 분할을 적극적으로 사용한다.

- `web` 프로파일에서는 무거운 기능을 늦게 연다
- `knowledge`, `history`, `ai`, `share`, `editor-aux` 같은 기능 청크를 분리한다
- `tiptap`, `prosemirror`, `katex`, `mermaid`, UI 벤더도 분리한다
- 번들 결과를 `bundle-report.json`으로 남긴다

즉, 기술적으로는 "React/Vite 앱"이지만 운영 관점에서는 성능 최적화를 고려한 다중 프로파일 프론트엔드다.

## 3. UI와 디자인 시스템

UI 레이어는 Tailwind + shadcn/ui 조합이다.

- 스타일링: Tailwind CSS 3 + PostCSS + Autoprefixer
- 컴포넌트 베이스: shadcn/ui
- 접근성 프리미티브: Radix UI
- 클래스 조합: `class-variance-authority`, `clsx`, `tailwind-merge`
- 아이콘: `lucide-react`
- 토스트: `sonner`
- 모션: `framer-motion`

`components.json`과 `tailwind.config.ts`를 보면 다음 특징이 있다.

- CSS 변수 기반 컬러 시스템
- `darkMode: ["class"]`
- 기본 산세리프 폰트 체인은 `Pretendard`, `Noto Sans KR`, `Apple SD Gothic Neo`, `Malgun Gothic` 중심
- Tailwind 플러그인으로 `tailwindcss-animate` 사용

즉, UI 기술 선택은 "Tailwind 유틸리티 + shadcn/Radix 기반 재사용 컴포넌트" 쪽에 가깝다.

## 4. 편집기 및 문서 처리 엔진

이 저장소의 핵심 기술스택은 일반적인 CMS보다 문서 엔진 쪽에 더 무게가 실려 있다.

### 리치 텍스트 편집

- `@tiptap/react`
- `@tiptap/starter-kit`
- Tiptap 확장들
  - color
  - font family
  - highlight
  - history
  - placeholder
  - subscript / superscript
  - table
  - task list
  - text align
  - text style
  - code block with lowlight

### 커스텀 에디터 확장

`src/components/editor/extensions` 기준으로 다음 커스텀 확장이 있다.

- admonition
- cross reference
- figure caption
- footnote
- math
- mermaid block
- node id
- resizable image
- table of contents
- font size
- find/replace highlight

### 지원 편집 모드

`src/pages/Index.tsx` 기준 현재 주요 편집 모드는 다음과 같다.

- Markdown
- LaTeX
- HTML
- JSON
- YAML

### 문서 모델

실제 핵심은 Tiptap 자체보다 `Document AST`와 `.docsy` 포맷이다.

- AST 직렬화/역직렬화: `src/lib/ast`
- `.docsy` 포맷: `src/lib/docsy/fileFormat.ts`
- AST 렌더링: HTML / Markdown / LaTeX
- 패치 적용: `applyDocumentPatch`, `applyStructuredPatchSet`
- AST 검증: `validateDocumentAst`

구조적으로는 다음 흐름이다.

1. 에디터 상태를 Tiptap JSON과 AST로 관리
2. AST를 기준으로 HTML/Markdown/LaTeX 렌더링
3. `.docsy` 저장 시 문서 메타데이터, AST, 소스 스냅샷을 함께 보존

즉, 이 프로젝트는 "단순 Markdown 편집기"가 아니라 "Tiptap UI 위에 AST 중심 문서 엔진을 올린 구조"라고 보는 편이 정확하다.

## 5. 포맷 변환과 고급 콘텐츠 처리

문서 변환용 보조 스택도 꽤 두껍다.

- Markdown round-trip: `turndown`, `turndown-plugin-gfm`
- 수식 렌더링: `katex`
- 다이어그램 렌더링: `mermaid`
- 구문 강조: `lowlight`
- QR 코드 생성: `qrcode`
- JSON/YAML 파싱: `js-yaml`
- 구조화 스키마 검증: `ajv`

코드 기준으로 다음이 확인된다.

- HTML <-> Markdown 라운드트립 유틸리티 존재
- Mermaid 블록은 커스텀 Tiptap 노드로 처리
- KaTeX는 필요 시 동적 로딩
- AsciiDoc, RST, Typst, LaTeX 쪽 변환 유틸리티도 포함

즉, 문서 포맷 호환성과 내보내기 기능이 제품의 중요한 기술 축이다.

## 6. 상태 관리와 브라우저 저장소

상태 관리는 외부 전역 스토어보다 커스텀 훅 조합에 의존한다.

주요 훅은 다음과 같다.

- `useDocumentManager`
- `useEditorUiState`
- `useFormatConversion`
- `useDocumentIO`
- `usePatchReview`
- `useVersionHistory`
- `useKnowledgeBase`

현재 구조의 특징은 다음과 같다.

- 문서 상태: React `useState` 기반
- 자동 저장: `localStorage`
- 버전 히스토리: IndexedDB, 실패 시 `localStorage` fallback
- knowledge index: IndexedDB, 실패 시 `localStorage` fallback
- 공유 링크: `.docsy` 기반 payload를 Base64URL 해시로 인코딩

즉, 서버 DB 없이 브라우저 저장소를 적극적으로 활용하는 local-first 구조다.

## 7. 검색, 지식 인덱싱, 분석

지식 기능도 전부 프론트엔드 도메인 코드 안에 들어 있다.

- ingestion 정규화: `src/lib/ingestion`
- keyword retrieval: `src/lib/retrieval/keywordRetrieval.ts`
- in-memory vector store: `src/lib/retrieval/vectorStore.ts`
- knowledge index/store: `src/lib/knowledge`
- 포맷 일관성 분석: `src/lib/analysis/formatConsistency.ts`

중요한 점은 현재 확인되는 런타임 구조상 외부 벡터 DB는 없다.

- 검색/정규화/인덱싱은 로컬 로직 중심
- 벡터 저장소는 메모리 기반 구현
- 실제 AI 서버의 요약 grounding은 현재 keyword retrieval 중심

즉, "RAG 인프라가 완전히 외부 서비스화된 구조"는 아니고, 로컬 문서 분석 기능이 강한 편집기다.

## 8. AI 서버와 모델 연동

AI 연동은 브라우저 직결이 아니라 별도 프록시 서버를 둔다.

### 서버 스택

- 런타임: Node.js
- 서버 구현: `node:http`
- 실행 도구: `tsx`
- 모델 SDK: `@google/genai`
- 기본 모델: `gemini-2.5-flash`

### 현재 API 엔드포인트

- `GET /api/ai/health`
- `POST /api/ai/summarize`
- `POST /api/ai/generate-section`
- `POST /api/ai/generate-toc`

### 구현 특징

- 서버 프레임워크 없이 native HTTP 서버 사용
- 응답은 schema 기반 JSON 강제
- 프롬프트는 문서 chunk를 grounding 데이터로 사용
- 브라우저는 `VITE_AI_API_BASE_URL`을 통해 서버에 연결
- API 키는 서버 환경변수에서만 읽는다

즉, AI 스택은 "가벼운 Node 프록시 + Gemini structured output" 조합이다.

## 9. 국제화

국제화는 외부 i18n 프레임워크보다 자체 구현에 가깝다.

- 메시지 파일: `src/i18n/messages/en.ts`, `src/i18n/messages/ko.ts`
- 프로바이더: `I18nProvider`
- 기본 로케일: `ko`
- 로케일 저장: `localStorage`

즉, 이 프로젝트는 한국어 우선 기본값을 가진 경량 커스텀 i18n 구조를 사용한다.

## 10. 테스트, 린트, 타입체크

품질 도구 스택은 다음과 같다.

- 테스트 러너: Vitest 3
- DOM 테스트 환경: jsdom
- UI 테스트: `@testing-library/react`, `@testing-library/jest-dom`
- 린트: ESLint 9
- 타입스크립트 린트: `typescript-eslint`
- React 규칙: `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`

현재 설정상 타입 안정성은 "엄격"보다는 "생산성 우선"에 가깝다.

- `strict: false`
- `noImplicitAny: false`
- `noUnusedLocals: false`
- `noUnusedParameters: false`

즉, 테스트는 비교적 넓게 깔려 있지만 타입 정책은 느슨하다.

## 11. 배포와 운영 흔적

현재 저장소에서 확인되는 운영 스택은 다음과 같다.

- 프론트엔드: Vite 빌드 산출물 `dist/`
- AI 서버 컨테이너: `Dockerfile.ai`
- 베이스 이미지: `node:22-alpine`
- 이미지 빌드: `cloudbuild.ai.yaml`
- 운영 가이드: `docs/gcp-deployment.md`

중요한 운영 포인트는 다음과 같다.

- 로컬 개발 요구사항은 README 기준 Node.js 18+
- 컨테이너 이미지는 Node 22 사용
- Dockerfile은 `npm ci`를 사용하므로 실제 배포 기준 패키지 매니저는 npm
- 저장소에 `bun.lock`도 있지만 현재 운영 기준은 npm 쪽이 더 명확하다

## 12. 현재 기술스택을 한 줄로 요약하면

Markdown Muse는 다음 조합으로 보는 것이 가장 정확하다.

> React + TypeScript + Vite 기반의 local-first 문서 편집기이며, Tiptap/Document AST/.docsy로 문서 엔진을 구성하고, 브라우저 저장소와 경량 Node Gemini 프록시 서버를 결합한 구조다.

## 부록: 스택 성격 요약

- 강점
  - 문서 모델이 분명하다
  - 로컬 저장 구조가 명확하다
  - 에디터 확장성과 포맷 변환 범위가 넓다
  - AI 키를 브라우저에 노출하지 않는다
- 특이점
  - 일반적인 CRUD 백엔드보다 문서 엔진 코드 비중이 훨씬 높다
  - 전역 상태 라이브러리보다 커스텀 훅 조합을 선호한다
  - 웹/데스크톱 프로파일 분리가 빌드와 UX에 직접 반영돼 있다
- 확인된 비포함 항목
  - Express, NestJS 같은 서버 프레임워크는 없음
  - Redux, Zustand 같은 전역 상태 스토어는 없음
  - 외부 데이터베이스, 인증, 서버 세션 레이어는 현재 코드에서 확인되지 않음
