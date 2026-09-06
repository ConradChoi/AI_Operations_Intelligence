# 실고객 CSV 업로드 파이프라인 — Design Spec

**날짜:** 2026-09-06
**상태:** Approved for planning
**연관 문서:** `data/AI_Operations_Intelligence_Spend_4Week_MVP_PRD_v0.1.md` (Epic A/B/C), `data/AI_Operations_Intelligence_CSV_표준컬럼명세.md`, `data/AI_Operations_Intelligence_IA_UX_Flow.md`, `docs/superpowers/specs/2026-09-03-epic-h-demo-mode-design.md` (재사용하는 탐지 엔진의 원 설계)

## Context

Epic H(데모 모드)는 고정된 `demo-org`/`demo-project`로만 동작하는 샘플 체험 전용이었다. 4주 Spend MVP PRD의 Week2 목표는 실제 파일럿 고객이 자기 CSV를 업로드해 같은 탐지 엔진 결과를 받아보는 것이다. 이 스펙은 그 파이프라인 — 회원가입부터 업로드·매핑·품질검사·분석·결과 확인까지 — 을 다룬다.

**핵심 전제**: `supabase/functions/run-spend-analysis`는 이미 `project_id`를 입력으로 받는 범용 구조다(Epic H Task 8). 이번 작업은 엔진을 바꾸지 않는다 — 실데이터를 올바른 `project_id`로 `spend_transactions`에 채워 넣고, 이미 있는 엔진을 호출하는 파이프라인을 만드는 것이 전부다.

## Goals

- 실고객이 이메일로 회원가입하고, 자기 조직(Workspace)을 만들 수 있다.
- CSV를 업로드하면 헤더/20행 프리뷰를 보고, 표준 컬럼에 자동 매핑 추천을 받고, 확인/수정할 수 있다.
- 업로드 데이터의 품질(Blocker/Warning, Quality Score)을 검사하고, 문제행을 CSV로 다시 받을 수 있다.
- 품질 통과 시 기존 탐지 엔진이 자동 실행되어, 로그인한 사용자만 볼 수 있는 자기 조직 전용 Spend Overview/Opportunities 화면으로 이동한다.
- 데모(`demo-org`)는 지금처럼 로그인 없이 그대로 공개 유지된다 — 이번 변경으로 인한 회귀가 없어야 한다.

## Non-Goals

- Donation/Commerce 온보딩 옵션의 실제 기능 (화면에는 "Coming Soon"으로 노출, 클릭 불가)
- 조직 내 팀원 초대 UI (멤버십 테이블 스키마는 다대다로 만들되, 초대 플로우 자체는 이번 범위 밖 — 소유자 1명만 생성)
- 비밀번호 재설정, 이메일 인증 커스터마이징 등 Supabase Auth 기본 제공 이상의 인증 기능
- CSV 외 포맷(Excel 등) 지원
- 업로드 데이터 재분석 스케줄링(월별 자동 재분석) — Phase 2

## Architecture

### 인증 & 멀티테넌시
- Supabase Auth(이메일+비밀번호, 매직링크 아님 — 기본 이메일/비밀번호 플로우) 사용
- 신규 테이블 `memberships(id, organization_id, user_id, role, created_at)` — 조직:사용자 다대다. 이번 범위에서는 항상 `role='owner'`인 행 1개만 생성되지만, 스키마는 팀원 추가를 염두에 두고 다대다로 설계한다.
- RLS는 `organizations`/`projects`/`datasets`/`spend_transactions`/`opportunities`에 **추가** 정책을 붙인다(기존 `demo-org` 전용 정책은 그대로 유지, 합집합으로 동작):
  ```sql
  using (
    exists (
      select 1 from memberships m
      join projects p on p.organization_id = m.organization_id
      where p.id = spend_transactions.project_id and m.user_id = auth.uid()
    )
  )
  ```
  (테이블별로 조인 경로만 다름 — 아래 데이터 모델 섹션 참조)

### 파일 저장
- Supabase Storage 버킷 `spend-uploads` 신규 생성. 경로 규칙: `{organization_id}/{dataset_id}/{filename}`
- Storage RLS: 해당 organization의 멤버만 자기 폴더에 read/write 가능

### CSV 파싱 & 매핑
- 클라이언트 사이드 파싱(PapaParse) — 업로드 즉시 헤더/20행 프리뷰를 서버 왕복 없이 보여줄 수 있음
- 매핑 추천은 순수 함수(`suggestColumnMapping`)로 구현: 업로드 헤더를 정규화(소문자, 공백/특수문자 제거) 후 표준 컬럼명 및 동의어 사전과 문자열 유사도(Dice coefficient, bigram 기반) 비교, 임계값 이상이면 추천
- 사용자가 매핑을 확인/수정한 뒤에만 다음 단계(Quality) 진행 가능 (필수 컬럼 미매핑 시 진행 버튼 비활성 — 기존 PRD S3 AC 그대로)

### Quality 검사 (Spend 전용으로 축소)
CSV 표준 컬럼 명세의 일반 Quality Score 공식은 Process Mining(event_name/event_time/case_id) 전제라 Spend 트랜잭션에는 그대로 적용할 수 없다. Spend 전용으로 재정의:

**Blocker** (분석 불가):
- 필수 컬럼(`transaction_id`, `transaction_date`, `vendor_name_raw`, `amount`, `currency`) 미매핑 또는 값 없음
- `transaction_date` 파싱 불가
- `amount` 숫자 변환 불가
- 동일 `transaction_id` 중복 (이번 업로드 배치 내에서만 체크 — 다른 데이터셋/과거 업로드와의 중복은 검사하지 않는다)

