# 2026-03-13 세션 요약: Autosave 히스토리 AI 요약과 사이드바 새 문서 드롭다운

Date: 2026-03-13

## 요약

이번 세션에서는 두 가지 사용자-facing 변경을 구현했다.

- 기록 탭의 autosave 항목이 고정 문구 대신 실제 diff 기반 AI summary를 가질 수 있도록 변경
- 왼쪽 사이드바 하단의 문서 생성 액션을 개별 아이콘 나열에서 단일 드롭다운으로 정리

최종 동작은 다음과 같다.

- autosave snapshot은 즉시 생성된다.
- 처음에는 기존 fallback 문구가 보인다.
- AI 서버가 응답 가능하면 같은 snapshot 항목에 diff 기반 summary가 비동기로 저장된다.
- export, patch apply 항목은 기존 고정 문구를 유지한다.
- 사이드바 하단에서는 `새 문서` 드롭다운 하나로 Markdown, LaTeX, HTML, JSON, YAML을 생성할 수 있다.

## 1. Autosave 히스토리 AI diff summary

### 구현 목표

기존 기록 탭 autosave 항목은 항상 다음 문구만 표시했다.

- `현재 문서 상태를 자동 저장했습니다.`

이번 변경에서는 이 fallback을 유지하되, 가능할 때는 실제 diff 내용에 기반한 짧은 AI summary로 교체하도록 만들었다.

### 구현 방식

핵심 흐름은 다음과 같다.

1. autosave 성공 시 version history snapshot을 즉시 저장한다.
2. 직전 snapshot과 현재 snapshot의 markdown 기준 diff payload를 만든다.
3. 전용 AI endpoint(`/api/ai/autosave-diff-summary`)로 한 줄 summary를 생성한다.
4. 같은 `snapshotId`를 upsert 해서 `metadata.summary`와 `summaryGeneratedAt`를 저장한다.
5. UI는 `metadata.summary`가 있으면 그것을 우선 렌더링하고, 없으면 기존 번역 문구를 fallback으로 사용한다.

### 추가된/변경된 주요 타입

- `src/types/document.ts`
  - `DocumentVersionSnapshotMetadata.summary?: string`
  - `DocumentVersionSnapshotMetadata.summaryGeneratedAt?: number`
- `src/types/aiAssistant.ts`
  - `AutosaveDiffSummaryRequest`
  - `AutosaveDiffSummaryResponse`
  - `AutosaveDiffSummaryDelta`

### 주요 구현 파일

- `src/hooks/useVersionHistory.ts`
- `src/lib/history/autosaveDiffSummary.ts`
- `src/lib/history/versionHistoryStore.ts`
- `src/components/editor/VersionHistoryPanel.tsx`
- `src/lib/ai/client.ts`
- `server/aiServer.ts`

### 전용 AI endpoint

기존 `/api/ai/summarize`를 재사용하지 않고 전용 endpoint를 추가했다.

- `POST /api/ai/autosave-diff-summary`

요청에는 다음 정보가 들어간다.

- 문서 id / 파일명 / mode
- diff counts
- 우선순위 정렬된 delta 최대 3개
- before / after excerpt

응답은 다음처럼 단순화했다.

```json
{
  "requestId": "uuid",
  "summary": "한 줄 요약"
}
```

## 2. 실제 디버깅 중 수정한 안정화 이슈

초기 구현 뒤 실제 브라우저 확인 과정에서 다음 문제들을 추가로 수정했다.

### 2.1 로컬 개발 환경에서 `/api` 프록시 대신 `localhost:8787` 직접 호출

프런트가 `127.0.0.1:4175`에서 뜨고 AI 서버는 `localhost:8787`에 있을 때 CORS로 health와 AI 호출이 실패했다.

수정:

- 로컬 개발 중 loopback target(`localhost`, `127.0.0.1`)은 `VITE_AI_API_BASE_URL`이 있어도 우선 `/api` 프록시를 쓰도록 변경

관련 파일:

- `src/lib/ai/client.ts`
- `src/lib/workspace/client.ts`

### 2.2 `/api/api/ai/...` 중복 경로 문제

AI client가 base URL을 `/api`로 바꾼 뒤에도 요청 path를 그대로 이어 붙여 `POST /api/api/ai/autosave-diff-summary`로 잘못 나가고 있었다.

