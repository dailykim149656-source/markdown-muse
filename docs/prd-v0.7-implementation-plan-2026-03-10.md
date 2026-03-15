# PRD v0.7 Implementation Plan

## Historical Note

This document is a historical implementation plan from an earlier roadmap stage.

For the current repository-state view, use:

- `docs/prd-status-check-2026-03-11.md`
- `docs/remaining-work-execution-plan-2026-03-11.md`

Date: 2026-03-10

## 기준

- `PRD/markdown_muse_prd_v0.7.docx`
- `docs/prd-v0.4-to-v0.6-implementation-plan-2026-03-09.md`
- `docs/remaining-large-epics-post-v0.6-2026-03-09.md`

이 문서는 `v0.6 foundation`이 완료된 현재 상태를 기준으로, `v0.5`에서
의도적으로 뒤로 미뤄둔 graph/consistency/productization 영역을 `v0.7`에서
실행 가능한 범위로 재구성한 계획이다.

## 현재 기준선

이미 구현된 범위:

- local knowledge index lifecycle
- image-aware ingestion and retrieval
- workspace graph data model and heuristic relations
- consistency issue detection
- document health and impact panels
- manual rescan based change monitoring
- impact-based AI patch suggestion handoff

즉, `v0.7`의 핵심은 새로운 지식 레이어를 만드는 것이 아니라,
이미 계산 가능한 graph/issue/impact 데이터를 더 잘 보이게 만들고,
더 짧은 사용자 action path로 연결하는 것이다.

## v0.7 목표

`v0.7`은 다음 네 가지를 제품화하는 단계로 정의한다.

1. graph를 패널 요약에서 전용 시각화 경험으로 확장한다.
2. consistency issue에서 patch suggestion까지의 경로를 단축한다.
3. dependency/impact 설명력을 높여 change reasoning을 강화한다.
4. AI graph enrichment는 optional overlay로 제한적으로 도입한다.

## 범위

### 포함

- graph visualization UI
- graph filters, search, node inspection
- issue to action workflow
- stronger dependency path explanation
- AI-enriched relation overlay MVP

### 제외

- automatic patch apply
- always-on file watcher
- full repository sync platform
- collaboration / multi-user editing
- production-grade semantic retrieval overhaul

## 설계 원칙

- 기존 `detect -> analyze -> suggest -> review -> apply` 흐름을 유지한다.
- heuristic graph를 기본 레이어로 유지하고 AI inference는 overlay로 추가한다.
- AI가 만든 relation은 항상 confidence와 provenance를 보여준다.
- 큰 graph는 처음부터 전부 렌더링하지 않고 필터와 축약 규칙을 먼저 둔다.
- issue 해결은 대량 자동화보다 단일 대상 문서 중심으로 시작한다.

## Work Package 1. Graph UI Productization

### 목표

현재 `WorkspaceGraphPanel`의 요약형 탐색을 전용 graph surface로 확장한다.

### 구현 범위

- dedicated graph route or large panel
- pan / zoom / node focus
- node kind filter
  - `document`
  - `section`
  - `image`
- edge group filter
  - `containment`
  - `reference`
  - `similarity`
- graph search
- node inspection drawer
- source document open action

### 구현 방향

- 초기 렌더는 `workspaceInsights`의 existing graph model을 그대로 사용한다.
- full editable canvas는 넣지 않는다.
- workspace가 커질수록 다음 규칙으로 축약한다.
  - low-weight edge hide
  - duplicate edge grouping
  - node count threshold above summary mode

### 필요 변경

- `src/lib/knowledge/workspaceInsights.ts`
- `src/components/editor/WorkspaceGraphPanel.tsx`
- `src/components/editor/FileSidebar.tsx`
- `src/pages/Index.tsx`
- 신규 graph surface component 추가

### 완료 기준

- 사용자가 문서/섹션/이미지 관계를 더 큰 시각화 surface에서 탐색할 수 있다.
- node를 선택하면 연결, issue, source open action을 한 곳에서 볼 수 있다.
- medium sized workspace에서도 기본 가독성이 유지된다.

## Work Package 2. Consistency to Action

### 목표

Consistency issue 발견에서 patch generation까지의 단계 수를 줄인다.

### 구현 범위

- issue category별 `Suggest fixes` action
- single-target patch generation flow
- issue source context and impacted document context 표시
- issue -> AI suggestion -> Patch Review handoff 강화

### 구현 방향

- 초기는 `one issue -> one target document` 흐름으로 제한한다.
- 다건 일괄 patch orchestration은 `v0.7` 후반 또는 차기 단계로 넘긴다.
- duplicate / conflict / broken reference에 대해 actionability가 높은 항목부터 지원한다.

### 필요 변경

- `src/lib/knowledge/consistencyAnalysis.ts`
- `src/components/editor/ConsistencyIssuesPanel.tsx`
- `src/hooks/useKnowledgeBase.ts`
- 기존 AI suggestion hook integration