**Warning** (제한적 분석):
- `vendor_name_raw` 공백/불완전(빈 문자열, 1자 이하)
- `amount`가 0 이하

**Quality Score** (Spend 전용 가중치 — event sequence 항목 제외, 나머지 재분배):
- Completeness 45% (필수 컬럼 채움 비율)
- Validity 35% (날짜/숫자 파싱 성공 비율)
- Uniqueness 20% (transaction_id 중복 없는 비율)
- 80점 이상: 분석 가능 / 60~79: 제한적 분석(경고와 함께 진행 가능) / 60 미만: 수정 권고(진행 버튼 비활성)

Blocker가 하나라도 있으면 Quality Score와 무관하게 진행 불가. 오류행은 CSV로 export 가능(원본 행 + 오류 사유 컬럼 추가).

### 엔진 연동
Quality 통과 시: (1) Storage에 원본 CSV 업로드, (2) 매핑된 행을 `spend_transactions`에 insert (organization_id/project_id/dataset_id는 이번 세션에서 생성된 실제 값), (3) `run-spend-analysis` Edge Function을 해당 `project_id`로 호출 — Epic H와 동일한 함수, 코드 변경 없음. 로컬 개발 시에는 Epic H와 동일하게 `supabase functions serve`로 로컬 서빙(호스티드 프로젝트 대상, `--no-verify-jwt`) — 이 부분의 로컬/배포 환경 차이는 Epic H 스펙에 이미 문서화된 내용을 그대로 따른다.

## Screens & Routes

```
/signup, /login                          Supabase Auth 이메일/비밀번호
/onboarding/goal                         4개 카드: 후원(Coming Soon)/이커머스(Coming Soon)/지출절감(활성)/통합진단(Coming Soon)
/onboarding/workspace                    조직명, 산업 입력 → organizations + projects(product_type='spend') + memberships(owner) 생성
/onboarding/upload                       CSV 드래그앤드롭, 헤더 감지 + 20행 프리뷰
/onboarding/mapping                      자동 매핑 추천 표 + 사용자 확인/수정, 필수 컬럼 미매핑 시 다음 버튼 비활성
/onboarding/quality                      Blocker/Warning 목록, Quality Score, 오류행 CSV 다운로드, 통과 시 "분석 시작"
/workspace/[orgId]/spend/overview        로그인 필요, 본인 조직만 접근 — Epic H의 데모 Overview를 org/project 파라미터화해서 재사용
/workspace/[orgId]/spend/opportunities   위와 동일한 방식으로 재사용
```

`/demo/spend/overview`, `/demo/spend/opportunities`(Epic H)는 변경 없이 그대로 유지 — 로그인 없는 공개 데모 경로.

`[orgId]`는 `organizations.id`다. 이번 범위에서 조직당 프로젝트는 항상 1개(`projects.organization_id = orgId and product_type = 'spend'`)이므로, 페이지는 이 조건으로 project row를 조회해 `project_id`를 얻는다 — 별도의 project 선택 UI는 없다.

## Component Reuse

기존 `StatTile`, `CategoryBarChart`, `MonthlyTrendChart`, `TopVendorsTable`, `OpportunityTable`, `spendAggregations.ts`, `opportunityTypeMeta.ts`(모두 Epic H 산출물)는 그대로 재사용한다 — `/workspace/[orgId]/spend/*` 페이지는 `project_id`/조회 조건만 `demo-project` 대신 실제 값을 쓰고 나머지는 동일하다. 새로 만드는 것은 인증·온보딩·업로드·매핑·품질검사 부분뿐이다.

## Error Handling

- CSV 파싱 실패(인코딩 깨짐 등): 업로드 화면에서 즉시 에러 메시지, 재업로드 유도
- Storage 업로드 실패: 재시도 버튼, `spend_transactions` insert는 Storage 업로드 성공 후에만 진행(원본 보관 우선순위)
- Edge Function 호출 실패: Quality 화면에 에러 표시, "분석 다시 시도" 버튼 (재시도는 idempotent — 기존 project_id의 opportunities를 delete-then-insert)
- RLS로 인한 접근 거부(다른 조직 데이터 접근 시도): 404로 처리(403 대신 — 존재 여부도 노출하지 않음)

## Testing Plan

- `suggestColumnMapping`, Quality 검사 규칙, Quality Score 계산: 순수 함수 유닛테스트 (Vitest)
- RLS: Epic H의 `tests/rls.test.ts` 패턴을 확장 — 실제 Supabase Auth 테스트 유저 2명을 만들어 서로의 조직 데이터에 접근 안 되는지 검증
- 화면: Playwright로 실제 렌더링 스크린샷 확인 (Epic H 대시보드 개선 작업에서 쓴 방식 재사용)
- E2E: 회원가입 → 워크스페이스 생성 → 샘플 CSV 업로드 → 매핑 → 품질통과 → 실제 Opportunity 생성 확인까지 한 번 수동으로 전체 흐름 검증

## Open Risks

1. **Supabase Auth 이메일 발송**: 기본 SMTP는 낮은 발송 한도가 있음 — 파일럿 고객 수가 적어(Week2~4 목표 소수) 문제없을 것으로 예상되나, 확인 필요.
2. **문자열 유사도 매핑 정확도**: 실제 고객 CSV의 헤더가 예상과 크게 다르면(예: 완전히 다른 언어/약어) 자동 매핑이 부정확할 수 있음 — 사용자 수동 수정 UI가 이를 보완.
3. **Storage 무료 티어(1GB)**: 파일럿 고객 수가 늘어나면 초과 가능 — 이번 범위에서는 여유 있음.
