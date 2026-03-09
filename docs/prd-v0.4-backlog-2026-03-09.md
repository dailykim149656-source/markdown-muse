# PRD v0.4 Backlog

## 범위

기준 PRD:

- `PRD/markdown_muse_prd_v0.4_to_v0.6.docx`

대상 범위:

- `v0.4 – Knowledge Layer Expansion`

목표:

- local knowledge index를 안정화한다.
- index lifecycle 관리 기능을 추가한다.
- image metadata indexing을 넣는다.
- retrieval 품질을 높인다.

## 현재 기반

이미 구현된 기반:

- local knowledge base MVP
  - `src/hooks/useKnowledgeBase.ts`
  - `src/lib/knowledge/knowledgeIndex.ts`
  - `src/lib/knowledge/knowledgeStore.ts`
- ingestion normalization
  - `src/lib/ingestion/normalizeIngestionRequest.ts`
- sidebar knowledge search UI
  - `src/components/editor/KnowledgeSearchPanel.tsx`
  - `src/components/editor/FileSidebar.tsx`

즉, `v0.4`는 새 시스템을 만드는 작업이 아니라 현재 knowledge layer를
운영 가능한 수준으로 올리는 작업이다.

## 우선순위

1. index lifecycle metadata와 stale detection
2. reset / rebuild / reindex UI
3. image metadata indexing
4. retrieval scoring 개선
5. 결과 grouping과 polish

## Epic A. Index Lifecycle

### KB-001 Knowledge Record Metadata 확장

우선순위:

- `P0`

목표:

- knowledge record와 knowledge store가 인덱스 상태를 추적할 수 있도록 메타데이터를 확장한다.

구현 항목:

- record metadata 추가
  - `schemaVersion`
  - `indexedAt`
  - `sourceUpdatedAt`
  - `contentHash`
  - `indexStatus`
- stale 여부 계산 로직 추가
- merge 시 더 최신 인덱스를 우선하도록 정리

주요 파일:

- `src/lib/knowledge/knowledgeIndex.ts`
- `src/lib/knowledge/knowledgeStore.ts`
- `src/types/document.ts` 필요 시 메타데이터 확장

완료 기준:

- 모든 knowledge record가 인덱스 버전과 최신성 정보를 가진다.
- source 변경 시 stale 여부를 계산할 수 있다.

테스트:

- schema version mismatch 시 stale 처리
- sourceUpdatedAt 변경 시 stale 처리
- contentHash 변경 시 stale 처리

예상 난이도:

- `M`

### KB-002 Index Reset / Rebuild API

우선순위:

- `P0`

목표:

- 사용자가 전체 knowledge index를 초기화하거나 다시 구축할 수 있게 한다.

구현 항목:

- store reset 함수 추가
- rebuild 함수 추가
- rebuild 시 현재 열려 있는 문서를 전량 재색인
- 실패 시 partial failure handling

주요 파일:

- `src/lib/knowledge/knowledgeStore.ts`
- `src/hooks/useKnowledgeBase.ts`

완료 기준:

- 전체 reset이 가능하다.
- 전체 rebuild가 가능하다.
- rebuild 후 knowledge search가 정상 동작한다.

테스트:

- reset 후 record count가 0이 됨
- rebuild 후 현재 문서 수와 knowledge record 수가 일치함

예상 난이도:

- `M`

### KB-003 Single Document Reindex

우선순위:

- `P0`

목표:

- 전체 rebuild 없이 단일 문서만 재색인할 수 있게 한다.

구현 항목:

- `reindexKnowledgeDocument(documentId)` 추가
- 문서 선택 메뉴 또는 sidebar 액션 추가
- stale 문서에 대해 재색인 CTA 제공

주요 파일:

- `src/hooks/useKnowledgeBase.ts`
- `src/components/editor/FileSidebar.tsx`
- `src/components/editor/KnowledgeSearchPanel.tsx`

완료 기준:

- 특정 문서를 선택해서 재색인할 수 있다.
- stale 문서만 빠르게 재처리할 수 있다.

