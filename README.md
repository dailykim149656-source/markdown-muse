# Docsy Editor

`Docsy Editor`는 `Markdown / LaTeX / HTML / JSON / YAML` 문서를 편집하고, 여러 출력 포맷으로 변환할 수 있는 문서 편집기입니다.<br />
기본 스택은 `Vite + React + TypeScript + Tailwind + shadcn/ui + TipTap`입니다.

## 핵심 기능

- 다중 문서 탭과 사이드바 기반 문서 관리
- `Markdown`, `LaTeX`, `HTML`, `JSON`, `YAML` 편집
- WYSIWYG 편집과 소스 편집 병행
- 자동 저장과 이전 세션 복원
- 찾기/바꾸기, 전체 검색 하이라이트
- `Typst`, `AsciiDoc`, `reStructuredText`, `HTML`, `PDF(인쇄)` 내보내기
- 템플릿 기반 문서 시작
- `Mermaid`, 수식, 각주, 목차, admonition, cross reference 등 확장 지원

## 기술 스택

- `React 18`
- `TypeScript`
- `Vite`
- `Tailwind CSS`
- `shadcn/ui`
- `TipTap`
- `Vitest`

## 스크린샷

### 편집기 미리보기

![Docsy Editor preview](src/assets/editor-preview.png)

### 에셋

- 로고: `src/assets/docsly-logo.png`
- 편집기 캡처: `src/assets/editor-preview.png`

## 프로젝트 구조

```text
.
├─ public/
├─ src/
│  ├─ assets/
│  ├─ components/
│  │  ├─ editor/
│  │  │  ├─ extensions/
│  │  │  ├─ utils/
│  │  │  ├─ MarkdownEditor.tsx
│  │  │  ├─ LatexEditor.tsx
│  │  │  ├─ HtmlEditor.tsx
│  │  │  ├─ JsonYamlEditor.tsx
│  │  │  ├─ EditorHeader.tsx
│  │  │  ├─ DocumentTabs.tsx
│  │  │  ├─ FileSidebar.tsx
│  │  │  ├─ ExportPreviewPanel.tsx
│  │  │  ├─ FindReplaceBar.tsx
│  │  │  ├─ SourcePanel.tsx
│  │  │  ├─ StructuredDataHighlightEditor.tsx
│  │  │  ├─ TemplateDialog.tsx
│  │  │  └─ useAutoSave.ts
│  │  ├─ ui/
│  │  └─ NavLink.tsx
│  ├─ hooks/
│  │  ├─ useDocumentManager.ts
│  │  └─ useEditorUiState.ts
│  ├─ lib/
│  ├─ pages/
│  │  ├─ Landing.tsx
│  │  ├─ Index.tsx
│  │  └─ NotFound.tsx
│  ├─ test/
│  ├─ App.tsx
│  └─ main.tsx
├─ package.json
├─ vite.config.ts
├─ vitest.config.ts
└─ tailwind.config.ts
```

## 디렉터리별 역할

### `src/pages`

- `Landing.tsx`: 소개/랜딩 화면
- `Index.tsx`: 실제 편집기 화면과 전체 조립
- `NotFound.tsx`: 라우트 fallback

### `src/components/editor`

편집기 도메인 전용 레이어입니다.

- 포맷별 에디터
  - `MarkdownEditor.tsx`
  - `LatexEditor.tsx`
  - `HtmlEditor.tsx`
  - `JsonYamlEditor.tsx`
- 편집기 셸/도구
  - `EditorHeader.tsx`
  - `DocumentTabs.tsx`
  - `FileSidebar.tsx`
  - `FindReplaceBar.tsx`
  - `ExportPreviewPanel.tsx`
  - `SourcePanel.tsx`
- 소스 하이라이트
  - `LatexHighlightEditor.tsx`
  - `StructuredDataHighlightEditor.tsx`
- 부가 기능
  - `TemplateDialog.tsx`
  - `SchemaValidator.tsx`
  - `useAutoSave.ts`

### `src/components/editor/extensions`

TipTap 확장 모음입니다.

- `MermaidBlock.tsx`
- `MathExtension.tsx`
- `FootnoteExtension.tsx`
- `TableOfContents.tsx`
- `FigureCaption.tsx`
- `CrossReference.tsx`
- `AdmonitionExtension.tsx`
- `ResizableImage.tsx`
- `FindReplaceHighlight.ts`

### `src/components/editor/utils`

포맷 변환과 하이라이트 관련 순수 로직입니다.

- `markdownRoundtrip.ts`: Markdown ↔ HTML
- `htmlToLatex.ts`: HTML ↔ LaTeX 일부 변환
- `latexToTypst.ts`
- `htmlToTypst.ts`
- `htmlToAsciidoc.ts`
- `asciidocToHtml.ts`
- `htmlToRst.ts`
- `rstToHtml.ts`
- `structuredDataHighlight.ts`: JSON/YAML 하이라이트 토큰화