### 완료 기준

- issue card에서 직접 patch suggestion으로 이동할 수 있다.
- 사용자는 suggestion의 원인이 된 issue와 source provenance를 확인할 수 있다.
- Patch Review에서 causal chain을 잃지 않는다.

## Work Package 3. Dependency Semantics Upgrade

### 목표

현재 dependency/impact path를 더 설명 가능하고 신뢰 가능하게 만든다.

### 구현 범위

- stronger dependency inference
- section-level impact reasoning refinement
- path explanation improvements
- false-positive reduction rules
- impact summary prioritization

### 구현 방향

- existing `references`, `containment`, `similarity` edge 위에
  dependency scoring layer를 추가한다.
- `depends_on`을 바로 first-class stored edge로 만들기보다,
  deterministic evidence 기반 derived relation으로 먼저 계산한다.
- impact path는 "왜 이 문서가 영향 대상인지"를 문장형 설명으로 보여준다.

### 필요 변경

- `src/lib/knowledge/workspaceInsights.ts`
- `src/components/editor/DocumentImpactPanel.tsx`
- `src/components/editor/ChangeMonitoringPanel.tsx`
- `src/hooks/useKnowledgeBase.ts`

### 완료 기준

- impact panel에서 relation count뿐 아니라 영향 이유를 설명할 수 있다.
- false positive가 많은 similarity-only impact는 기본 우선순위에서 낮아진다.
- change monitoring queue가 더 설득력 있는 순서로 정렬된다.

## Work Package 4. AI Graph Enrichment

### 목표

heuristic graph 위에 low-risk AI enrichment overlay를 추가한다.

### 구현 범위

- `concept` candidate node
- `depends_on` candidate relation
- `conflicts_with` candidate relation
- confidence and provenance label
- heuristic edge와 AI edge의 시각적 구분

### 구현 방향

- automatic global enrichment는 하지 않는다.
- selected documents or filtered subgraph 기반으로만 실행한다.
- AI edge는 stored graph의 primary truth가 아니라 suggestion overlay로 다룬다.
- low confidence edge는 기본 숨김 상태로 둔다.

### 필요 변경

- 신규 AI enrichment module
- `src/lib/knowledge/workspaceInsights.ts`
- graph UI presentation layer
- i18n labels and explanation copy

### 완료 기준

- 사용자가 heuristic graph와 AI graph overlay를 분리해서 볼 수 있다.
- AI가 제안한 relation은 confidence와 provenance를 확인할 수 있다.
- low confidence relation이 기본 graph readability를 해치지 않는다.

## 권장 구현 순서

### Step 1. Graph UI Productization

가장 먼저 해야 한다.
현재 부족한 것은 계산보다 시각화와 탐색 UX이기 때문이다.

### Step 2. Consistency to Action

이슈가 보여도 action path가 길면 제품 가치가 낮다.
따라서 issue -> patch suggestion 연결을 바로 붙인다.

### Step 3. Dependency Semantics Upgrade

graph와 action path가 생긴 뒤에 reasoning 품질을 올린다.
이 단계에서 change impact의 설명력을 보강한다.

### Step 4. AI Graph Enrichment

가장 나중에 한다.
AI inference는 가장 쉽게 신뢰 문제를 만들기 때문이다.

## 세부 마일스톤

### Milestone A

- 전용 graph UI
- graph search / filter
- node inspection

### Milestone B

- consistency issue action buttons
- single-target patch generation handoff
- issue provenance exposure

### Milestone C

- stronger impact explanation
- impact queue prioritization
- dependency reasoning refinement

### Milestone D

- selected-scope AI enrichment
- confidence / provenance overlay
- heuristic vs AI relation distinction

## 성공 기준

### Product

- 사용자가 graph를 "요약 숫자"가 아니라 탐색 가능한 작업 공간으로 느낄 수 있다.
- consistency issues가 더 직접적으로 reviewable action으로 이어진다.
- impact reasoning이 숫자 나열보다 설명 가능한 형태가 된다.

### Engineering

- graph UI는 medium workspace에서 usable해야 한다.
- AI overlay는 base graph UX를 망치지 않아야 한다.
- patch review safety contract는 유지되어야 한다.

## 비권장 접근

- full graph canvas를 먼저 만들고 필터를 나중에 붙이는 것
- AI relation을 heuristic relation과 동일한 신뢰도로 다루는 것
- multi-document automatic patch batching을 초기에 넣는 것
- low-confidence graph inference를 기본 visible state로 노출하는 것

## 최종 정리

`v0.7`의 핵심은 knowledge workspace를 더 크게 만드는 것이 아니다.
이미 존재하는 graph, issue, impact 계산을 사용자에게 더 잘 보이게 하고,
더 바로 행동할 수 있게 만드는 것이다.

즉, `v0.7`은 다음 흐름을 강화하는 단계다.

`see graph -> understand issue -> inspect impact -> generate patch -> review`
