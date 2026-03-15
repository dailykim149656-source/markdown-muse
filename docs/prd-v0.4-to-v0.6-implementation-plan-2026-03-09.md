# PRD v0.4 to v0.6 Implementation Plan

## Historical Note

This document is a historical implementation plan from 2026-03-09.

For the current repository-state view, use:

- `docs/prd-status-check-2026-03-11.md`
- `docs/remaining-work-execution-plan-2026-03-11.md`

## 기준 문서

- `PRD/markdown_muse_prd_v0.4_to_v0.6.docx`
- 포함 범위
  - `v0.4`: Knowledge Layer Expansion
  - `v0.5`: Workspace Graph & Cross-Document AI
  - `v0.6`: Living Documentation

## 문서 목적

이 문서는 `v0.4~v0.6` PRD를 현재 코드베이스 상태에 맞춰 실제 구현 가능한
순서로 재구성한 실행 계획이다.

핵심 원칙은 다음과 같다.

- 기존 `.docsy + Document AST + reviewable patch` 구조를 유지한다.
- AI는 문서를 직접 수정하지 않고 patch review 흐름을 거친다.
- 로컬 우선(local-first), 점진적 확장(progressive enhancement) 방식으로 간다.
- 대형 미래 기능은 MVP와 장기 에픽으로 분리한다.

## 현재 코드베이스 기준점

이미 존재하는 기반:

- local knowledge base MVP
  - `src/hooks/useKnowledgeBase.ts`
  - `src/lib/knowledge/knowledgeIndex.ts`
  - `src/lib/knowledge/knowledgeStore.ts`
- ingestion normalization
  - `src/lib/ingestion/normalizeIngestionRequest.ts`
- cross-document comparison / patch 제안 기반
  - `src/lib/ai/compareDocuments.ts`
  - `src/lib/ai/suggestDocumentUpdates.ts`
- patch review / patch apply
  - `src/hooks/usePatchReview.ts`
  - `src/lib/patches/`
- structured patch MVP
  - `src/lib/patches/applyStructuredPatchSet.ts`

즉, `v0.4~v0.6`은 완전히 새 제품을 만드는 것이 아니라 현재 기반 위에
knowledge, graph, health/impact layer를 확장하는 작업으로 보는 것이 맞다.

## 전체 우선순위

1. `v0.4`를 먼저 완성한다.
2. `v0.5`는 graph storage와 graph panel MVP부터 만든다.
3. `v0.5`의 cross-document AI는 선택된 문서 집합 기반으로 시작한다.
4. `v0.6`은 자동화보다 `Document Health`와 `Dependency Tracking`을 먼저 만든다.
5. 마지막으로 수동 change detection과 AI update suggestion orchestration을 붙인다.

## v0.4 Implementation Plan

### 목표

로컬 knowledge system을 안정화하고 ingestion/indexing 범위를 확장한다.

### 구현 범위

- knowledge index lifecycle management
- reset / rebuild / reindex document
- stale index detection
- image ingestion and metadata indexing
- section/chunk retrieval quality 개선

### 세부 계획

#### Phase 1. Index Lifecycle Tools

구현 항목:

- knowledge index metadata 저장
  - `schemaVersion`
  - `indexedAt`
  - `sourceUpdatedAt`
  - `contentHash`
  - `indexStatus`
- 전체 reset 기능
- 전체 rebuild 기능
- 단일 문서 reindex 기능
- stale index detection
  - 문서 `updatedAt`
  - source snapshot hash
  - ingestion schema version

필요 변경:

- `src/lib/knowledge/knowledgeStore.ts`
- `src/lib/knowledge/knowledgeIndex.ts`
- `src/hooks/useKnowledgeBase.ts`
- sidebar 또는 settings 영역에 index 관리 UI 추가

완료 기준:

- 사용자가 로컬 knowledge index를 초기화할 수 있다.
- 사용자가 전체 rebuild를 실행할 수 있다.
- 문서별 재색인이 가능하다.
- 오래된 인덱스를 UI에서 표시할 수 있다.

#### Phase 2. Image Ingestion

구현 항목:

- 지원 포맷
  - `png`
  - `jpg`
  - `jpeg`
  - `svg`
  - `webp`
- 추출 메타데이터
  - filename
  - alt text
  - caption
  - surrounding text
  - document reference

실행 방식:

- 우선 document 내 image node / image tag 기준으로 metadata index를 만든다.
- 파일 시스템에서 독립 이미지 파일을 직접 knowledge document로 다루는 것은 2차로 미룬다.
- image binary analysis는 하지 않고 문서 맥락 기반 metadata indexing만 우선한다.

필요 변경:

- `normalizeIngestionRequest`에 image metadata extraction 추가
- knowledge record에 images 컬렉션 추가
- search 결과에 image hit 표시 추가

완료 기준:

- 문서 내 이미지가 metadata 단위로 검색 가능하다.
- 이미지가 어떤 문서/섹션 문맥에 속하는지 추적 가능하다.

