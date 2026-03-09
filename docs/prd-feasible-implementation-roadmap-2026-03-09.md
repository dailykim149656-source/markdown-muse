# PRD 구현 가능 항목 실행 문서

Version: `v0.1`  
Date: `2026-03-09`

## 1. 목적

이 문서는 현재 `markdown-muse` 코드베이스를 기준으로,
PRD 방향성과 정합성이 높고 실제로 구현 가능한 항목만 골라 실행 문서로 정리한 것이다.

정리 기준은 다음과 같다.

- 이미 존재하는 도메인 코드나 UI 구조를 재사용할 수 있을 것
- 현재 아키텍처를 깨지 않고 점진적으로 붙일 수 있을 것
- PRD의 핵심 축인 `.docsy`, `Document AST`, `reviewable patch`, `AI-assisted workflow`와 직접 연결될 것
- 대규모 외부 인프라 없이는 성립하지 않는 항목은 제외하거나 후순위로 둘 것

## 2. 현재 전제

현재 코드베이스에는 다음 기반이 이미 존재한다.

- 멀티포맷 편집기와 `.docsy` 저장/복원
- `Document AST` 직렬화/복원/렌더링
- patch schema, patch review UI, patch apply 엔진
- 기본 ingestion 정규화와 keyword retrieval
- AI 요약, 문서 비교, 섹션 생성의 일부 UI/서버 경로
- JSON/YAML 구조 편집기와 schema validation

즉, 다음 단계는 기반 설계보다도 기존 축을 제품 기능으로 마감하는 작업에 가깝다.

## 3. 우선 구현 권장 항목

### A. AI 워크플로 마감

상태:
- `Ready`

목표:
- PRD에 적힌 AI 기능을 현재 patch review 흐름 안으로 실제 사용자 기능으로 완성한다.

현재 기반:
- `src/hooks/useAiAssistant.ts`
- `src/components/editor/AiAssistantDialog.tsx`
- `src/lib/ai/compareDocuments.ts`
- `src/lib/ai/sectionGeneration.ts`
- `src/lib/ai/procedureExtraction.ts`
- `src/lib/ai/suggestDocumentUpdates.ts`
- `server/aiServer.ts`

구현 범위:
- AI 다이얼로그에 `절차 추출` 액션 추가
- AI 다이얼로그에 `업데이트 제안` 액션 추가
- 절차 추출 결과를 읽기 전용 아티팩트 또는 삽입 가능한 patch로 노출
- 업데이트 제안 결과를 기존 patch review로 연결
- summary 결과의 attribution을 UI에 표시
- patch review에서 source count만이 아니라 source detail을 확인 가능하게 확장

완료 기준:
- 사용자가 UI에서 요약, 비교, 섹션 생성, 절차 추출, 업데이트 제안을 모두 실행할 수 있다
- 문서 변경 계열 기능은 직접 overwrite하지 않고 patch review를 반드시 거친다
- 각 AI 결과에는 최소한 chunk/section 수준의 근거가 표시된다

난도:
- `낮음~중간`

### B. Patch Review UX 개선

상태:
- `Ready`

목표:
- 현재 존재하는 patch review를 PRD 수준의 신뢰 가능한 검토 UX로 끌어올린다.

현재 기반:
- `src/components/editor/PatchReviewDialog.tsx`
- `src/components/editor/PatchReviewPanel.tsx`
- `src/hooks/usePatchReview.ts`
- `src/lib/patches/reviewPatchSet.ts`

구현 범위:
- patch별 원문/제안문 diff 가독성 개선
- patch source attribution 상세 표시
- patch conflict 및 precondition 실패 이유를 더 구체적으로 표기
- 여러 patch를 섹션 단위로 묶어 보여주는 grouped review
- patch 적용 후 무엇이 반영되었는지 결과 요약 표시

완료 기준:
- 사용자가 patch 단위 변경 이유와 근거를 바로 확인할 수 있다
- 적용 실패 시 어떤 patch가 왜 실패했는지 UI에서 식별 가능하다
- 대량 patch set도 탐색 가능할 정도로 패널 가독성이 확보된다

난도:
- `낮음~중간`

### C. 로컬 Knowledge Layer MVP

상태:
- `Ready`

목표:
- PRD의 “문서를 구조화된 지식으로 관리”하는 방향을, 로컬 우선 MVP로 현실화한다.

현재 기반:
- `src/lib/ingestion/contracts.ts`
- `src/lib/ingestion/normalizeIngestionRequest.ts`
- `src/lib/retrieval/keywordRetrieval.ts`
- `src/lib/retrieval/semanticChunkSchema.ts`
- `src/lib/retrieval/vectorStore.ts`

구현 범위:
- 정규화된 ingestion 결과를 `IndexedDB`에 저장
- 문서 import/open/save 시 인덱스 갱신
- 문서/섹션/chunk 단위 검색 UI 추가
- 검색 결과에서 원문 문서와 섹션으로 이동하는 기본 플로우 추가
- source file metadata를 `.docsy`와 연결해 provenance를 강화

완료 기준:
- 현재 세션 문서만이 아니라 로컬에 인덱싱된 문서를 대상으로 검색 가능하다
- 문서를 다시 열어도 인덱스가 유지된다
- AI 기능이 활성 문서 외 다른 인덱싱 문서도 grounding source로 사용할 수 있는 기반이 생긴다

난도:
- `중간`

