# Session Summary: GCP 서버별 분리 배포 워크플로 정리

Date: 2026-03-13

## Summary

이번 작업에서는 기존의 단일 GitHub Actions 배포 파이프라인을 서버/프런트 단위로 분리했다.

기존 구조는 하나의 `deploy-gcp.yml` 안에서 다음 순서로 모두 직렬 실행되는 방식이었다.

- TeX Cloud Run 배포
- AI Cloud Run 배포
- Firebase Hosting 프런트 배포

이 구조는 전체 스택을 한 번에 검증하기에는 좋았지만, 다음 문제가 있었다.

- 프런트만 수정해도 TeX와 AI까지 모두 기다려야 함
- AI만 수정해도 TeX 단계가 앞에 있으면 전체 배포 시간이 길어짐
- GitHub job output으로 URL을 전달하면서 레이어 간 결합이 강해짐

이번 변경의 목표는 다음과 같았다.

- 일상 배포 시간을 줄이기 위해 서버별/프런트별 워크플로를 분리
- 각 워크플로가 stable service URL secret을 사용하도록 변경
- 전체 릴리스가 필요할 때만 수동 full-stack 워크플로를 실행

## What changed

### 1. 단일 `deploy-gcp.yml` 제거

기존 단일 배포 워크플로를 제거했다.

삭제 파일:

- `.github/workflows/deploy-gcp.yml`

### 2. TeX 전용 워크플로 추가

TeX 서비스만 배포하는 워크플로를 추가했다.

파일:

- `.github/workflows/deploy-tex.yml`

역할:

- `Dockerfile.tex`
- `cloudbuild.tex.yaml`
- `server/texService.ts`
- `server/modules/tex/**`
- `src/types/tex.ts`

같은 TeX 관련 변경이 있을 때만 실행된다.

배포 후에는:

- TeX Cloud Run 서비스 배포
- `GET /health` 확인
- `Authorization: Bearer ...`
- `X-Docsy-Tex-Token`

헤더를 사용한 health check 수행

### 3. AI 전용 워크플로 추가

AI 서버만 배포하는 워크플로를 추가했다.

파일:

- `.github/workflows/deploy-ai.yml`

핵심 변화:

- 더 이상 `needs.deploy-tex.outputs.tex_service_url`에 의존하지 않음
- `GCP_TEX_SERVICE_BASE_URL` secret을 사용해 TeX 서비스 URL을 주입

배포 후 확인:

- `GET /api/ai/health`
- `GET /api/tex/health`

즉, AI 서버가 살아 있는지뿐 아니라 TeX 프록시 연결도 함께 확인하도록 했다.

### 4. 프런트 전용 워크플로 추가

프런트만 배포하는 워크플로를 추가했다.

파일:

- `.github/workflows/deploy-web.yml`

핵심 변화:

- 더 이상 AI job output URL에 의존하지 않음
- `GCP_WEB_VITE_AI_API_BASE_URL` secret만 사용해 빌드

즉, 프런트는 stable AI API URL을 기준으로 독립 배포된다.

### 5. 수동 full-stack 워크플로 추가

전체 릴리스나 계약 변경이 있을 때를 위한 통합 워크플로를 별도로 추가했다.

파일:

- `.github/workflows/deploy-full-stack.yml`

이 워크플로는 다음 순서를 유지한다.

- TeX 배포
- AI 배포
- web 배포

즉, 평소에는 분리 배포를 하고, 전체 점검이 필요할 때만 full-stack 배포를 수동 실행하는 모델이다.

## Secret / Config changes

이번 구조 변경 이후 중요해진 stable secret은 다음과 같다.

필수:

- `GCP_PROJECT_ID`
- `GCP_SA_KEY`
- `GCP_AI_ALLOWED_ORIGIN`
- `GCP_TEX_SERVICE_BASE_URL`
- `GCP_WEB_VITE_AI_API_BASE_URL`
- `FIREBASE_SERVICE_ACCOUNT_URBAN_DDS`

선택:

- `GCP_TEX_SERVICE_AUTH_TOKEN_SECRET_NAME`
  - 비어 있으면 기본값 `tex-service-auth-token`

값 의미:

- `GCP_TEX_SERVICE_BASE_URL`
  - TeX Cloud Run 서비스의 base URL
  - 예: `https://docsy-tex-xxxxx.a.run.app`
- `GCP_WEB_VITE_AI_API_BASE_URL`
  - AI Cloud Run 서비스의 base URL
  - 예: `https://docsy-xxxxx.a.run.app`

## Documentation updated

배포 문서도 새 구조에 맞춰 갱신했다.

수정 파일:

- `docs/gcp-deployment.md`

주요 반영 내용:

- `deploy-gcp.yml` 대신 분리된 4개 워크플로 안내
- stable URL secret 기반 설명
- day-to-day deploy와 coordinated release의 구분

## Recommended usage

운영 권장 방식은 다음과 같다.

### 일상 배포

- TeX만 변경: `deploy-tex.yml`
- AI만 변경: `deploy-ai.yml`
- 프런트만 변경: `deploy-web.yml`

### 통합 릴리스 / 계약 변경

- `deploy-full-stack.yml`

적합한 경우:

- `/api/tex/*` 계약 변경
- AI/TeX 서비스 연동 변경
- 새 env / secret 계약 추가
- 릴리스 직전 전체 smoke deploy 필요

## Verification

이번 작업에서는 워크플로 파일과 문서 구성이 의도대로 바뀌었는지 확인했다.

확인 사항:

- `.github/workflows` 내 분리된 4개 파일 존재
- 기존 `deploy-gcp.yml` 제거
- `docs/gcp-deployment.md`의 참조 및 secret 설명 갱신
- `git diff --check` 기준 whitespace 문제 없음

## Notes

- 현재 분리 배포 구조의 핵심 전제는 “Cloud Run 서비스 URL이 stable하다”는 점이다.
- 따라서 routine workflow에서는 job output 전달보다 secret 기반 URL 주입이 더 적합하다.
- full-stack 워크플로는 완전히 없애지 않고 유지해야, 통합 릴리스 시 안전한 순차 검증 경로를 확보할 수 있다.