테스트:

- 단일 문서 수정 후 해당 문서만 재색인됨
- 다른 문서 record는 유지됨

예상 난이도:

- `S`

### KB-004 Stale Index 표시

우선순위:

- `P0`

목표:

- stale knowledge record를 UI에서 확인할 수 있게 한다.

구현 항목:

- stale badge 또는 상태 텍스트 추가
- recent records / search results에 stale 여부 반영
- stale only filter는 2차로 미루고 우선 표시만 구현

주요 파일:

- `src/components/editor/KnowledgeSearchPanel.tsx`
- `src/components/editor/FileSidebar.tsx`
- `src/hooks/useKnowledgeBase.ts`

완료 기준:

- 사용자에게 stale 문서가 식별 가능하다.
- stale 문서에 reindex 액션이 연결된다.

테스트:

- stale record UI 표시
- fresh record는 표시되지 않음

예상 난이도:

- `S`

## Epic B. Index Management UI

### KB-005 Knowledge Index 관리 패널

우선순위:

- `P1`

목표:

- reset / rebuild / stale count를 보여주는 최소 관리 UI를 제공한다.

구현 항목:

- sidebar 하단 또는 별도 dialog에 index status panel 추가
- 표시 항목
  - indexed document count
  - stale count
  - last rebuild time
  - actions: reset / rebuild

주요 파일:

- `src/components/editor/FileSidebar.tsx`
- 신규 `src/components/editor/KnowledgeIndexPanel.tsx`
- `src/hooks/useKnowledgeBase.ts`

완료 기준:

- 사용자가 index 상태를 확인할 수 있다.
- reset / rebuild를 UI에서 실행할 수 있다.

예상 난이도:

- `S`

## Epic C. Image Metadata Indexing

### IMG-001 Ingestion Contract 확장

우선순위:

- `P1`

목표:

- normalized ingestion document가 image metadata를 담을 수 있게 한다.

구현 항목:

- image descriptor type 추가
  - `imageId`
  - `src`
  - `fileName`
  - `alt`
  - `caption`
  - `surroundingText`
  - `sectionId`
  - `documentId`
- ingestion contracts 확장

주요 파일:

- `src/lib/ingestion/contracts.ts`
- `src/lib/knowledge/knowledgeIndex.ts`

완료 기준:

- normalized document에 image metadata 배열이 존재한다.

예상 난이도:

- `M`

### IMG-002 HTML / Markdown / AsciiDoc / RST 이미지 추출

우선순위:

- `P1`

목표:

- 문서 내 image node/tag를 찾아 metadata를 추출한다.

구현 항목:

- HTML `img`
- Markdown image syntax
- AsciiDoc `image::`
- RST image/directive 기본 지원
- alt/caption/surrounding text 추출

주요 파일:

- `src/lib/ingestion/normalizeIngestionRequest.ts`

완료 기준:

- 지원 포맷의 image metadata가 normalized document에 들어간다.

테스트:

- format별 image extraction fixture 추가
- alt/caption/surrounding text 검증

예상 난이도:

- `M`

### IMG-003 Knowledge Search에 이미지 결과 추가

우선순위:

- `P1`

목표:

- 이미지 관련 검색어에서 image metadata도 결과로 노출한다.

구현 항목:

- search result 타입 확장
- image result snippet 생성
- result grouping에 `image` 추가

주요 파일:

- `src/lib/knowledge/knowledgeIndex.ts`
- `src/hooks/useKnowledgeBase.ts`
- `src/components/editor/KnowledgeSearchPanel.tsx`

완료 기준:

- 이미지 alt/caption 기반 검색이 가능하다.
- 검색 결과에서 문서/섹션/이미지를 구분해 보여준다.

예상 난이도:

- `M`

## Epic D. Retrieval Improvements

### RET-001 검색 스코어링 레이어 추가

우선순위:

- `P1`

목표:

- 현재 keyword retrieval 위에 좀 더 나은 ranking을 추가한다.

