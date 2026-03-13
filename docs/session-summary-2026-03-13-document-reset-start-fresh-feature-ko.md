# 2026-03-13 문서 초기화(Start Fresh) 기능 구현 기록

## 범위

이번 작업은 이전 작업 상태가 자동 복원되는 현재 편집기 흐름을 유지하면서, 사용자가 로컬 문서 상태를 비우고 빈 문서부터 다시 시작할 수 있는 `새로 시작` 기능을 추가하는 데 집중했다.

초기화 대상은 문서 관련 로컬 데이터로 한정했다.

- autosave
- 버전 히스토리
- 지식 인덱스
- 소스 스냅샷
- 릴리스 체크리스트

다음 항목은 유지하도록 설계했다.

- UI 언어
- 테마
- 사이드바 너비
- 웹 편집기 옵션
- Google Workspace 연결 상태

## 구현 내용

### 1. 복원 세션에서 바로 `새로 시작`할 수 있는 진입점 추가

- 이전 세션이 복원되면 토스트에 `새로 시작` 액션이 표시되도록 추가했다.
- 상단 더보기 overflow 메뉴에도 같은 `새로 시작` 항목을 추가했다.
- 두 진입점 모두 즉시 삭제하지 않고 확인 다이얼로그를 먼저 열도록 통일했다.

주요 파일:

- `src/pages/Index.tsx`
- `src/components/editor/EditorHeader.tsx`
- `src/components/editor/ResetDocumentsDialog.tsx`
- `src/lib/documents/restoredSessionToast.ts`

### 2. 문서 상태 초기화 로직 추가

- `useDocumentManager()`에 `resetDocuments()`를 추가했다.
- reset 시 현재 문서 세트를 비우고 빈 `Untitled` Markdown 문서 1개로 교체한다.
- active 문서, editor key, autosave 상태를 즉시 갱신해 같은 세션 안에서도 바로 새 시작 상태가 반영되도록 했다.
- reset 과정에서 legacy autosave key도 함께 정리한다.

주요 파일:

- `src/hooks/useDocumentManager.ts`
- `src/components/editor/useAutoSave.ts`

### 3. 문서 관련 로컬 저장소 일괄 정리 helper 추가

- 버전 히스토리 전체 삭제
- knowledge index 삭제
- source snapshot 삭제
- release checklist 삭제

위 작업을 하나의 helper로 묶어 reset 흐름에서 재사용 가능하게 정리했다.

주요 파일:

- `src/lib/documents/resetLocalDocumentState.ts`

### 4. pristine blank 문서는 “복원된 세션”으로 취급하지 않도록 보정

- 자동 생성된 빈 문서 1개만 저장된 상태는 의미 있는 복원 세션이 아니라고 판단하도록 기준을 추가했다.
- 이 보정으로 reset 이후 다시 접속해도 `이전 작업을 복원했습니다` 토스트가 재노출되지 않는다.

주요 파일:

- `src/components/editor/useAutoSave.ts`
- `src/hooks/useDocumentManager.ts`

### 5. reset 직후 knowledge UI 상태도 함께 비워지도록 보정

- knowledge 패널은 내부적으로 메모리 상태를 유지하므로, 로컬 저장소만 비우면 이전 인덱스/체크리스트가 UI에 남을 수 있었다.
- 이를 막기 위해 reset version key를 추가해 knowledge 패널을 reset 시점에 다시 마운트하도록 했다.

주요 파일:

- `src/pages/Index.tsx`
- `src/components/editor/FileSidebar.tsx`

### 6. i18n 및 회귀 테스트 추가

- 영어/한국어 문구를 추가했다.
- reset helper, dialog, header action, restored-session toast, autosave restore 판정에 대한 테스트를 추가했다.

주요 파일:

- `src/i18n/messages/en.ts`
- `src/i18n/messages/ko.ts`
- `src/test/useDocumentManager.test.tsx`
- `src/test/resetLocalDocumentState.test.ts`
- `src/test/resetDocumentsDialog.test.tsx`
- `src/test/editorHeaderResetDocuments.test.tsx`
- `src/test/restoredSessionToast.test.ts`

## 검증 결과

다음 Vitest 대상군을 실행해 통과를 확인했다.

- `src/test/useDocumentManager.test.tsx`
- `src/test/resetLocalDocumentState.test.ts`
- `src/test/editorHeaderResetDocuments.test.tsx`
- `src/test/resetDocumentsDialog.test.tsx`
- `src/test/restoredSessionToast.test.ts`
- `src/test/i18nCoverage.test.ts`
- `src/test/i18nSidebarMessages.test.ts`
- `src/test/editorHeaderModeDropdown.test.tsx`
- `src/test/editorWorkspace.test.tsx`
- `src/test/workspaceWarningSurfaces.test.tsx`
- `src/test/fileSidebar.mobile.test.tsx`

결과:

- 11개 테스트 파일
- 25개 테스트
- 모두 통과

## 주의사항

전체 타입체크 `npx tsc -p tsconfig.app.json --noEmit` 는 여전히 실패한다. 이번 기능과 직접 관련 없는 기존 저장소 문제들이 남아 있기 때문이다.

대표 예시:

- `server/modules/workspace/googleDriveClient.ts`
- `src/components/editor/ChangeMonitoringPanel.tsx`
- `src/components/editor/MarkdownEditor.tsx`
- `src/pages/Index.tsx`

즉, 이번 `새로 시작` 기능은 대상 회귀 테스트 범위에서는 통과했지만, 저장소 전체 타입 상태 자체는 아직 clean 하지 않다.

## 최종 상태

작업 종료 시점 기준으로 다음이 보장된다.

- 복원된 세션에서 바로 `새로 시작`할 수 있다.
- 확인 다이얼로그를 거쳐서만 초기화된다.
- 로컬 문서 관련 상태만 비워지고 사용자 환경설정과 Google 연결은 유지된다.
- reset 후에는 빈 문서 1개로 돌아간다.
- reset 이후 재접속 시 pristine blank 상태는 “복원된 세션”으로 다시 안내되지 않는다.