#### Phase 3. Retrieval Improvements

구현 항목:

- section title match 가중치
- chunk text match 가중치
- recency 가중치
- exact label / heading match 가중치
- result grouping
  - document
  - section
  - image

실행 방식:

- 현재 keyword retrieval 위에 scoring layer를 추가한다.
- vector retrieval DB 도입은 이 단계에서 하지 않는다.
- 먼저 heuristic scoring으로 품질을 올린다.

완료 기준:

- 같은 검색어에서도 title/section 일치 결과가 상위에 올라온다.
- 최근 문서와 정확 일치 section이 더 우선된다.
- 검색 결과가 document/section/image 기준으로 더 해석 가능해진다.

### v0.4 최종 산출물

- stable local knowledge index
- index lifecycle UI
- image metadata indexing
- improved section/chunk retrieval

## v0.5 Implementation Plan

### 목표

문서 간 관계를 시각화하고, 문서 집합 단위 AI 분석을 지원한다.

### 구현 범위

- workspace graph visualization
- graph storage model
- cross-document consistency analysis
- cross-document patch suggestion

### 구현 원칙

- 처음부터 full knowledge graph를 만들지 않는다.
- graph editing 기능은 넣지 않는다.
- `document`, `section`, `image` 노드부터 시작한다.
- `concept` node는 AI enrichment 2차 단계로 미룬다.

### 세부 계획

#### Phase 1. Graph Visualization MVP

구현 항목:

- graph node types
  - `document`
  - `section`
  - `image`
- graph edge types
  - `references`
  - `includes`
  - `similar_to`
  - `duplicate`

UI:

- `Workspace Graph Panel`
- `Knowledge Explorer`

실행 방식:

- knowledge index에서 relation candidates를 만든다.
- relation은 우선 heuristic 기반으로 생성한다.
  - cross reference
  - label target
  - shared section titles
  - duplicate chunk similarity
- graph panel은 read-only visualization부터 시작한다.

권장 구현:

- graph data model을 local knowledge store와 함께 저장
- visualization library는 가벼운 범위에서 선택
- patch review처럼 core editing path와는 느슨하게 연결

완료 기준:

- 문서/섹션/이미지 관계를 시각적으로 탐색할 수 있다.
- 문서 간 reference, include, similarity를 확인할 수 있다.

#### Phase 2. AI Graph Enrichment

구현 항목:

- `concept` node 후보 생성
- `depends_on`
- `conflicts_with`
- `similar_to` 품질 보강

실행 방식:

- 자동 전체 생성보다 선택 문서 집합 기반 enrichment로 시작한다.
- AI가 생성한 edge도 직접 확정하지 않고 suggestion 상태로 둔다.
- 고신뢰 heuristic edge와 저신뢰 AI edge를 구분한다.

완료 기준:

- graph에 AI가 제안한 개념/충돌/의존 관계를 보강할 수 있다.
- 사용자가 heuristic edge와 AI edge를 구분할 수 있다.

#### Phase 3. Cross-Document Consistency Analysis

구현 항목:

- parameter mismatch
- duplicate procedures
- missing warnings
- conflicting instructions
- broken references

UI:

- `Consistency Issues Panel`

실행 방식:

- 초기 범위는 "선택한 문서들"에 한정한다.
- 현재 `compareDocuments`와 `suggestDocumentUpdates` 로직을 재사용한다.
- 결과는 issue list + patch suggestion으로 분리해서 보여준다.
- 패치는 기존 Patch Review로 연결한다.

완료 기준:

- 문서 집합 단위 consistency analysis를 실행할 수 있다.
- 이슈 목록과 patch suggestion이 분리되어 제시된다.
- 제안 변경은 Patch Review를 거쳐 적용된다.

### v0.5 최종 산출물

- workspace graph MVP
- consistency issues panel
- cross-document analysis flow
- graph-enriched knowledge workspace

## v0.6 Implementation Plan

### 목표

문서를 변경 감지와 영향 분석이 가능한 living documentation system으로 확장한다.

### 구현 범위

- document health checks
- dependency tracking
- change monitoring
- AI update suggestion orchestration

### 구현 원칙

- 완전 자동 self-maintaining system으로 바로 가지 않는다.
- 반드시 `detect -> analyze -> suggest -> review -> apply` 흐름을 유지한다.
- 자동 감시보다 수동 트리거형 MVP를 먼저 만든다.

### 세부 계획

#### Phase 1. Document Health Panel

구현 항목:

- outdated documents
- broken references
- missing sections
- conflicting procedures

UI:

- `Document Health Panel`

실행 방식:

- health rule은 heuristic + existing graph/knowledge data로 계산한다.
- rules는 deterministic한 것부터 시작한다.
  - broken cross reference
  - missing linked target
  - duplicate/conflicting section title candidates
  - stale indexed document

완료 기준:

- 문서별 health issue를 패널에서 확인할 수 있다.
- 자동으로 고칠 수 없는 항목도 최소한 진단 가능하다.

