# AI Operations Intelligence — Spend (Demo)

## 로컬 개발 환경 실행

이 프로젝트는 로컬 Docker Supabase 스택(`supabase start`) 대신 **호스티드 Supabase 프로젝트**(ap-northeast-2, Free tier)를 사용한다. 스키마/RLS 변경은 Supabase 대시보드 SQL Editor에서 직접 실행한다 (`supabase/migrations/`에 SQL은 버전관리용으로 보관).

1. `npm install`
2. `.env.local`에 호스티드 프로젝트의 API URL / anon key / service_role key를 **`NEXT_PUBLIC_SUPABASE_*`/`SUPABASE_SERVICE_ROLE_KEY` 이름과 `PROJECT_URL`/`PROJECT_SERVICE_ROLE_KEY` 이름 양쪽 모두**로 기입 (`.env.example` 참고, Settings → API). 후자가 필요한 이유: `supabase functions serve --env-file`이 `SUPABASE_` 접두사 변수를 로컬 스택 값으로 덮어써버리기 때문.
3. `npx supabase functions serve run-spend-analysis --env-file .env.local --no-verify-jwt` (별도 터미널, Docker 필요 — 함수 자체만 로컬에서 서빙하고 DB/API는 위 호스티드 프로젝트를 바라봄. `--no-verify-jwt`는 로컬 게이트웨이가 호스티드 프로젝트의 JWT를 검증 못 하기 때문이며 로컬 개발 전용 — 실배포에는 해당 없음)
4. `npm run seed:demo`
5. `npm run dev` → http://localhost:3000

## 실고객 업로드 플로우 (Week2)

1. `/signup`에서 이메일로 가입
2. `/onboarding/goal` → "회사 지출 절감" 선택
3. 워크스페이스(조직명/산업) 생성
4. CSV 업로드 → 컬럼 매핑 확인 → 품질검사 통과
5. 분석은 Next.js Server Action이 Epic H의 탐지 엔진을 in-process로 직접 호출한다 — 별도 Edge Function 배포나 로컬 서빙이 필요 없다
6. 결과는 `/workspace/{orgId}/spend/overview`, `/workspace/{orgId}/spend/opportunities`에서 확인 (로그인 필요, 본인 조직만 접근 가능)

데모(`/demo/spend/*`)는 이 플로우와 무관하게 기존 방식 그대로 동작한다.
