# Epic H — Demo / Sample Data Mode: Design Spec

**날짜:** 2026-09-03
**상태:** Approved for planning
**연관 문서:** `data/AI_Operations_Intelligence_Spend_4Week_MVP_PRD_v0.1.md` (Epic H, FR-H1~H3), `data/AI_Operations_Intelligence_CSV_표준컬럼명세.md`

## Context

Spend Intelligence 4주 MVP는 파일럿 후보 0곳·예산 0원에서 시작한다. 실데이터 없이 영업 미팅에서 즉시 보여줄 수 있는 샘플 데이터 기반 데모가 Week1 최우선 산출물이며, 이 데모는 하드코딩된 결과가 아니라 **실제 탐지 엔진을 Supabase 백엔드에서 실시간 구동**해 나온 결과를 보여준다 (CEO 승인 사항). 이 엔진은 Week2 이후 실고객 CSV 업로드 파이프라인에서도 동일하게 재사용된다.

## Goals

- 로그인/업로드 없이 "샘플로 체험하기" 클릭 한 번으로 Spend Overview·Savings Opportunity 화면을 즉시 보여준다.
- 결과는 실제 규칙 기반 탐지 엔진(PRD FR-F1~F7)의 산출물이며, 하드코딩이 아니다.
- 데모/실서비스가 동일한 데이터 모델과 동일한 탐지 엔진을 처음부터 공유해, Week2 실업로드 파이프라인 구축 시 로직 재작성이 없다.
- 데모 데이터는 다른 조직 데이터와 완전히 격리되어 있다.

## Non-Goals

- 데모 뷰어에 대한 로그인/인증 (Week2 이후 실고객 온보딩과는 별도)
- Anomaly Queue의 사용자 피드백 학습 루프 (PRD 2장 Non-goals와 동일)
- "미사용 구독" 탐지 (PRD Epic F(FR-F1~F7)에 명시적 항목 없음 — 스코프 아님)
- 여러 데모 시나리오 간 전환 (고정된 가상 회사 1곳만)
- 페이지 조회 시점의 실시간 재계산 (시딩 시점에 1회 계산 후 저장된 결과를 읽기만 함)

## Architecture

```
[샘플 CSV] → seed script (service_role) → spend_transactions(demo-project)
                                                   ↓
                             Edge Function: run-spend-analysis (1회 실행)
                                                   ↓
                                        opportunities(demo-project)
                                                   ↓
                          프론트(S5/S6)가 anon key로 읽기 전용 조회 (RLS)
```

- 프론트: Next.js(TypeScript, App Router), AWS Amplify 배포 (팀 기본 스택)
- 백엔드: Supabase (Postgres + Auth + RLS), 무료 티어
- 탐지 엔진: Supabase Edge Function 1개(`run-spend-analysis`), 내부에 순수 함수 여러 개를 순차 호출하는 구조. **별도 Edge Function으로 쪼개 배포하지 않는다** — 함수 간 네트워크 호출 오버헤드와 배포 관리 부담을 피하기 위함.
- Week2 이후 실업로드 시에도 동일 Edge Function을 호출해 동일 파이프라인을 탄다 (CSV 업로드 → spend_transactions insert → `run-spend-analysis` 호출 → opportunities insert).

## Data Model

PRD 7장 데이터 모델을 그대로 사용하되, 데모는 고정 ID를 쓴다.

| 테이블 | 데모 값 |
|---|---|
| organizations | `id='demo-org'`, `name='그로스핀(가상 마케팅 에이전시)'`, `industry='agency'` |
| projects | `id='demo-project'`, `organization_id='demo-org'`, `product_type='spend'`, 기간 9개월 |
| datasets | `id='demo-dataset'`, `project_id='demo-project'`, `schema_type='spend'`, `status='analyzed'` |
| spend_transactions | 시딩된 거래 행 (아래 샘플 데이터셋 참조) |
| opportunities | `run-spend-analysis` 실행 결과로 생성 |

## Sample Dataset 설계 (FR-H1)

**가상 회사:** 그로스핀 — 직원 45명 마케팅 에이전시 (PRD 6.2절 ICP: 직원 20~200명, SaaS/법인카드 다수 사용).

- 기간: 9개월, 약 150~300건의 거래
- Vendor 15~20곳, 이 중 8~12곳은 매월 반복 결제 패턴 (FR-F3 Recurring Detection 트리거)
- 중복 결제 후보 2~3건: 동일 vendor+금액이 3일 이내 중복 발생 (FR-F4)
- 가격 인상 vendor 2~3곳: 중반부에 15% 이상 인상 (FR-F5)
- 이상 거래 1~2건: 해당 vendor 평상시 대비 3배 이상 금액 (FR-F6)
- 위 패턴들이 조합되어 Savings Opportunity 5개 이상 생성되도록 설계 (PRD Success Criteria와 정합)

CSV는 기존 `data/spend_transactions_template.csv` 컬럼 스키마를 그대로 따른다.