#### Phase 2. Dependency Tracking

구현 항목:

- graph-based dependency mapping
- impact chain 탐지

실행 방식:

- `depends_on`, `references`, `includes` edge를 이용해 dependency chain을 계산한다.
- 처음에는 문서 수준과 section 수준까지만 추적한다.
- concept-level dependency는 2차로 미룬다.

완료 기준:

- 특정 source가 바뀌면 어떤 문서/섹션이 영향받는지 계산할 수 있다.
- impact chain을 panel에서 볼 수 있다.

#### Phase 3. Change Monitoring MVP

구현 항목:

- workspace documents
- imported documents
- API specs
- configuration files
- repository files

실행 방식:

- 자동 파일 watcher보다 `manual rescan`으로 먼저 시작한다.
- 입력 source별 connector를 단계적으로 추가한다.
  - workspace document refresh
  - imported file refresh
  - JSON/YAML/API spec snapshot compare
  - repository file compare

완료 기준:

- 사용자가 source rescan을 실행할 수 있다.
- 이전 snapshot과 현재 snapshot 차이를 기록할 수 있다.

#### Phase 4. AI Update Suggestions

구현 항목:

- change impact analysis
- impacted docs selection
- AI patch suggestion generation
- patch review handoff

실행 방식:

- source change 감지 결과와 dependency graph를 합쳐 영향 대상을 찾는다.
- 영향 문서별로 기존 `suggestDocumentUpdates` 흐름을 재사용한다.
- living documentation도 결국 기존 Patch Review 파이프라인으로 수렴시킨다.

완료 기준:

- source change 이후 영향받는 문서를 자동 제안할 수 있다.
- 해당 문서들에 대한 AI patch suggestion을 생성할 수 있다.
- 사용자는 review 후 적용할 수 있다.

### v0.6 최종 산출물

- document health panel
- dependency tracking
- manual change monitoring MVP
- impact-based AI update suggestions

## 권장 구현 순서

### Step 1. v0.4 완료

- knowledge lifecycle metadata
- reset / rebuild / reindex
- stale detection
- image indexing
- retrieval scoring 개선

### Step 2. v0.5 Graph MVP

- graph storage model
- graph panel
- knowledge explorer
- heuristic edge extraction

### Step 3. v0.5 Cross-Document AI

- consistency issues panel
- selected-doc analysis
- patch suggestion handoff

### Step 4. v0.6 Health / Dependency

- document health checks
- dependency tracking
- impact chain visualization

### Step 5. v0.6 Change Monitoring

- manual rescan
- source snapshot diff
- AI update orchestration

## 구현 가능성과 난이도

### 바로 구현 가능한 항목

- knowledge index lifecycle management
- stale detection
- image metadata indexing
- retrieval scoring 개선
- graph storage model
- graph panel read-only MVP
- selected-doc consistency analysis
- document health panel
- dependency tracking
- manual change rescan

### 구현 난도가 높은 항목

- concept node 자동 생성
- `conflicts_with`와 duplicate procedure의 고정밀 판정
- 외부 API spec / repo file 자동 연결
- 완전 자동 change monitoring
- self-maintaining documentation 자동 적용

이 항목들은 초기 MVP에 넣으면 복잡도와 오탐률이 크게 올라간다.

## 비권장 접근

- graph를 처음부터 collaborative editable canvas로 만드는 것
- AI가 생성한 relation이나 patch를 자동 적용하는 것
- vector DB와 remote retrieval을 v0.4 단계에서 바로 도입하는 것
- living documentation을 watcher 기반 완전자동 시스템으로 바로 가는 것

## 권장 성공 기준

### v0.4 성공 기준

- 인덱스가 관리 가능하고 안정적이다.
- 검색 품질이 체감 개선된다.
- 이미지도 knowledge 대상에 포함된다.

### v0.5 성공 기준

- 문서 집합을 graph와 issues panel로 탐색할 수 있다.
- cross-document inconsistency를 patch reviewable action으로 전환할 수 있다.

### v0.6 성공 기준

- 변경 감지와 영향 분석이 가능하다.
- outdated / broken / conflicting 상태를 health panel에서 보여줄 수 있다.
- living documentation 흐름이 patch review 중심으로 동작한다.

## 최종 정리

`v0.4~v0.6`의 핵심은 완전히 새로운 시스템으로 점프하는 것이 아니라,
현재 구현된 knowledge index, comparison, patch review, structured patch 기반을
확장해서 다음 단계로 올리는 것이다.

가장 현실적인 순서는 다음과 같다.

1. `v0.4`로 knowledge layer를 안정화한다.
2. `v0.5`로 graph와 cross-document AI를 얹는다.
3. `v0.6`로 health, dependency, change impact를 연결한다.

이 순서를 따르면 현재 코드 구조를 유지하면서 PRD가 원하는
`knowledge workspace -> graph workspace -> living documentation platform`
방향으로 자연스럽게 확장할 수 있다.
