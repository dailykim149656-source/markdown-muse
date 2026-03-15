# 🚀 CI/CD 및 배포 최적화 세션 정리 (2026-03-12)

이 문서는 AI 백엔드 서버의 안정화와 프론트엔드의 HTTPS 및 라우팅 에러 해결을 위해 진행된 주요 작업 내용을 기록합니다.

## 1. AI 백엔드 (Cloud Run) 안정화
배포 초기 발생했던 **503 Service Unavailable** 에러와 헬스 체크 실패 문제를 해결했습니다.

- **헬스 체크 최적화**: 서버 초기화 중에도 헬스 체크(`/api/ai/health`)에 즉시 응답할 수 있도록 라우팅 순서를 최상단으로 조정했습니다.
- **읽기 전용 파일시스템 대응**: Cloud Run의 컨테이너 환경에서 발생하던 파일 쓰기 권한 에러를 내부적으로 예외 처리하여 서버가 중단되지 않도록 수정했습니다. (`repository.ts`)
- **CORS 설정 수정**: 프론트엔드와 통신 시 발생하던 중복/누락 헤더(Access-Control-Allow-Credentials) 문제를 해결했습니다.
- **컨테이너 실행 환경 개선**: `tsx`와 `typescript`를 프로덕션 의존성(`dependencies`)으로 옮겨 컨테이너 내에서 서버가 안정적으로 시작되도록 개선했습니다.

## 2. 프론트엔드 배포처 전환 (GCS → Firebase Hosting)
GCS 버킷 기반 호스팅의 한계(HTTPS 미지원, SPA 라우팅 문제)를 해결하기 위해 배포 인프라를 Firebase로 전환했습니다.

- **라우팅 에러 해결**: `/editor`와 같은 하위 경로로 직접 접속했을 때 흰색 화면(404)이 나오던 문제를 `firebase.json`의 리디렉션 설정을 통해 해결했습니다.
- **HTTPS 보안 적용**: Firebase Hosting을 통해 자동 SSL 인증서를 적용, "안전하지 않음" 경고를 제거했습니다.
- **진입점 수정**: 리액트 앱의 `App.tsx`에서 `/index.html` 경로로 진입하더라도 첫 화면이 정상 로드되도록 라우팅을 추가했습니다.

## 3. CI/CD 파이프라인 (GitHub Actions) 강화
배포 과정을 100% 자동화하고 권한 이슈를 해결했습니다.

- **워크플로우 통합**: `.github/workflows/deploy-gcp.yml` 파일을 수정하여 AI 서버 배포와 Firebase Hosting 배포가 한 번에 이루어지도록 통합했습니다.
- **IAM 권한 최적화**: GitHub Actions 서비스 계정에 필요한 최소 권한(`Firebase Hosting Admin`, `Firebase Admin` 등)을 부여하여 안정적인 배포 환경을 구축했습니다.
- **GitHub Secrets 관리**: `FIREBASE_SERVICE_ACCOUNT_URBAN_DDS`와 같은 중요 보안 정보를 시크릿으로 관리하도록 가이드했습니다.

## 🔗 최종 접속 주소
- **프론트엔드 (HTTPS)**: [https://urban-dds.web.app](https://urban-dds.web.app)
- **백엔드 헬스 체크**: [https://docsy-mc32v24cyq-du.a.run.app/api/ai/health](https://docsy-mc32v24cyq-du.a.run.app/api/ai/health)

---
*담당 AI 어시스턴트: Antigravity*