구현 항목:

- title exact match boost
- section heading match boost
- chunk text match base score
- label exact match boost
- recency boost
- stale penalty

주요 파일:

- `src/lib/retrieval/keywordRetrieval.ts`
- `src/lib/knowledge/knowledgeIndex.ts`

완료 기준:

- title/heading exact match가 일반 본문 match보다 위에 온다.
- 최근 문서가 동점일 때 더 우선된다.
- stale result는 우선순위가 낮아진다.

테스트:

- scoring order regression tests
- title match vs body match
- fresh vs stale ranking

예상 난이도:

- `M`

### RET-002 결과 그룹핑과 UI 정리

우선순위:

- `P2`

목표:

- search result를 document / section / image 기준으로 더 이해 가능하게 보여준다.

구현 항목:

- result type badge
- section title 표시
- image result 표시
- stale indicator 표시

주요 파일:

- `src/components/editor/KnowledgeSearchPanel.tsx`

완료 기준:

- 사용자가 검색 결과의 종류를 쉽게 구분할 수 있다.

예상 난이도:

- `S`

## Epic E. QA / Migration

### QA-001 Knowledge Store 마이그레이션

우선순위:

- `P1`

목표:

- 기존 knowledge record를 새 metadata schema로 안전하게 읽을 수 있게 한다.

구현 항목:

- legacy record reader
- default metadata fill
- schemaVersion 없는 record 자동 보정

주요 파일:

- `src/lib/knowledge/knowledgeStore.ts`

완료 기준:

- 기존 사용자 데이터가 손실되지 않는다.
- 구버전 record도 앱 시작 시 읽힌다.

예상 난이도:

- `M`

### QA-002 테스트 추가

우선순위:

- `P1`

구현 항목:

- knowledge lifecycle tests
- stale detection tests
- image ingestion tests
- retrieval scoring tests

주요 파일:

- `src/test/knowledgeIndex.test.ts`
- `src/test/normalizeIngestionRequest.test.ts`
- 필요 시 `src/test/knowledgeStore.test.ts` 신규 추가

완료 기준:

- `v0.4` 신규 기능에 대한 회귀 테스트가 존재한다.

예상 난이도:

- `M`

## 선행관계

- `KB-001` 선행 후 `KB-002`, `KB-003`, `KB-004`
- `IMG-001` 선행 후 `IMG-002`, `IMG-003`
- `RET-001` 선행 후 `RET-002`
- `QA-001`은 `KB-001`과 병행 가능
- `QA-002`는 각 Epic 완료 시점마다 병행 진행

## 권장 구현 순서

### Week 1

- `KB-001`
- `KB-002`
- `KB-003`
- `KB-004`

### Week 2

- `KB-005`
- `IMG-001`
- `IMG-002`
- `QA-001`

### Week 3

- `IMG-003`
- `RET-001`
- `RET-002`
- `QA-002`

## Definition of Done

`v0.4`는 아래 조건을 만족하면 완료로 본다.

- knowledge index reset / rebuild / reindex가 가능하다.
- stale index를 감지하고 UI에서 표시할 수 있다.
- image metadata가 indexing되고 검색 가능하다.
- 검색 결과 랭킹이 기존보다 개선된다.
- 기존 knowledge data를 잃지 않고 migration할 수 있다.
- 테스트가 추가되고 `npm test`가 통과한다.

## 바로 시작할 첫 작업

가장 먼저 시작할 작업은 `KB-001 Knowledge Record Metadata 확장`이다.

이 작업이 끝나야 다음 항목들이 자연스럽게 열린다.

- stale detection
- reset / rebuild / reindex
- migration
- retrieval stale penalty

즉, 첫 커밋 단위로는 다음 조합이 가장 적절하다.

- `KB-001`
- `QA-001` 일부

그 다음 커밋 단위는 아래 순서가 적당하다.

- `KB-002 + KB-003`
- `KB-004 + KB-005`
- `IMG-001 + IMG-002`
- `IMG-003 + RET-001 + RET-002`
