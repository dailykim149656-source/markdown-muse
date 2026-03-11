# Codex Task List for Docsy
Date: 2026-03-11

## 사용 방법
아래 항목을 Codex에 한 번에 하나씩 맡기는 것을 권장합니다.
각 작업은 독립 PR 단위로 나뉘어 있습니다.

## PR-01: Initialize backend scaffold
Goal: Create an Express + TypeScript backend scaffold for Docsy.
Acceptance Criteria:
- npm run dev starts server
- GET /health returns 200

## PR-02: Add PostgreSQL migrations
Goal: Implement database schema from schema_postgres.sql.
Acceptance Criteria:
- migrations run successfully
- seed inserts demo user

## PR-03: Implement workspace auth stub
Goal: Create Google OAuth endpoints with service abstraction.
Acceptance Criteria:
- callback stores connection row
- tokens are passed through encryption utility stub

## PR-04: Implement Drive import flow
Goal: Import a Google Drive file and create a document snapshot.
Acceptance Criteria:
- import endpoint writes documents row
- import endpoint writes document_snapshots row

## PR-05: Implement analysis issue creation
Goal: Create consistency analysis stub.
Acceptance Criteria:
- request creates issue rows
- response includes issue ids

## PR-06: Implement patch generation and review
Goal: Generate patches for issues and review them.
Acceptance Criteria:
- accepted patch changes status
- rejected patch changes status
- review rows are persisted

## PR-07: Implement Google Docs apply stub
Goal: Apply only accepted patches.
Acceptance Criteria:
- draft patch apply fails
- accepted patch apply succeeds
- applied patch status updates

## PR-08: Implement sync scan
Goal: Scan Drive changes and create sync events.
Acceptance Criteria:
- sync scan creates sync events
- sync status returns last token

## PR-09: Add comment creation stub
Goal: Create Google Docs comments for accepted patches.
Acceptance Criteria:
- endpoint persists workspace comment row

## PR-10: Add zod validation
Goal: Add request validation to all endpoints.
Acceptance Criteria:
- invalid requests return 400
- error payload is consistent