설계 메모:
- 이 단계에서는 `SQLite`보다 `IndexedDB`가 현실적이다
- semantic retrieval은 후속 단계로 두고, 우선 keyword/section retrieval을 영속화하는 편이 낫다

### D. AsciiDoc / RST ingestion 확장

상태:
- `Ready`

목표:
- PRD에 명시된 입력 포맷 지원을 단순 import 수준이 아니라 분석 가능한 ingestion 수준으로 끌어올린다.

현재 기반:
- `src/components/editor/utils/asciidocToHtml.ts`
- `src/components/editor/utils/rstToHtml.ts`
- `src/lib/ingestion/normalizeIngestionRequest.ts`

구현 범위:
- AsciiDoc heading/metadata/labels 정규화
- RST heading/metadata/labels 정규화
- section path와 chunk 생성 로직을 Markdown/HTML/LaTeX와 유사한 수준으로 보강
- 관련 regression test 추가

완료 기준:
- `.adoc`, `.asciidoc`, `.rst` 문서도 section/chunk/metadata를 가진 normalized document로 변환된다
- retrieval과 AI grounding에서 fallback plain text가 아닌 section-aware 데이터를 사용한다

난도:
- `중간`

### E. Structured Data Patch MVP

상태:
- `Conditional`

목표:
- JSON/YAML 문서도 PRD 방향성에 맞게 reviewable patch 대상으로 올린다.

현재 기반:
- `src/components/editor/JsonYamlEditor.tsx`
- `src/components/editor/SchemaValidator.tsx`
- `src/types/documentAst.ts`
- `src/lib/docsy/fileFormat.ts`

현재 제약:
- `structured_path` target 타입은 정의되어 있지만 rich-text patch 엔진은 이를 지원하지 않는다
- AI/patch review는 현재 rich text 문서 전용이다

구현 범위:
- structured data 전용 patch apply 엔진 추가
- `structured_path` 기반 `update`, `insert`, `delete` 최소 연산 지원
- JSON/YAML patch review UI 분기 추가
- schema-aware field suggestion과 patch preview 연결
- 초기 단계에서는 deterministic suggestion 위주로 제한

완료 기준:
- JSON/YAML 문서에서 key path 기반 patch review/apply가 가능하다
- schema validation과 patch 적용이 서로 충돌하지 않는다
- AI 연결 전에도 사용자 또는 deterministic rule 기반 patch가 동작한다

난도:
- `중간~높음`

설계 메모:
- 이 항목은 구현 가능하지만 rich text 계열보다 리스크가 높다
- 별도 엔진으로 두고, 기존 rich-text AST patch 엔진과 혼합하지 않는 편이 안전하다

### F. 번들 분할 및 런타임 최적화

상태:
- `Ready`

목표:
- 현재 빌드 경고를 줄이고 대형 기능 로딩 비용을 낮춘다.

현재 기반:
- `npm run build`는 통과하지만 main chunk 경고가 남아 있다

구현 범위:
- 대형 다이얼로그 lazy loading
- Mermaid 관련 무거운 경로 dynamic import 적용
- editor 외 영역과 export 관련 경로의 manual chunk 분리
- 필요 시 route-level 분리 강화

완료 기준:
- 메인 번들 크기가 유의미하게 감소한다
- 초기 에디터 진입 속도가 개선된다
- 기능 회귀 없이 production build 경고가 완화된다

난도:
- `중간`

## 4. 권장 실행 순서

### 1단계

- AI 워크플로 마감
- Patch Review UX 개선

이유:
- 이미 있는 코드를 가장 짧은 경로로 제품 가치로 전환할 수 있다
- PRD의 핵심 차별점인 `AI -> reviewable patch`를 가장 빠르게 강화한다

### 2단계

- 로컬 Knowledge Layer MVP
- AsciiDoc / RST ingestion 확장

이유:
- grounding source의 범위가 넓어져 AI 품질과 문서 검색성이 같이 개선된다
- PRD의 “structured knowledge” 방향과도 가장 자연스럽게 이어진다

### 3단계

- Structured Data Patch MVP
- 번들 분할 및 최적화

이유:
- JSON/YAML patching은 구현 가능하지만 별도 엔진이 필요해 선행 작업보다 무겁다
- 성능 최적화는 중요하지만 제품 기능 선명도가 먼저 확보된 뒤 진행해도 된다

## 5. 이번 문서에서 제외한 항목

아래 항목은 방향성은 맞지만, 현재 시점에서는 “구현 가능 항목”보다 “별도 대형 에픽”에 가깝다.

- knowledge graph visualization
- collaborative editing
- self-updating documentation
- executable documentation
- production-grade persistent semantic vector retrieval

제외 이유:
- 단일 기능 추가가 아니라 저장 모델, 동기화, 권한, 관계 추출, 운영 복잡도를 함께 요구한다
- 현재 코드베이스의 다음 단계로는 범위가 너무 크다

## 6. 최종 권고

지금 가장 맞는 방향은 다음 순서다.

1. `AI 기능 마감 + patch review 신뢰도 강화`
2. `로컬 인덱싱 기반 knowledge layer MVP`
3. `AsciiDoc/RST ingestion 확장`
4. `JSON/YAML structured patching`

이 순서는 현재 구현을 거의 버리지 않고 확장할 수 있으며,
PRD의 핵심 문장인 `AI-assisted technical documentation workspace`를 가장 빠르게 제품 기능으로 구체화한다.
