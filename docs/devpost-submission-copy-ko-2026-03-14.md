# Docsy Devpost 제출 문안

## 프로젝트 이름

Docsy

## 추천 지원 분야

UI Navigator

## 이 분야가 맞는 이유

Docsy는 화면 인식 기반의 문서 워크플로 에이전트입니다. 에디터 상태를 보고, Gemini 멀티모달 입력으로 현재 문서와 워크스페이스 맥락을 해석한 뒤, 패치 리뷰 열기 같은 실행 가능한 UI 결과를 반환합니다. 실시간 음성 에이전트도 아니고, 멀티미디어 스토리 생성기와도 거리가 있기 때문에 UI Navigator가 가장 자연스럽고 설득력 있는 분야입니다.

## 공통 조건 체크

- Vertex AI를 통해 Gemini 모델을 사용함
- Google GenAI SDK 기반으로 구현됨
- Cloud Run과 Vertex AI를 포함한 Google Cloud 서비스를 사용함

## 태그라인

Gemini-powered review-first document maintenance

## 한 줄 요약

Docsy는 Gemini를 활용해 기술 문서의 맥락을 구조화된 검토 가능 편집 액션으로 바꾸는 review-first AI document workflow agent입니다.

## 짧은 설명

Docsy는 팀이 기술 문서를 더 안전하게 유지보수할 수 있도록 돕습니다. 문서를 자동으로 조용히 수정하는 대신, 문서 맥락과 관련 파일, 그리고 에디터 상태를 분석해 사용자가 적용 전에 검토할 수 있는 구조화된 액션과 패치 제안을 제공합니다.

## 문제 정의

기술 문서는 여러 파일에 걸쳐 쉽게 불일치가 생깁니다. 하나의 SOP나 런북에서 절차가 바뀌어도 관련 문서는 그대로 남아 있는 경우가 많습니다. 대부분의 AI 도구는 텍스트를 생성할 수는 있지만, 중요한 문서를 안전하게 유지보수하는 실제 워크플로에는 잘 맞지 않습니다.

## 해결 방식

Docsy는 문서 유지보수를 단순 생성 문제가 아니라 워크플로 문제로 다룹니다. 에디터는 문서 맥락, 구조, 관련 문서 신호, 그리고 멀티모달 에디터 상태 입력을 수집해 Google Cloud에서 동작하는 Gemini 기반 AI 서비스로 보냅니다. 그러면 서비스는 자유 형식 텍스트가 아니라 구조화된 JSON 액션 또는 패치 제안을 반환합니다. 제품은 문서를 바로 바꾸지 않고 review-first 패치 워크플로를 열어 사용자가 모든 변경을 검토하고 승인하도록 합니다.

## Gemini를 어디에 쓰는가

- 문서 맥락과 에디터 상태 스크린샷의 멀티모달 해석
- 요약, 섹션 초안, TOC 제안, 액션 제안을 위한 strict structured JSON 생성
- 다음 에디터 액션을 고르는 live agent planning
- 현재 문서에 적용할 reviewable patch draft 생성

## Google GenAI SDK 구현 설명

Docsy는 서버에서 Vertex AI와 연결된 Google GenAI SDK를 에디터 워크플로의 핵심 추론 계층으로 사용합니다. 백엔드는 프롬프트와 선택적인 스크린샷 payload를 Gemini로 보내고, 자유 형식 채팅 텍스트 대신 strict JSON 응답을 요구합니다.

AI assistant 흐름에서는 Gemini가 문서 요약, 새 섹션 초안, 목차 제안, 그리고 패치 리뷰를 열어야 하는지 같은 액션 제안을 생성합니다. Live agent 흐름에서는 Gemini가 먼저 planner로 동작해 현재 문서 수정, Google Docs 검색 같은 다음 액션을 선택하고, 이어서 선택된 액션에 맞는 구조화된 draft 응답을 생성합니다.