### `src/hooks`

- `useDocumentManager.ts`: 문서 목록, 활성 문서, 자동 저장, 탭 상태
- `useEditorUiState.ts`: 다크모드, 전체화면, 미리보기, 찾기/바꾸기 등 UI 상태

### `src/components/ui`

`shadcn/ui` 기반 공용 UI 컴포넌트 레이어입니다.

### `src/test`

변환 로직과 하이라이트 로직에 대한 테스트가 들어 있습니다.

- `exportConversions.test.ts`
- `markdownRoundtrip.test.ts`
- `htmlToRst.test.ts`
- `latexToTypst.test.ts`
- `structuredDataHighlight.test.ts`

## 핵심 아키텍처

### 화면 조립

- 진입점은 `src/main.tsx`
- 전역 Provider와 라우팅은 `src/App.tsx`
- 실제 편집기 조립은 `src/pages/Index.tsx`

### 상태 관리

- 문서 상태는 `useDocumentManager.ts`가 담당합니다.
- UI 상태는 `useEditorUiState.ts`가 담당합니다.
- 각 에디터는 편집 결과를 부모로 올리고, 부모는 현재 문서 상태와 실시간 HTML을 보관합니다.

### 데이터 흐름

기본 흐름은 다음과 같습니다.

1. 사용자가 에디터에서 입력
2. 포맷별 에디터가 내부 상태 갱신
3. 부모(`Index.tsx`)로 canonical content 전달
4. `useDocumentManager.ts`가 현재 문서 상태 갱신
5. autosave가 localStorage에 저장
6. preview / export / print는 부모가 가진 최신 데이터 사용

### 포맷 처리 방식

- `Markdown`, `HTML`, `LaTeX`는 Rich Text 흐름을 가집니다.
- `JSON`, `YAML`은 구조 편집 + 소스 편집 흐름을 가집니다.
- 변환 로직은 대부분 `src/components/editor/utils`에 모여 있습니다.

## 기능별 화면 흐름

### 문서 생성

```text
사이드바 / 탭 바 / 템플릿 버튼
→ 새 문서 생성 요청
→ useDocumentManager.ts가 문서 목록 갱신
→ Index.tsx가 활성 문서 전환
→ 포맷별 에디터 렌더링
```

- 일반 새 문서 생성은 `FileSidebar.tsx`, `DocumentTabs.tsx`, `Index.tsx`를 통해 들어옵니다.
- 템플릿 생성은 `TemplateDialog.tsx`에서 템플릿을 선택한 뒤 같은 문서 생성 흐름으로 연결됩니다.

### 편집과 자동 저장

```text
사용자 입력
→ MarkdownEditor / LatexEditor / HtmlEditor / JsonYamlEditor
→ 부모(Index.tsx)로 content 변경 전달
→ useDocumentManager.ts가 active document 갱신
→ useAutoSave.ts가 localStorage 저장
```

- Rich Text 계열은 canonical content와 live HTML을 함께 유지합니다.
- `JSON/YAML`은 source text와 parsed data를 같이 관리합니다.

### 찾기와 바꾸기

```text
FindReplaceBar 입력
→ 현재 활성 에디터 확인
→ Rich Text: TipTap highlight extension 사용
→ JSON/YAML: plain-text adapter 사용
→ 현재 매치 선택 / 전체 매치 하이라이트 / replace 적용
```

- Rich Text 검색 하이라이트는 `extensions/FindReplaceHighlight.ts`가 담당합니다.
- `JSON/YAML` 검색 하이라이트는 `StructuredDataHighlightEditor.tsx` 오버레이가 담당합니다.

### 포맷 변환

```text
모드 변경 요청
→ 현재 문서 모드 확인
→ Rich Text 계열은 HTML 중간 표현 사용
→ target mode content 생성
→ active document mode/content 갱신
→ 에디터 remount 및 재렌더
```

- `Markdown ↔ HTML`, `HTML ↔ LaTeX`, `HTML → Typst / AsciiDoc / RST` 변환은 `src/components/editor/utils`에 있습니다.
- `JSON/YAML`은 별도 텍스트 계열 흐름으로 처리됩니다.

### 미리보기와 내보내기

```text
사용자 preview/export 요청
→ Index.tsx가 현재 문서와 live HTML 확인
→ ExportPreviewPanel 또는 다운로드 로직 실행
→ 파일 생성 / 브라우저 인쇄 / 포맷 변환 결과 출력
```

- 미리보기 패널은 `ExportPreviewPanel.tsx`가 담당합니다.
- 다운로드와 print/PDF 진입은 `Index.tsx`에서 처리합니다.

