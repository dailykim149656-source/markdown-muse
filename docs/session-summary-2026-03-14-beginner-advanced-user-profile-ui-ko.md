# 2026-03-14 초급/고급 사용자 설정 기반 편집기 UI 분리 구현 기록

## 요약

이번 작업에서는 기존 편집기 셸을 유지한 상태에서 `초급(beginner)` / `고급(advanced)` 사용자 설정 프리셋을 추가했다.

핵심 목표는 다음과 같았다.

- 별도 앱이나 별도 라우트를 만들지 않고 같은 `/editor` 안에서 UI를 분기할 것
- 신규 사용자의 기본값을 `초급`으로 둘 것
- 초급에서는 문서 편집 중심 UI만 남기고 AI/지식/고급 편집 진입점을 제거할 것
- 기존 고급 문서는 자동 변환하지 않고 안전한 가드 패널로 막을 것
- 이미 저장된 고급 기능 preference는 지우지 않고, 고급으로 돌아오면 복원되게 할 것

## 구현 범위

### 1. 사용자 설정 타입과 capability 계층 추가

초급/고급을 단순 boolean 토글로 흩뿌리지 않고, 한 곳에서 UI 접근 가능 범위를 계산하는 capability 계층을 추가했다.

추가 파일:

- `src/lib/editor/userProfiles.ts`

주요 내용:

- `EditorUserProfile = "beginner" | "advanced"`
- `EditorUiCapabilities` 타입 추가
- 초급/고급 프리셋별 허용 기능 계산
- 현재 문서가 초급 UI와 호환되는지 판정하는 로직 추가

초급에서 비활성화되는 범위는 다음으로 고정했다.

- AI Assistant
- Knowledge 탭
- History 탭
- Patch Review
- JSON/YAML structured mode
- document tools
- advanced blocks

### 2. 사용자 설정 저장 로직 추가

현재 브라우저 기준으로 사용자 설정을 유지하도록 `localStorage` preference를 추가했다.

수정 파일:

- `src/lib/editor/webEditorPreferences.ts`

추가 함수:

- `readUserProfilePreference()`
- `writeUserProfilePreference()`

동작 원칙:

- 저장값이 없으면 기본값은 `beginner`
- 기존 `advancedBlocks` / `documentTools` preference는 그대로 유지
- 초급에서는 effective capability만 제한하고 저장값 자체는 삭제하지 않음

### 3. Index에서 사용자 설정과 문서 호환성 판단을 중앙 관리

실제 기능 게이트는 `Index`에서 중앙집중식으로 처리했다.

수정 파일:

- `src/pages/Index.tsx`

주요 변경:

- `userProfile` 상태 추가
- `effectiveCapabilities` 계산 추가
- `activeDocumentCompatibility` 계산 추가
- AI intent, knowledge queue, history activation, patch review open을 UI 숨김뿐 아니라 로직 수준에서도 차단
- 초급에서는 `documentFeaturesEnabled`, `advancedBlocksEnabled`를 강제로 false로 계산
- 새 문서 생성과 mode 전환도 capability 기준으로 필터링

### 4. 고급 문서용 가드 패널 추가

초급에서 열 수 없는 문서는 편집기를 보여 주지 않고 가드 패널을 띄우도록 했다.

호환 불가 조건:

- 현재 문서 mode가 `json` 또는 `yaml`
- 문서에 document tools 사용 흔적이 있는 경우
- 문서에 advanced blocks 사용 흔적이 있는 경우

판정에는 기존 감지 로직을 재사용했다.

재사용 로직:

- `src/components/editor/editorAdvancedContent.ts`

가드 동작:

- 문서 내용은 수정하지 않음
- 자동으로 고급으로 바꾸지 않음
- `고급으로 전환` 버튼만 제공

### 5. 헤더에 사용자 설정 전환 UI 추가

사용자 설정 전환은 헤더에 항상 보이는 토글 버튼으로 처리하도록 구현했다.

수정 파일:

- `src/components/editor/EditorHeader.tsx`

주요 변경:

