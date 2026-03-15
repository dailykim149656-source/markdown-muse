# 2026-03-14 문서탭 상시 초기화 버튼 및 검증 복구 개발 기록

## 요약

이번 작업에서는 문서탭에서 `새로 시작` 기능을 상시 사용할 수 있도록 UI를 확장했고, 그 과정에서 드러난 검증 실패를 다시 통과 상태로 복구했다.

핵심 목표는 두 가지였다.

- 문서가 1개뿐이어도 문서탭에서 문서 초기화 버튼을 직접 사용할 수 있게 만들기
- 관련 테스트와 앱 타입체크가 다시 통과하도록 저장/타입/추론 경로를 정리하기

## 구현 내용

### 1. 문서탭에 상시 초기화 버튼 추가

수정 파일:

- `src/components/editor/DocumentTabs.tsx`
- `src/pages/Index.tsx`

변경 사항:

- `DocumentTabs`에 `onResetDocuments`, `resetDocumentsDisabled` prop을 추가했다.
- 기존에는 문서가 1개일 때 탭 바 자체를 숨겼지만, 이제는 문서가 0개가 아닌 이상 탭 바를 렌더하도록 변경했다.
- 탭 바 우측 액션 영역에 `RotateCcw` 아이콘 기반의 `새로 시작` 버튼을 추가했다.
- 버튼의 `aria-label`과 `title`은 기존 i18n 키 `resetDocuments.action`을 재사용했다.
- 실제 초기화 동작은 기존 `Index`의 `handleRequestResetDocuments` 흐름을 그대로 사용한다.

유지된 동작:

- 헤더 `More` 메뉴의 기존 `새로 시작` 액션은 유지
- 다중 문서 상태에서 탭 선택, 닫기, 새 문서 생성 동작 유지
- 리셋 확인 다이얼로그와 실제 reset 수행 경로 유지

### 2. 문서 초기화 관련 테스트 추가 및 보강

수정/추가 파일:

- `src/test/documentTabs.test.tsx`
- `src/test/workspaceWarningSurfaces.test.tsx`

추가 검증:

- 단일 문서일 때도 문서탭과 초기화 버튼이 보이는지
- 초기화 버튼 클릭 시 탭 선택이 아니라 reset 콜백만 호출되는지
- `resetDocumentsDisabled`일 때 버튼이 비활성화되는지
- 다중 문서에서 선택, 닫기, 새 문서 생성이 유지되는지
- workspace sync badge가 있는 탭에서도 초기화 버튼이 같이 보이는지

## 검증 실패 복구

### 1. autosave hydrate 레이스 수정

수정 파일:

- `src/hooks/useDocumentManager.ts`

문제:

- `useDocumentManager`가 빈 상태에서도 비동기 hydrate를 바로 시도하면서, 새 문서 생성 직후 저장된 local autosave fallback을 뒤늦게 덮어쓰는 레이스가 있었다.
- 이 때문에 `useDocumentManager` 테스트에서 즉시 저장과 unmount 후 복원 기대가 깨졌다.

해결:

- 초기 `v2` autosave 데이터가 있거나 `v3` autosave pointer가 있을 때만 hydrate를 시도하도록 조건을 추가했다.
- 실제 저장 대상이 없는 세션에서는 hydrate가 불필요하게 실행되지 않도록 막았다.

결과:

- `useDocumentManager` 테스트가 다시 안정적으로 통과한다.

### 2. 앱 타입체크 복구

수정 파일:

- `tsconfig.app.json`
- `src/components/editor/editorConfig.ts`
- `src/components/editor/extensions/MermaidBlock.tsx`
- `src/hooks/useAiAssistant.ts`
- `src/hooks/usePatchReview.ts`
- `src/hooks/useFormatConversion.ts`
- `src/hooks/useKnowledgeBase.ts`
- `src/lib/ast/applyDocumentPatch.ts`
- `src/lib/ast/tiptapAst.ts`
- `src/lib/documents/autosaveV3Store.ts`
- `src/lib/history/autosaveDiffSummary.ts`
- `src/lib/knowledge/consistencyAnalysis.ts`
- `src/lib/knowledge/knowledgeIndex.ts`
- `src/lib/knowledge/sourceFingerprint.ts`
- `src/lib/knowledge/workspaceInsights.ts`
- `src/pages/WorkspaceGraph.tsx`

정리한 내용:

- app tsconfig의 `lib`를 `ES2023`으로 올려 최신 JS API 타입을 허용했다.
- 앱 타입체크 범위에서 `src/test`를 제외해 런타임 앱 타입과 테스트 fixture 타입을 분리했다.
- TipTap extension 배열과 Mermaid command의 타입 추론을 명시적으로 고정했다.
- AI assistant 요청에서 rich-text mode 타입을 명시적으로 좁혔다.
- patch review workspace sync 결과의 `warnings` 접근을 안전하게 좁혔다.
- knowledge/source fingerprint/graph context 경로에서 `unknown` 또는 literal narrowing이 깨진 부분을 복구했다.
- AST patch payload 분기 타입과 TipTap AST 정렬/align kind 추론을 명시적으로 정리했다.

## 검증 결과

통과한 검증:

- `npx tsc -p tsconfig.app.json --noEmit`
- `npx vitest run src/test/documentTabs.test.tsx src/test/workspaceWarningSurfaces.test.tsx src/test/editorHeaderResetDocuments.test.tsx src/test/editorWorkspace.test.tsx src/test/resetDocumentsDialog.test.tsx src/test/useDocumentManager.test.tsx src/test/autosaveV3Migration.test.ts`

검증 범위 요약:

- 문서탭 상시 초기화 UI
- 문서 reset dialog 및 reset flow
- autosave v3 migration
- useDocumentManager 즉시 저장 및 복원
- workspace warning이 있는 탭 UI
- app TypeScript typecheck

## 주요 파일

- `src/components/editor/DocumentTabs.tsx`
- `src/pages/Index.tsx`
- `src/hooks/useDocumentManager.ts`
- `src/test/documentTabs.test.tsx`
- `tsconfig.app.json`

## 최종 상태

작업 종료 시점 기준으로 다음이 보장된다.

- 문서가 1개뿐이어도 문서탭에서 `새로 시작` 버튼을 직접 사용할 수 있다.
- 기존 헤더 overflow 메뉴의 reset 액션도 유지된다.
- `useDocumentManager` 관련 저장/복원 테스트가 다시 통과한다.
- 앱 타입체크가 다시 clean 상태로 통과한다.
- 이번 작업 범위의 회귀 테스트가 모두 통과한다.
