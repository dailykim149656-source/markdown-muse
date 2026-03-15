# 2026-03-12 Google Docs Export 및 Google 드롭다운 세션 요약

## 요약

이번 세션에서는 기존 Google Workspace 연동에 부족했던 두 가지를 보완했습니다.

- 로컬 Docsy 문서를 새 Google Docs 문서로 내보내는 `Export to Google Docs`
- 헤더의 Google 관련 액션을 하나의 드롭다운으로 정리한 UI

이제 사용자는 같은 위치에서 다음 작업을 수행할 수 있습니다.

- Google 연결 관리
- Google Drive에서 문서 import
- 로컬 문서를 새 Google Docs로 export
- 이미 연결된 문서를 Google Docs로 다시 저장

## 이번 세션에서 구현한 것

### 1. 새 Google Docs export API

서버에 새 Google Docs 문서를 만들고, 현재 문서의 Markdown을 즉시 반영한 뒤, 프런트가 바로 사용할 수 있는 `workspaceBinding`을 돌려주는 API를 추가했습니다.

핵심 결과:

- `POST /api/workspace/export` 추가
- Google Docs API로 문서 생성
- 생성 직후 Markdown 반영
- 응답으로 `workspaceBinding` 반환

### 2. import refresh 경로 보강

기존 import API는 Google 파일 id 중심으로만 동작했습니다. 이번 세션에서는 `documentId` override를 추가해, export로 연결된 로컬 문서도 같은 탭 id를 유지한 채 refresh할 수 있게 만들었습니다.

핵심 결과:

- `POST /api/workspace/import`에 `documentId` optional field 추가
- export된 문서도 import/refresh와 동일한 흐름 사용 가능
- 원격 변경 감지와 refresh 시 로컬 문서 정체성이 유지됨

### 3. 프런트 export 훅과 페이지 연결

`useWorkspaceExport`를 추가해 export 호출과 active document binding 갱신을 분리했습니다.

핵심 결과:

- export 성공 시 현재 문서가 Google Docs에 바인딩됨
- export dialog에서 입력한 제목으로 문서명을 정규화
- rich-text 문서는 최신 rendered markdown 기준으로 export/save 수행

### 4. 헤더 Google 드롭다운 정리

기존에는 `Connect Google`, `Drive Import`가 분리된 버튼이었습니다. 이번 세션에서는 이를 하나의 Google 드롭다운으로 통합했습니다.

현재 드롭다운 항목:

- `Connect Google` 또는 `Manage Connection`
- `Import from Google Drive`
- `Export to Google Docs`
- `Save to Google Docs`

### 5. 새 export dialog

Google Docs export 전에 제목을 확인하고 수정할 수 있는 전용 dialog를 추가했습니다.

## 현재 동작 방식

### 로컬 rich-text 문서

Google Workspace가 연결된 상태라면:

- Google 드롭다운에 `Export to Google Docs`가 표시됨
- export 후 현재 탭이 새 Google Docs 문서에 바인딩됨
- 이후에는 `Save to Google Docs`로 같은 문서에 다시 저장 가능

### 이미 Google에 연결된 문서

- Google 드롭다운에 `Save to Google Docs`가 표시됨
- 기존 sync 파이프라인을 계속 사용
- 원격 변경이 감지되면 conflict 상태와 refresh 흐름을 그대로 사용

### 구조화 문서

- `json`, `yaml` 문서는 이번 세션 기준으로 Google Docs export 대상이 아님

## API 변경 요약

### 신규 API

`POST /api/workspace/export`

요청 예시:

```json
{
  "documentId": "local-doc-id",
  "markdown": "# 제목\n\n본문",
  "title": "Google 문서 제목"
}
```

### 변경 API

`POST /api/workspace/import`

추가 필드:

```json
{
  "fileId": "google-doc-file-id",
  "documentId": "existing-local-doc-id"
}
```

## 수정된 주요 파일군

### 서버

- `server/modules/workspace/routes.ts`
- `server/modules/workspace/googleDocsClient.ts`
- `server/modules/workspace/googleDocsMapper.ts`

### 프런트

- `src/pages/Index.tsx`
- `src/components/editor/EditorHeader.tsx`
- `src/components/editor/WorkspaceExportDialog.tsx`
- `src/hooks/useWorkspaceExport.ts`
- `src/hooks/useWorkspaceSync.ts`
- `src/hooks/useWorkspaceChanges.ts`
- `src/lib/workspace/client.ts`
- `src/types/workspace.ts`

### 테스트

- `src/test/useWorkspaceExport.test.tsx`
- `src/test/useWorkspaceChanges.test.tsx`
- `src/test/workspaceDialogs.test.tsx`

## 검증 결과

이번 세션에서 통과한 검증:

- `npm run typecheck:server`
- `npm run build`
- `npx vitest run src/test/useWorkspaceSync.test.tsx src/test/useWorkspaceChanges.test.tsx src/test/useWorkspaceExport.test.tsx src/test/workspaceDialogs.test.tsx src/test/editorHeaderModeDropdown.test.tsx`

## 남은 제한사항

- 이번 세션은 Google Docs export를 구현한 것이지, `.docsy` 또는 `.md`를 일반 Drive 파일로 업로드하는 기능까지 포함하지는 않음
- Google Docs export는 기존 markdown-to-Google-Docs mapper 제약을 그대로 가짐
- 전체 프런트 app typecheck는 이번 변경과 무관한 기존 오류들 때문에 여전히 깨진 상태
- 실제 Google 계정으로 live validation은 아직 별도 실행 필요

## 다음 권장 작업

다음 단계는 실제 Google Workspace smoke test입니다.

1. Google 계정 연결
2. 로컬 markdown 문서를 새 Google Docs로 export
3. 로컬 수정 후 `Save to Google Docs` 검증
4. 기존 Google Docs import, refresh, conflict 흐름 검증
