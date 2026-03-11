# Docsy Codex Implementation Brief
Date: 2026-03-11

## 목적
이 문서는 Codex가 바로 구현 작업에 들어갈 수 있도록, 구현 우선 정보로 정리한 실행 브리프입니다.

## 중요한 전제
- Google Drive는 원문 문서 저장소입니다.
- 앱의 상태 저장은 PostgreSQL 기준으로 설계합니다.
- 관계 분석, patch 상태, issue 상태, sync 상태는 앱 DB에 저장합니다.

## 권장 배포 구조
- Frontend: React / Vite
- Backend: Node.js + Express
- DB: PostgreSQL
- External APIs:
  - Google Drive API
  - Google Docs API
  - Gemini analysis service

## Codex가 먼저 해야 할 일
1. PostgreSQL schema 생성
2. Express API scaffold 생성
3. Google OAuth route stub 생성
4. Drive import route stub 생성
5. document snapshot 저장 로직 생성
6. analysis issue / patch / review CRUD 생성
7. Google Docs batchUpdate apply stub 생성
8. Drive sync worker stub 생성

## 구현 우선순위
### P0
- users
- workspace_connections
- documents
- document_snapshots
- analysis_issues
- patches
- patch_reviews

### P1
- document_relationships
- issue_related_documents
- sync_states
- sync_events
- workspace_comments

## 핵심 도메인 규칙
### Document
- 한 개의 Google Drive/Docs 파일은 여러 snapshot을 가질 수 있음
- 최신 snapshot이 분석 기준이 됨

### Analysis Issue
- issue는 source_document_id를 반드시 가짐
- 관련 문서는 별도 join table로 연결
- status는 open / resolved / dismissed

### Patch
- patch는 하나의 issue에 종속
- patch status:
  - draft
  - accepted
  - rejected
  - applied

### Review-first workflow
- patch는 자동 반영 금지
- accepted 상태여야 apply 가능
- apply 시 source revision id를 비교해야 함

## API 우선순위
### 1차 구현
- POST /api/auth/google/connect
- GET /api/auth/google/callback
- GET /api/workspace/drive/files
- POST /api/workspace/import
- POST /api/documents/analyze
- POST /api/patches/generate
- POST /api/patches/:patchId/review
- POST /api/patches/:patchId/apply-google-docs
- POST /api/workspace/sync/scan

### 2차 구현
- POST /api/documents/impact-analysis
- POST /api/workspace/comments/create
- GET /api/workspace/sync/status

## 구현 원칙
- 모든 외부 API 호출은 service layer로 분리
- controller는 validation + orchestration만 담당
- DB access는 repository layer로 분리
- Google API token은 절대 평문 저장 금지
- migration 파일 분리
- OpenAPI spec 우선 작성 후 route 구현

## 폴더 구조 제안
server/
  src/
    app.ts
    routes/
      auth.routes.ts
      workspace.routes.ts
      documents.routes.ts
      patches.routes.ts
      sync.routes.ts
    controllers/
    services/
      google/
        drive.service.ts
        docs.service.ts
      analysis/
        analysis.service.ts
        patch.service.ts
      sync/
        sync.service.ts
    repositories/
    db/
      migrations/
      schema/
    types/
    middleware/
    utils/

## Codex에 줄 작업 프롬프트 예시
### Prompt 1
Create PostgreSQL migrations for the Docsy workspace integration schema.
Include users, workspace_connections, documents, document_snapshots,
analysis_issues, issue_related_documents, patches, patch_reviews,
document_relationships, workspace_comments, sync_states, and sync_events.
Use UUID primary keys, created_at/updated_at timestamps where relevant,
indexes on foreign keys, and CHECK constraints for enum-like status fields.

### Prompt 2
Create an Express TypeScript backend scaffold for Docsy with route modules for:
auth, workspace, documents, patches, and sync.
Use zod for request validation and organize the project with controllers,
services, and repositories.

### Prompt 3
Implement a Google Docs patch apply service stub that accepts a patch record,
maps patch operations into Google Docs batchUpdate requests, and validates that
the patch status is accepted before apply.

## Definition of Done
- migrations 실행 가능
- dev server 기동 가능
- health endpoint 동작
- import endpoint가 stub라도 DB에 snapshot 저장
- patch review 상태 전이 동작
- apply-google-docs endpoint가 status validation 수행