수정:

- AI client에도 workspace client와 동일한 path 정규화 로직을 추가해 로컬 프록시 경로를 올바르게 계산

관련 파일:

- `src/lib/ai/client.ts`

### 2.3 malformed section path 때문에 diff builder가 예외를 던짐

`compareDocuments` 내부에서 section path 배열에 비문자 값이 섞인 경우 `toLowerCase()` 예외가 발생했고, 이 예외가 history hook에서 삼켜져 fallback만 보이는 상태가 되었다.

수정:

- 비교 전 텍스트 normalize를 string-safe 하게 변경

관련 파일:

- `src/lib/ai/compareDocuments.ts`

### 2.4 첫 autosave는 항상 fallback만 남는 문제

처음 구현은 “이전 snapshot이 있어야만” diff summary를 만들었다. 그 결과 새 문서에서 첫 줄 입력 후 첫 autosave는 항상 fallback 문구만 표시됐다.

수정:

- 이전 snapshot이 없더라도 현재 문서에 초기 내용이 있으면 “빈 문서 대비 added content”로 간주해 summary request를 생성하도록 변경

예:

- `*제목:test docs`

이제 이런 첫 입력도 autosave summary 대상으로 들어간다.

관련 파일:

- `src/lib/history/autosaveDiffSummary.ts`

## 3. 사이드바 새 문서 생성 UI 정리

### 기존 문제

왼쪽 사이드바 하단에 다음 버튼이 각각 개별로 노출되고 있었다.

- 새 Markdown
- 새 LaTeX
- 새 HTML
- 새 JSON
- 새 YAML

이 구조는 세로 공간을 많이 쓰고, 아이콘 collapsed 상태에서도 정보 밀도가 낮았다.

### 변경 내용

하단 액션을 다음 구조로 단순화했다.

- `템플릿`
- `새 문서` 드롭다운

`새 문서` 드롭다운 안에는 다음 항목이 들어간다.

- New Markdown
- New LaTeX
- New HTML
- New JSON
- New YAML

JSON/YAML은 기존과 동일하게 `showStructuredCreateAction`이 켜져 있으면 structured mode 노출 동작을 함께 수행한다.

관련 파일:

- `src/components/editor/FileSidebar.tsx`

## 검증

이번 세션에서 확인한 항목은 다음과 같다.

- `npm run test -- src/test/autosaveDiffSummary.test.ts src/test/useVersionHistory.test.tsx`
- `npm run test -- src/test/workspaceClient.test.ts src/test/useWorkspaceAuth.test.tsx`
- `npm run test -- src/test/compareDocuments.test.ts`
- `npm run test -- src/test/fileSidebar.mobile.test.tsx src/test/editorWorkspace.test.tsx src/test/workspaceWarningSurfaces.test.tsx`
- `npm run build`

추가로 실제 브라우저 검증에서 다음을 확인했다.

- `GET /api/ai/health => 200`
- `POST /api/ai/autosave-diff-summary => 200`
- 최신 snapshot에 `metadata.summary` 저장

실제 저장 예시:

- `Audit 섹션에 "Review retention alerts weekly." 문구가 추가되었습니다.`

## 현재 동작 제약

- 기존에 이미 저장된 history 항목을 backfill 하지는 않는다.
- export / patch apply는 AI summary 대상이 아니다.
- JSON/YAML 문서는 autosave diff summary 대상이 아니다.
- autosave summary는 loading indicator 없이 fallback에서 AI summary로 교체된다.
- 첫 autosave라도 현재 내용이 비어 있으면 여전히 fallback만 남는다.

## 관련 파일 요약

- History / AI summary
  - `src/hooks/useVersionHistory.ts`
  - `src/lib/history/autosaveDiffSummary.ts`
  - `src/lib/history/versionHistoryStore.ts`
  - `src/components/editor/VersionHistoryPanel.tsx`
  - `src/lib/ai/client.ts`
  - `server/aiServer.ts`
- Robustness fixes
  - `src/lib/workspace/client.ts`
  - `src/lib/ai/compareDocuments.ts`
- Sidebar create menu
  - `src/components/editor/FileSidebar.tsx`

