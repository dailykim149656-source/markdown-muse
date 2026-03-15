# Session Summary: LaTeX WYSIWYG, Resume Import, and XeLaTeX Engine Preview

Date: 2026-03-13

## Summary

이번 작업에서는 Docsy 편집기의 LaTeX 모드를 다음 방향으로 확장했다.

- XeLaTeX 기반 검증 및 엔진 미리보기 경로 추가
- `resume.tex` 스타일 매크로 문서를 WYSIWYG로 구조화 편집 가능하도록 개선
- 미지원 LaTeX 구문을 `opaque_latex_block`으로 보존하는 보수적 파싱 전략 도입
- 다른 페이지로 이동했다가 돌아왔을 때 WYSIWYG 편집면이 빈 화면이 되는 복귀 버그 수정

핵심 목표는 다음과 같았다.

- 기본 제공 LaTeX 템플릿과 일반 논문 문법이 불필요하게 raw block으로 떨어지지 않을 것
- resume 계열 매크로를 구조화된 카드/행 UI로 편집할 수 있을 것
- 알 수 없는 LaTeX는 손실 없이 raw block으로 남길 것
- 엔진 결과를 기준으로 한 read-only preview를 제공할 것

## What changed

### 1. XeLaTeX 검증/미리보기 경로 확장

기존 LaTeX 편집기는 parser 기반 HTML 변환에 의존했고, XeLaTeX는 검증/컴파일 용도로만 사용되고 있었다.

이번 작업에서 다음을 추가했다.

- `/api/tex/preview` 프록시 경로 추가
- TeX 서비스에서 PDF를 base64로 반환하는 preview 응답 추가
- 프런트 `useTexValidation` 훅이 preview compile 결과를 유지하도록 확장
- 마지막 성공 preview를 유지하고, 이후 compile 실패 시 diagnostics만 갱신하도록 처리
- 우측 inspector에 `Engine Preview` 탭 추가

주요 파일:

- `src/hooks/useTexValidation.ts`
- `src/lib/ai/client.ts`
- `server/aiServer.ts`
- `server/texService.ts`
- `server/modules/tex/compiler.ts`
- `src/components/editor/ExportPreviewPanel.tsx`

### 2. 기본 제공 LaTeX paper template 구조화

기본 제공 LaTeX paper template조차 parser에서 raw block으로 떨어질 수 있던 문제를 줄이기 위해, 다음 구문을 구조화된 node로 직접 인식하도록 확장했다.

- `\title`
- `\author`
- `\date`
- `\maketitle`
- `\begin{abstract}...\end{abstract}`

새 block type:

- `latex_title_block`
- `latex_abstract`

이 block들은 HTML/Markdown/LaTeX/AST 경로에 모두 연결했고, title block은 preamble의 `\title`, `\author`, `\date`와 round-trip 되도록 export 경로를 보강했다.

주요 파일:

- `src/types/documentAst.ts`
- `src/lib/latex/importLatexToDocsy.ts`
- `src/lib/latex/exportDocsyToLatex.ts`
- `src/lib/ast/renderAstToHtml.ts`
- `src/lib/ast/renderAstToMarkdown.ts`
- `src/lib/ast/renderAstToLatex.ts`
- `src/lib/ast/tiptapAst.ts`
- `src/components/editor/extensions/ResumeLatexExtensions.tsx`

### 3. `resume.tex` 전용 WYSIWYG 구조 편집 지원

`resume.tex` 형태의 LaTeX 이력서 템플릿을 구조화된 편집 폼처럼 편집할 수 있도록 importer/exporter와 Tiptap extension을 추가했다.

지원된 구조:

- `resume_header`
- `resume_summary`
- `resume_entry`
- `resume_skill_row`
- `opaque_latex_block`

지원된 대표 매크로:

- `\resumeSummary`
- `\resumeEmployment`
- `\resumeSubheading`
- `\resumeProject`
- `\resumeResearch`
- `\resumeTalk`
- `\resumeSkills`
- `\resumeCommunity`

결과적으로 resume 본문 데이터는 WYSIWYG로 편집하고, 미지원/애매한 LaTeX는 raw block으로 보존하는 하이브리드 모델이 완성되었다.

주요 파일:

- `src/lib/latex/importLatexToDocsy.ts`
- `src/lib/latex/exportDocsyToLatex.ts`
- `src/components/editor/extensions/ResumeLatexExtensions.tsx`
- `src/hooks/useDocumentIO.ts`
- `src/hooks/useFormatConversion.ts`
- `src/components/editor/LatexEditor.tsx`

