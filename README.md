# AI Operations Intelligence — Spend (Demo)

## 로컬 개발 환경 실행

이 프로젝트는 로컬 Docker Supabase 스택(`supabase start`) 대신 **호스티드 Supabase 프로젝트**(ap-northeast-2, Free tier)를 사용한다. 스키마/RLS 변경은 Supabase 대시보드 SQL Editor에서 직접 실행한다 (`supabase/migrations/`에 SQL은 버전관리용으로 보관).

1. `npm install`
2. `.env.local`에 호스티드 프로젝트의 API URL / anon key / service_role key를 **`NEXT_PUBLIC_SUPABASE_*`/`SUPABASE_SERVICE_ROLE_KEY` 이름과 `PROJECT_URL`/`PROJECT_SERVICE_ROLE_KEY` 이름 양쪽 모두**로 기입 (`.env.example` 참고, Settings → API). 후자가 필요한 이유: `supabase functions serve --env-file`이 `SUPABASE_` 접두사 변수를 로컬 스택 값으로 덮어써버리기 때문.
3. `npx supabase functions serve run-spend-analysis --env-file .env.local --no-verify-jwt` (별도 터미널, Docker 필요 — 함수 자체만 로컬에서 서빙하고 DB/API는 위 호스티드 프로젝트를 바라봄. `--no-verify-jwt`는 로컬 게이트웨이가 호스티드 프로젝트의 JWT를 검증 못 하기 때문이며 로컬 개발 전용 — 실배포에는 해당 없음)
4. `npm run seed:demo`
5. `npm run dev` → http://localhost:3000