- 현재 사용자 설정 라벨 표시
- 초급/고급 직접 토글 버튼 추가
- 초급 모드에서는 AI Assistant 버튼 숨김
- 초급 모드에서는 Patch Review 버튼 숨김

### 6. 사이드바와 새 문서 메뉴를 capability 기반으로 정리

사이드바는 더 이상 `knowledgeEnabled`, `historyEnabled` 같은 개별 상태만 보지 않고 capability와 합쳐서 렌더링하도록 바꿨다.

수정 파일:

- `src/components/editor/FileSidebar.tsx`

주요 변경:

- 초급에서는 Documents 탭만 노출
- 초급에서는 Knowledge / History 탭 숨김
- 초급에서는 새 문서 메뉴에 Markdown / LaTeX / HTML만 노출
- structured mode 진입점은 capability가 있을 때만 표시

### 7. 템플릿도 초급 범위에 맞게 필터링

초급 UI에서 템플릿이 우회 진입점이 되지 않도록 템플릿 필터링을 추가했다.

수정 파일:

- `src/components/editor/TemplateDialog.tsx`
- `src/pages/Index.tsx`

동작:

- 초급에서는 JSON/YAML 템플릿 제외
- 초급에서는 document tools 필요 템플릿 제외
- 초급에서는 advanced blocks 필요 템플릿 제외
- 필터 후 사용할 수 있는 템플릿이 없으면 템플릿 버튼 자체를 숨김

## 주요 파일

이번 작업에서 직접 수정하거나 추가한 핵심 파일은 다음과 같다.

- `src/pages/Index.tsx`
- `src/components/editor/EditorHeader.tsx`
- `src/components/editor/FileSidebar.tsx`
- `src/components/editor/TemplateDialog.tsx`
- `src/lib/editor/userProfiles.ts`
- `src/lib/editor/webEditorPreferences.ts`
- `src/i18n/messages/en.ts`
- `src/i18n/messages/ko.ts`

## 테스트와 검증

다음 테스트를 실행해 초급/고급 분기와 회귀 범위를 확인했다.

- `src/test/indexRuntimeActivation.test.tsx`
- `src/test/editorHeaderModeDropdown.test.tsx`
- `src/test/editorHeaderResetDocuments.test.tsx`
- `src/test/editorWorkspace.test.tsx`
- `src/test/fileSidebar.mobile.test.tsx`
- `src/test/fileSidebar.userProfile.test.tsx`
- `src/test/templateDialog.test.tsx`
- `src/test/webEditorPreferences.userProfile.test.ts`
- `src/test/workspaceWarningSurfaces.test.tsx`
- `src/test/i18nCoverage.test.ts`
- `src/test/i18nSidebarMessages.test.ts`
- `src/test/i18nPatchReviewMessages.test.ts`

결과:

- 12개 테스트 파일
- 31개 테스트 통과

## 남은 주의사항

이번 작업 범위의 테스트는 통과했지만, 저장소 전체 TypeScript 상태는 이미 기존 오류가 남아 있어서 `tsc --noEmit`를 clean 신호로 사용하지 않았다.

즉 이번 작업은 다음 범위에서 검증되었다.

- 사용자 설정 persistence
- 헤더 노출 제어
- 사이드바 기능 제한
- 템플릿 필터링
- AI / history / patch review 런타임 게이트
- 초급 모드의 고급 문서 가드 패널
- i18n 메시지 추가

반면 저장소 전체 타입 상태는 별도 정리 작업이 필요하다.

## 최종 상태

작업 종료 시점 기준으로 다음을 보장한다.

- 신규 사용자는 초급 UI로 시작한다.
- 같은 브라우저에서 초급/고급 설정이 유지된다.
- 초급에서는 AI/지식/고급 기능 진입점이 UI와 로직 양쪽에서 차단된다.
- 고급 문서는 초급에서 자동 변환되지 않고 안전한 가드 패널로 보호된다.
- 사용자가 고급으로 전환하면 기존 고급 preference와 기능 흐름이 복원된다.
