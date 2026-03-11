# Docsy

Docsy는 Markdown Muse 에디터를 기반으로 만든 해커톤용 AI 문서 워크플로 에이전트입니다.

제품의 핵심 흐름은 하나입니다.

1. 사용자가 기술 문서를 수정합니다.
2. Gemini가 문서 문맥을 분석합니다.
3. 시스템이 구조화된 액션 또는 패치 제안을 반환합니다.
4. 사용자는 변경을 적용하기 전에 먼저 리뷰합니다.

![Docsy editor preview](src/assets/editor-preview.png)

## 언어

- [기본 README](README.md)
- [English README](README.en.md)

## 해커톤 목표

이 저장소는 Gemini 해커톤 제출을 목표로 정리되고 있습니다.

현재 제출 관점의 핵심 포인트는 다음과 같습니다.

- Google GenAI SDK 기반 Gemini 연동
- review-first patch workflow
- 모델의 structured JSON 출력
- 에디터 스크린샷을 포함한 멀티모달 입력 경로
- AI 응답을 실제 UI 액션으로 연결하는 데모
- 기술 문서 유지보수라는 분명한 사용 사례

## 데모 시나리오

1. 여러 기술 문서를 에디터에서 엽니다.
2. 한 문서의 절차를 수정합니다.
3. 문서 문맥과 에디터 상태를 AI 서비스로 보냅니다.
4. Gemini가 액션 또는 패치 제안을 반환합니다.
5. 앱이 patch review 흐름을 엽니다.
6. 사용자가 제안을 수락하거나 거절합니다.

## 저장소 구조

```text
src/       프론트엔드 에디터와 UI 워크플로
server/    Gemini 기반 AI 서비스
docs/      엔지니어링 문서
PRD/       제품 요구사항 문서
public/    정적 자산
```

## 현재 구현된 기반 기능

- 탭과 사이드바를 포함한 멀티 문서 편집
- Markdown, LaTeX, HTML, JSON, YAML 편집
- Document AST 생성과 구조화된 패치 처리
- AI 요약, 섹션 생성, TOC 제안, 업데이트 제안
- 문서를 바로 바꾸지 않고 Patch Review를 거치는 흐름
- 로컬 knowledge index와 관련 문서 워크플로
- 버전 히스토리, 공유, 내보내기 기능

## 로컬 실행

### 요구 사항

- Node.js 18 이상
- npm

### 설치

```bash
npm install
```

### 프론트엔드 실행

```bash
npm run dev
```

### AI 서비스 실행

먼저 `.env.local` 파일을 만듭니다.

```bash
cp .env.example .env.local
```

PowerShell:

```powershell
Copy-Item .env.example .env.local
```

다음 값을 설정합니다.

- `GEMINI_API_KEY`
- `GEMINI_MODEL`
- `AI_SERVER_PORT`
- `AI_ALLOWED_ORIGIN`
- `VITE_AI_API_BASE_URL`

그 다음 실행합니다.

```bash
npm run ai:server
```

## Cloud Run 배포

AI 서비스는 Cloud Run 배포를 기준으로 정리되어 있습니다.

배포 계약은 다음과 같습니다.

- `PORT`는 Cloud Run이 주입합니다.
- `GEMINI_API_KEY`는 Secret Manager에서 주입하는 것을 기준으로 합니다.
- `GEMINI_MODEL`로 Gemini 모델을 선택합니다.
- `AI_ALLOWED_ORIGIN`으로 허용할 프론트엔드 origin 목록을 제어합니다.

배포 관련 파일:

- [Dockerfile.ai](Dockerfile.ai)
- [cloudbuild.ai.yaml](cloudbuild.ai.yaml)

프론트엔드 설정:

- `VITE_AI_API_BASE_URL`을 배포된 AI 서비스 URL로 설정합니다.
- 이 값이 없고 localhost가 아니면 프론트엔드는 same-origin을 기본값으로 사용합니다.

헬스 체크:

- `GET /api/ai/health`

## 주요 스크립트

- `npm run dev`
- `npm run ai:server`
- `npm run build`
- `npm run build:web`
- `npm run preview`
- `npm run lint`
- `npm run test`
- `npm run typecheck:server`

## 주요 문서

- [해커톤 PRD](PRD/docsy_prd.md)
- [최종 제출 패키지](docs/final-submission-package-2026-03-11.md)
- [해커톤 구현 세션 요약](docs/session-summary-2026-03-11-hackathon-implementation.md)
- [Docs index](docs/README.md)
- [PRD index](PRD/README.md)
- [GCP 배포 가이드](docs/gcp-deployment.md)

## 보안 메모

- `GEMINI_API_KEY`는 브라우저 번들에 포함되지 않습니다.
- Gemini 호출은 서버 레이어를 통해 처리됩니다.
- 문서 내용은 AI 서비스로 전달될 수 있지만, 인증 정보는 서버 환경 변수에만 남습니다.