프런트엔드는 Gemini의 구조화된 응답을 실제 제품 동작으로 변환합니다. 예를 들어 Gemini가 현재 문서 draft를 반환하면, Docsy는 이를 patch set으로 바꾸고 patch review UI를 열어 사용자가 변경을 수락하거나 거절할 수 있게 합니다.

## Google Cloud 사용 방식

- Cloud Run이 AI 서비스를 호스팅함
- Vertex AI가 Gemini 모델 접근을 제공함
- Cloud Build가 컨테이너 빌드와 배포에 사용됨
- Google Workspace 연동이 Google Docs 및 Drive 워크플로를 지원함

## 핵심 기능

- review-first 패치 워크플로
- Gemini 기반 structured JSON 출력
- 이미지 payload와 문서 맥락을 함께 보내는 멀티모달 요청 경로
- 문서 액션을 위한 live agent planning
- 관련 문서 추천
- 문서 간 충돌 하이라이트
- TOC 제안 미리보기
- before/after 패치 리뷰 카드

## 데모 흐름

1. 에디터에서 서로 관련된 기술 문서를 여러 개 엽니다.
2. 한 문서의 절차를 수정합니다.
3. Docsy가 활성 문서, 관련 맥락, 에디터 상태 스크린샷을 분석합니다.
4. 이 멀티모달 맥락을 Google GenAI SDK를 통해 Gemini로 보냅니다.
5. 구조화된 JSON 액션 데이터와 reviewable patch draft를 받습니다.
6. patch review를 열고 제안된 변경을 확인합니다.
7. 사용자가 업데이트를 수락하거나 거절합니다.

## 왜 이 챌린지에 잘 맞는가

Docsy는 단순한 text-in/text-out 동작을 넘어서 있습니다. 멀티모달 맥락, 구조화된 모델 출력, 실행 가능한 UI 액션을 실제 에디터 워크플로 안에서 결합합니다. Gemini는 단순히 문장을 써주는 역할이 아니라, 복잡한 기술 문서를 더 안전하게 유지보수하도록 돕는 운영형 워크플로 에이전트로 사용됩니다.

## 차별점

- 조용한 자동 수정 방식에 의존하지 않음
- 범용 채팅이 아니라 문서 유지보수 문제에 집중함
- 모델 출력을 실제 에디터 동작으로 연결함
- 명시적인 검토와 승인으로 사용자 통제권을 유지함

## 심사 포인트용 문장

- Vertex AI 상의 Google GenAI SDK를 통해 Gemini를 사용함
- 문서 맥락과 에디터 상태 스크린샷을 포함한 멀티모달 입력을 사용함
- 프롬프트 데모가 아니라 strict structured JSON을 반환함
- patch review를 여는 실제 UI 액션으로 모델 출력을 연결함
- Google Cloud 위에서 동작하는 실용적인 생산성 워크플로를 보여줌

## 아키텍처 요약

- 프런트엔드: React + Vite 기반 문서 에디터
- 백엔드: Cloud Run에서 동작하는 Node.js AI 서비스
- 모델 접근: Vertex AI에 연결된 Google GenAI SDK
- 워크플로 출력: reviewable patch action으로 변환되는 structured JSON

## 제출 시 채워 넣을 항목

- Public repository: `[REPLACE_WITH_GITHUB_REPO_URL]`
- Demo video: `[REPLACE_WITH_DEMO_VIDEO_URL]`
- Frontend demo URL: `[REPLACE_WITH_DEPLOYED_FRONTEND_URL]`
- AI service URL: `[REPLACE_WITH_CLOUD_RUN_AI_URL]`

## 최종 메모

- 카테고리는 UI Navigator로 유지
- Cloud Run 배포 증빙은 짧은 영상이나 코드 링크로 함께 제시
- 데모 영상에서 patch review가 실제로 열리는 장면을 보여주기
- 제출 문안에서는 structured JSON 출력과 review-first 워크플로를 강하게 강조하기