## 탐지 엔진 규칙 (결정론적, LLM 미사용)

| 함수 | 규칙 |
|---|---|
| `normalizeVendor` (FR-F1) | 대소문자/공백 정리 + 별칭 매핑 테이블(예: "AWS Seoul"→"AWS"), 미매칭 시 원본 title-case |
| `categorize` (FR-F2) | vendor→category 룩업 테이블, 미매칭 시 'Uncategorized' |
| `detectRecurring` (FR-F3) | vendor_normalized 그룹화 후 서로 다른 달(月)이 3개월 이상이면 recurring 플래그. **금액 변동 여부는 여기서 판단하지 않는다** — 가격이 올랐다고 recurring 판정에서 제외되면 `detectPriceChanges`가 해당 벤더를 볼 수 없게 되므로, 가격 변동 판단은 아래 `detectPriceChanges`가 전담한다 |
| `detectDuplicates` (FR-F4) | 동일 vendor_normalized + 금액(±1%)이 3일 이내 재발생 시 duplicate 후보 |
| `detectPriceChanges` (FR-F5) | recurring vendor의 변경 전/후 구간 평균 비교, 15% 이상 증가 시 플래그 |
| `scoreAnomalies` (FR-F6) | 기준선 대비 3배 초과 시 anomaly 플래그. 기준선은 해당 vendor 거래가 3건 이상이면 **그 거래를 제외한 vendor 자체 평균**, 3건 미만(주로 일회성 vendor)이면 **전체 데이터셋 평균**을 사용한다 — vendor 평균만 쓰면 거래가 1건뿐인 신규 고액 지출은 비교 대상이 없어 영원히 탐지되지 않기 때문 |
| `generateOpportunities` (FR-F7) | 위 플래그들을 종합해 `type(DUPLICATE/PRICE_INCREASE/RECURRING_REVIEW/ANOMALY)/evidence/estimated_value/confidence/effort/priority` 생성. Priority = Impact(0~40)+Confidence(0~30)+Ease(0~30) (PRD 7장 산식 재사용) |

모든 임계값(±10%, 15%, 3배 등)은 MVP 휴리스틱이며, 실고객 데이터 확보 후 튜닝 대상으로 남겨둔다 (아래 Risks 참조).

## 접근 & RLS

- `spend_transactions`, `opportunities`: SELECT는 `organization_id = 'demo-org'`인 행에 한해 anon 허용. 그 외 조직 데이터는 anon 접근 불가.
- INSERT/UPDATE/DELETE: `service_role`만 가능 (anon/authenticated 쓰기 금지) — 데모 데이터 변조 방지.
- 시딩은 공개 API가 아니라 Supabase CLI/service-role 스크립트로 수동 실행 (운영자만 실행).
- "이제 실제 데이터를 넣어보시겠어요?" 전환 시 별도 회원가입 플로우(Epic A, Week2)로 이동, 신규 org 생성 — 데모 org와 완전 분리.

## Error Handling

- 시딩 스크립트 실패 시: 스크립트가 non-zero exit, 수동 재실행 필요 (사용자 대면 경로 아님).
- 프론트 조회 실패(네트워크/RLS 설정 오류): S5/S6에 재시도 버튼이 있는 에러 상태 표시.
- 엔진 내부에서 개별 거래 행 파싱 실패 시: 해당 행 skip + 경고 로그, 나머지 행 처리는 계속 진행 (데모 시딩 전체가 한 행 때문에 막히지 않도록).

## Testing Plan

- 유닛 테스트: `normalizeVendor`, `categorize`, `detectRecurring`, `detectDuplicates`, `detectPriceChanges`, `scoreAnomalies`, `generateOpportunities` — 각각 고정 입력→기대 출력.
- 통합 테스트: 픽스처 데이터셋으로 시딩+엔진 실행 → opportunities 5개 이상, DUPLICATE/PRICE_INCREASE/ANOMALY/RECURRING_REVIEW 타입이 각 1건 이상 존재하는지 검증.
- RLS 테스트: anon 클라이언트가 `demo-org` 데이터는 조회 가능, 다른 org_id는 빈 결과/거부되는지 검증.
- 멱등성 테스트: 시딩 스크립트를 두 번 실행해도 `spend_transactions`/`opportunities`가 중복 생성되지 않는지 검증 (해당 데모 데이터셋 truncate-then-insert 또는 upsert 방식).

## Open Risks

1. Supabase 무료 티어 한도(DB 용량, Edge Function 호출 수) — 이 규모에서는 여유 있을 것으로 예상되나 모니터링 필요.
2. 탐지 임계값(±10%, 15%, 3배 등)은 휴리스틱 추정치 — 실고객 데이터 확보 후 재조정 필요.
3. 샘플 데이터의 현실성 — 영업 미팅에서 "작위적으로 보이지 않는지"는 실제 시연 피드백으로 검증 필요 (PRD 12장 리스크 2번과 동일).