### 4. 미지원 resume 매크로와 list wrapper 처리 개선

다음 항목들이 사라지거나 잘못 skip 되던 문제를 보완했다.

- `\resumeCommunity`
- `\resumeItem`
- `\resumeItemListStart`
- `\resumeItemListEnd`
- `\resumeSubHeadingListEnd`

변경 사항:

- `resumeCommunity`를 기존 `resume_entry` card UI로 구조화
- 지원된 parent 아래의 `resumeItemListStart ... \resumeItem ... \resumeItemListEnd`는 detail bullet로 흡수
- orphaned `\resumeItem` 또는 malformed list wrapper는 조용히 사라지지 않고 raw opaque block으로 보존

### 5. 보수적 opaque block 파싱 전략 도입

임의 LaTeX를 억지로 WYSIWYG로 승격시키는 대신, “정확히 아는 패턴만 구조화하고, 나머지는 연속 source 구간 단위로 raw block으로 보존”하는 전략으로 정리했다.

핵심 원칙:

- known-pattern only promotion
- contiguous unsupported region -> one `opaque_latex_block`
- unsupported command/environment는 손실 없이 export 시 그대로 유지
- malformed resume/list syntax도 partial drop 대신 하나의 raw block으로 유지

또한 opaque block UI를 compact preview 기본값으로 바꾸고, 펼쳤을 때만 monospaced textarea가 열리도록 개선했다.

주요 파일:

- `src/lib/latex/importLatexToDocsy.ts`
- `src/components/editor/extensions/ResumeLatexExtensions.tsx`

### 6. 페이지 복귀 시 WYSIWYG blank 문제 수정

다른 페이지로 갔다가 `/editor`로 돌아왔을 때 WYSIWYG 편집면이 빈 공백이 되는 문제를 수정했다.

원인 가정:

- 비어 있지만 truthy인 `tiptapJson`이 non-empty source보다 우선 seed로 사용됨

수정 내용:

- “usable tiptap document” 판별 helper 추가
- `MarkdownEditor`, `HtmlEditor`, `LatexEditor`가 empty tiptap doc보다 source-derived HTML을 우선 seed로 사용
- `getRenderableHtml`, `getRenderableMarkdown`, `getRenderableLatex`가 빈 tiptap state보다 fallback source를 우선 사용
- restore/migration 단계에서 non-empty source + empty tiptap doc이면 `tiptapJson`을 `null`로 정규화

주요 파일:

- `src/lib/ast/tiptapUsability.ts`
- `src/lib/ast/getRenderableHtml.ts`
- `src/lib/ast/getRenderableMarkdown.ts`
- `src/lib/ast/getRenderableLatex.ts`
- `src/lib/documents/storedDocument.ts`
- `src/components/editor/MarkdownEditor.tsx`
- `src/components/editor/HtmlEditor.tsx`
- `src/components/editor/LatexEditor.tsx`

## Verification completed

이번 작업 중 다음 검증을 수행했다.

- `npm run typecheck:server`
- `npm run build:web`
- `npm test -- latexRoundtrip.test.ts exportConversions.test.ts latexEditor.test.tsx`
- `npm test -- latexRoundtrip.test.ts useTexValidation.test.tsx exportPreviewPanel.validation.test.tsx`
- `npm test -- tiptapUsability.test.ts getRenderableHtml.test.ts getRenderableMarkdown.test.ts getRenderableLatex.test.ts storedDocument.test.ts markdownEditor.test.tsx htmlEditor.test.tsx latexEditor.test.tsx`

추가된 테스트 범주:

- built-in paper template import/export
- resume template round-trip
- malformed list/opaque block 보존
- XeLaTeX preview 유지 동작
- source 우선 seed precedence
- route 복귀 시 blank 방지

## Notes

- 현재 LaTeX 편집은 “엔진 기반 직접 편집”이 아니라 “구조 편집 + source 편집 + 엔진 기반 read-only preview” 모델이다.
- 알 수 없는 LaTeX는 계속 보수적으로 `opaque_latex_block`으로 남긴다.
- 엔진 preview는 correctness-oriented read-only surface이며, page-surface direct editing은 아직 범위에 포함하지 않았다.
- Vite는 여전히 `src/lib/ai/client.ts`의 dynamic/static import 혼합에 대한 chunk warning을 출력하지만, 이번 변경으로 새롭게 발생한 빌드 실패는 없다.