### JSON/YAML 편집

```text
구조 편집 or 소스 편집
→ JsonYamlEditor.tsx가 source/data 동기화
→ StructuredDataHighlightEditor.tsx가 문법 색상/검색 하이라이트 표시
→ SchemaValidator.tsx로 검증 가능
→ 필요 시 JSON ↔ YAML 변환
```

- source panel은 실제 textarea 입력과 하이라이트 오버레이를 분리한 구조입니다.
- 검색, 선택, 치환은 textarea 기준으로 동작하므로 export/저장과 상태가 어긋나지 않습니다.

## 개발 가이드

### 처음 볼 파일

- `src/pages/Index.tsx`: 편집기 화면 조립, 파일 입출력, 미리보기 연결
- `src/hooks/useDocumentManager.ts`: 문서 목록과 활성 문서 상태
- `src/hooks/useEditorUiState.ts`: 다크모드, 전체화면, 찾기/바꾸기 등 UI 상태
- `src/components/editor/editorConfig.ts`: TipTap extension 구성
- `src/components/editor/utils/*`: 포맷 변환 핵심 로직

### 기능 추가 포인트

- 새 TipTap 기능 추가: `src/components/editor/extensions`
- 새 export 포맷 추가: `src/components/editor/utils`와 `src/pages/Index.tsx`
- 새 템플릿 추가: `src/components/editor/TemplateDialog.tsx`
- JSON/YAML 하이라이트 조정: `src/components/editor/utils/structuredDataHighlight.ts`

### 데이터 흐름 요약

1. 포맷별 에디터가 입력을 받음
2. 부모가 canonical content와 live state를 갱신함
3. `useDocumentManager.ts`가 문서 목록과 자동 저장을 관리함
4. preview / export / print는 부모가 가진 최신 데이터 기준으로 동작함

### 테스트 우선순위

- 변환 로직 수정 시: `src/test/exportConversions.test.ts`
- Markdown round-trip 수정 시: `src/test/markdownRoundtrip.test.ts`
- RST 변환 수정 시: `src/test/htmlToRst.test.ts`
- LaTeX/Typst 수정 시: `src/test/latexToTypst.test.ts`
- JSON/YAML 하이라이트 수정 시: `src/test/structuredDataHighlight.test.ts`

### 현재 리팩터링 메모

- `Index.tsx`는 여전히 조립 책임이 큽니다.
- 포맷 변환과 파일 입출력을 더 분리하면 유지보수가 쉬워집니다.
- 패키지 매니저 락파일이 혼재되어 있어 팀 기준 정리가 필요합니다.

## 실행 방법

### 요구 사항

- Node.js 18 이상
- npm

### 설치

```bash
npm install
```

### 개발 서버

```bash
npm run dev
```

### 빌드

```bash
npm run build
```

### 미리보기

```bash
npm run preview
```

## 스크립트

- `npm run dev`: 개발 서버 실행
- `npm run build`: 프로덕션 빌드
- `npm run build:dev`: 개발 모드 빌드
- `npm run lint`: ESLint 실행
- `npm run test`: Vitest 실행
- `npm run test:watch`: Vitest watch 모드

## 지원하는 입출력 포맷

### 편집 입력

- `.md`
- `.tex`
- `.html`, `.htm`
- `.json`
- `.yaml`, `.yml`
- `.adoc`, `.asciidoc`
- `.rst`

### 내보내기

- Markdown
- LaTeX
- JSON
- YAML
- Typst
- AsciiDoc
- reStructuredText
- HTML
- PDF(브라우저 인쇄 기반)

## 템플릿

템플릿 정의는 `src/components/editor/TemplateDialog.tsx`에 있습니다.

- 새 문서 생성 시 템플릿 선택 가능
- 문서 종류별 frontmatter 기반 초기 콘텐츠 제공
- 카테고리/모드/검색 필터 지원

## 현재 구조 해석

이 프로젝트는 단순 Markdown 에디터가 아니라, 멀티 포맷 문서 작성기 성격이 강합니다.

- `pages`는 화면 단위
- `components/editor`는 문서 편집 도메인
- `components/ui`는 공용 UI 시스템
- `utils`는 순수 변환 로직
- `hooks`는 상태 관리
- `test`는 변환/하이라이트 회귀 검증

이 분리는 비교적 명확하며, 특히 포맷 변환과 TipTap 확장을 분리한 점이 유지보수에 유리합니다.

## 참고 사항

- 저장소에 `package-lock.json`, `bun.lock`, `bun.lockb`가 함께 있습니다.
- 현재 README 예시는 `npm` 기준으로 작성되어 있습니다.
- 팀 운영 시 패키지 매니저를 하나로 통일하는 편이 안전합니다.
