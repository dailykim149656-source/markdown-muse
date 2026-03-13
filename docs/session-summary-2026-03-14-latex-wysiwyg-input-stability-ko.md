# 2026-03-14 LaTeX WYSIWYG 입력 안정화 및 placeholder 플리커 제거 작업 기록

## 요약

LaTeX WYSIWYG 편집 화면에서 보이던 두 가지 문제를 함께 정리했다.

- 입력 중 커서 점프, 문자 유실, 부모 상태 echo에 따른 재시드 가능성
- 빈 편집기 안내 문구 placeholder가 입력 직후 다시 깜빡이는 현상

이번 작업은 LaTeX 편집기를 우선 안정화하되, 같은 문제가 Markdown/HTML 편집기에도 반복되지 않도록 rich-text editor 공통 seed 계약과 부모 동기화 경로를 같이 정리하는 방향으로 진행했다.

## 문제 원인

핵심 원인은 세 갈래였다.

1. `LatexEditor`가 WYSIWYG 변경마다 즉시 `HTML -> LaTeX` 전체 export를 수행했다.
2. `Index`가 입력 중에도 `tiptapJson`, `ast`, `sourceSnapshots`를 동기적으로 다시 문서 상태에 밀어 넣고 있었고, 이 값이 다시 편집기 seed처럼 사용될 여지가 있었다.
3. LaTeX 빈 상태 안내 문구가 Tiptap placeholder pseudo-element에 직접 의존하고 있어 empty-state 판정이 흔들릴 때 플리커가 발생할 수 있었다.

## 구현 내용

### 1. rich-text editor seed 계약 정리

`Index`에서 rich-text editor로 내려주는 seed를 라이브 문서 상태와 분리했다.

- `activeDoc.id + editorKey` 기준의 `seedRevision` 도입
- 같은 `seedRevision` 안에서는 부모 `content`, `tiptapJson`, `sourceSnapshots.html` echo로 다시 seed를 갱신하지 않도록 변경
- `MarkdownEditor`, `LatexEditor`, `HtmlEditor` 모두 raw prop 변화가 아니라 `seedRevision` 변화 기준으로만 재시드

관련 파일:

- [src/pages/Index.tsx](../src/pages/Index.tsx)
- [src/components/editor/MarkdownEditor.tsx](../src/components/editor/MarkdownEditor.tsx)
- [src/components/editor/LatexEditor.tsx](../src/components/editor/LatexEditor.tsx)
- [src/components/editor/HtmlEditor.tsx](../src/components/editor/HtmlEditor.tsx)

### 2. LaTeX WYSIWYG 입력 경로 안정화

`LatexEditor`의 WYSIWYG 업데이트 경로를 즉시 export 방식에서 coalesced flush 방식으로 바꿨다.

- WYSIWYG 변경 시 최신 `html/json`만 보관
- 다음 animation frame에서 한 번만 `exportDocsyToLatex()` 실행
- 새 입력이 들어오면 이전 flush는 취소하고 최신 값만 반영
- source pane -> WYSIWYG 동기화 중에는 역방향 WYSIWYG export를 막도록 guard 유지

IME 대응도 추가했다.

- `compositionstart` 동안은 WYSIWYG export와 부모 커밋 보류
- `compositionend` 시 최신 상태를 한 번만 flush

관련 파일:

- [src/components/editor/LatexEditor.tsx](../src/components/editor/LatexEditor.tsx)

### 3. placeholder 구조 변경

LaTeX 편집기에서는 Tiptap placeholder extension을 끄고 별도 overlay help를 렌더하도록 바꿨다.

- 표시 조건: `editor.isEmpty && !isComposing`
- 렌더 위치: `.ProseMirror` 바깥의 명시적 overlay
- 목적: empty-state 판정과 CSS pseudo-element를 분리해서 플리커 제거

공통 editor extension 생성기도 함께 정리했다.

- placeholder 인자를 optional로 변경
- 값이 없으면 `Placeholder` extension 자체를 등록하지 않음

관련 파일:

- [src/components/editor/editorConfigBase.ts](../src/components/editor/editorConfigBase.ts)
- [src/components/editor/editorConfig.ts](../src/components/editor/editorConfig.ts)
- [src/components/editor/LatexEditor.tsx](../src/components/editor/LatexEditor.tsx)

### 4. 부모 동기화 hot path 완화

`Index`의 rich-text 부모 상태 반영을 latest-only deferred sync로 재구성했다.

- `handleTiptapChange`는 즉시 `tiptapJson`만 반영
- `ast` 직렬화는 latest-only deferred task로 지연
- `sourceSnapshots` 동기화도 per-render 즉시 쓰기 대신 latest-only deferred task로 변경
- 비긴급 상태 반영은 `startTransition()`으로 감싸 입력 우선순위 보존

관련 파일:

- [src/pages/Index.tsx](../src/pages/Index.tsx)
- [src/lib/editor/latestDeferredTask.ts](../src/lib/editor/latestDeferredTask.ts)

## 테스트 추가 및 검증

이번 작업에 맞춰 테스트를 확장했다.

### 단위 테스트

- `LatexEditor`가 same revision 부모 echo로 다시 reset되지 않는지 검증
- `LatexEditor`가 composition 중에는 export callback을 보류하는지 검증
- LaTeX empty-state overlay가 보였다가 입력 후 사라지고 same revision echo에서 돌아오지 않는지 검증
- latest-only deferred scheduler 동작 검증

관련 파일:

- [src/test/latexEditor.test.tsx](../src/test/latexEditor.test.tsx)
- [src/test/latestDeferredTask.test.ts](../src/test/latestDeferredTask.test.ts)

### 기존 편집기 회귀 확인

- [src/test/htmlEditor.test.tsx](../src/test/htmlEditor.test.tsx)
- [src/test/markdownEditor.test.tsx](../src/test/markdownEditor.test.tsx)
- [src/test/indexRuntimeActivation.test.tsx](../src/test/indexRuntimeActivation.test.tsx)

### E2E 회귀 테스트

LaTeX 모드로 전환한 뒤 영문 연속 입력, Enter, Backspace를 수행하고 다음을 확인하는 Playwright 회귀를 추가했다.

- 본문 텍스트가 안정적으로 유지되는지
- overlay help가 첫 입력 후 사라지고 다시 나타나지 않는지
- source pane 값도 같이 갱신되는지

관련 파일:

- [e2e/editor-regression.spec.ts](../e2e/editor-regression.spec.ts)

## 실행한 검증 명령

성공한 검증:

- `npm test -- src/test/latexEditor.test.tsx src/test/latestDeferredTask.test.ts src/test/indexRuntimeActivation.test.tsx`
- `npm test -- src/test/htmlEditor.test.tsx src/test/markdownEditor.test.tsx`
- `npm run test:e2e -- e2e/editor-regression.spec.ts`
- `npx tsc -p tsconfig.app.json --noEmit`

## 최종 상태

작업 종료 시점 기준으로 다음을 보장한다.

- LaTeX WYSIWYG 입력이 per-keystroke parent echo 때문에 다시 시드되지 않는다.
- LaTeX 편집기의 empty-state 안내 문구는 입력 후 사라지고 같은 revision 안에서 다시 깜빡이지 않는다.
- IME 조합 입력 중에는 불필요한 export/부모 커밋이 발생하지 않는다.
- rich-text 편집기 공통 seed 계약이 정리되어 Markdown/HTML도 같은 구조를 공유한다.
