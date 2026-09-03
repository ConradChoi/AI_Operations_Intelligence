# MVP PRD — AI Operations Intelligence Platform v0.1

**문서 상태:** Draft for Planning Review  
**MVP 기간:** 12주  
**MVP 목적:** 세 제품의 공통 데이터 파이프라인과 핵심 Value 화면을 검증하되, 특히 Donation/Commerce에서 `선택 → 결제완료` 단계 축소 기회를 실제 데이터로 발견할 수 있는지 검증한다.

---

# 1. Product Goal

## Goal 1 — Conversion Process Mining
Donation/Commerce 이벤트 CSV를 업로드하면 실제 사용자 경로를 재구성하고 다음을 자동 계산한다.
- Funnel
- Path Variants
- Steps to Completion
- Time to Completion
- Drop-off
- Backtrack
- Error/Retry
- Shortest Successful Path
- Step Reduction Candidate

## Goal 2 — Spend Savings
Spend CSV에서 다음을 발견한다.
- Recurring Spend
- Duplicate 후보
- 가격 상승
- 이상 지출
- Vendor 집중
- Savings Opportunity

## Goal 3 — Opportunity Prioritization
발견사항을 Impact / Confidence / Effort로 정렬한다.

---

# 2. Non-goals v0.1
- 실시간 PG/API 연동
- 쿠팡/네이버 OAuth Connector
- 카드/은행 직접 연동
- 자동 UI 코드 수정
- 자동 A/B Test 배포
- 완전자율 AI Agent
- 정교한 산업 Benchmark
- 회계처리/법인카드 발급

---

# 3. Primary Personas

## P1 Donation Growth/운영 담당자
“후원폼 방문은 있는데 왜 결제까지 안 가는지, 어떤 단계를 줄여야 할지 알고 싶다.”

## P2 Commerce 대표/운영 책임자
“장바구니와 결제 데이터는 있는데 어느 단계가 구매를 막고, 주문 후 어디서 일이 꼬이는지 알고 싶다.”

## P3 Finance/CEO
“비용을 10% 줄이라고 하는데 어떤 지출부터 손대야 하는지 모르겠다.”

---

# 4. North Star & Success Criteria

## Product North Star
**Actionable Opportunity Rate** = 사용자가 실행 검토 대상으로 표시한 Opportunity / 전체 제안 Opportunity

## Conversion MVP Success
- 실제 고객 데이터에서 3개 이상 Path Variant 자동 재구성
- 성공/이탈 경로 구분 정확도 검수 통과
- 최소 1개 Step Reduction Candidate를 고객이 ‘타당’하다고 평가
- Pilot 2곳 이상에서 Before/After 테스트 설계

## Spend MVP Success
- Pilot 데이터에서 절감후보 자동 탐지
- 고객이 절감후보의 30% 이상을 검토가치 있다고 평가

---

# 5. User Stories

## Upload
- 고객으로서 CSV를 Drag & Drop하고 싶다.
- 시스템으로서 파일 유형을 자동 판단하고 싶다.

## Mapping
- 고객으로서 내 컬럼과 표준 컬럼을 자동 매핑받고 수정하고 싶다.
- 시스템으로서 매핑 확신도를 표시하고 싶다.

## Quality
- 고객으로서 분석 불가능한 데이터 문제를 구체적으로 알고 싶다.

## Conversion
- 고객으로서 실제 결제 성공 경로와 이탈 경로를 비교하고 싶다.
- 고객으로서 성공까지 평균 단계수와 최소 경로를 알고 싶다.
- 고객으로서 어떤 단계를 제거/통합할지 후보를 받고 싶다.

## Spend
- 고객으로서 줄일 수 있는 비용 후보와 근거를 알고 싶다.

## Opportunity
- 고객으로서 ‘가치가 큰 순서’로 실행 목록을 받고 싶다.

## Outcome
- 고객으로서 개선 전후 KPI를 기록하고 싶다.

---

# 6. Functional Requirements

## Epic A — Workspace & Project
### FR-A1
Workspace 생성: 조직명, 산업, 분석목표.
### FR-A2
Project 유형: Donation / Commerce / Spend.
### FR-A3
분석기간 설정.

## Epic B — Upload & Mapping
### FR-B1
CSV 최대 100MB(초기 가설, 기술검토 후 조정).
### FR-B2
헤더 탐지 및 Preview 20행.
### FR-B3
AI/Rule 기반 표준컬럼 추천.
### FR-B4
필수 컬럼 누락 차단.
### FR-B5
Mapping 저장/재사용.

## Epic C — Data Quality
### FR-C1
Null/중복/타입오류 검사.
### FR-C2
Event Sequence 이상 검출.
### FR-C3
Quality Score.
### FR-C4
오류행 CSV Export.

## Epic D — Conversion Mining
### FR-D1 Case 생성
`case_id`를 기준으로 Event 시간순 정렬.
### FR-D2 Funnel
관리자가 Canonical Funnel 순서를 선택/수정.
### FR-D3 Path Variant
각 Case의 event_name sequence를 Variant로 그룹화.
### FR-D4 KPI
- Case count
- Completion
- Drop-off
- Steps
- Duration
- Backtrack
- Error/Retry
### FR-D5 Shortest Successful Path
완료된 Case 중 Step이 가장 적은 유효 경로 식별.
### FR-D6 Friction Score
다음 신호를 조합:
- 높은 Drop-off
- 긴 Time
- 높은 Error
- Backtrack
- 반복 Event
### FR-D7 Step Reduction Candidate
Candidate 유형:
- REMOVE
- MERGE
- MAKE_OPTIONAL
- REORDER
- PREFILL
- INLINE
- GUEST_PATH
각 Candidate에는 Evidence와 Confidence를 표시.

## Epic E — Operations Mining
Commerce Operations 이벤트의 Cycle Time/병목 Top 5.
Donation 결제실패/Retry Recovery 분석.

## Epic F — Spend Analytics
### FR-F1 Vendor Normalization
### FR-F2 Category Auto Mapping
### FR-F3 Recurring Detection
### FR-F4 Duplicate Candidate
### FR-F5 Price Change
### FR-F6 Anomaly Score
### FR-F7 Savings Opportunity

## Epic G — Opportunity
### FR-G1 공통 Opportunity Schema
- product
- type
- evidence
- impact_type
- estimated_value
- confidence
- effort
- priority
- status
### FR-G2 Priority 정렬
### FR-G3 Action 생성
### FR-G4 Outcome 입력

---

# 7. Opportunity Scoring v0

MVP에서는 지나친 정밀 모델 대신 설명 가능한 점수를 사용한다.

`Priority = Impact(0~40) + Confidence(0~30) + Ease(0~30)`

### Impact
- Revenue/Savings 금액이 있으면 고객 데이터 내 Percentile 기준
- Conversion 문제는 Drop-off 규모 × 대상 금액으로 추정

### Confidence
- 표본수
- 반복 관측
- 데이터 완전성

### Ease
- 제거/필수해제/Pre-fill: 높음
- 화면통합/API 변경: 중간
- 핵심 결제 시스템 교체: 낮음

MVP의 점수는 ‘의사결정 보조’이며 실제 효과를 보장하지 않는다는 문구를 표시한다.

---

# 8. Key Screens / Acceptance Criteria

## S1 Project Setup
**AC**: 3분 이내 새 Project 생성 가능.

## S2 Upload
**AC**: CSV Preview와 Encoding 오류를 안내.

## S3 Mapping
**AC**: 필수컬럼 100% 매핑 전 분석 버튼 비활성.

## S4 Quality
**AC**: Blocker/Warning 분리.

## S5 Conversion Overview
**AC**:
- Funnel 표시
- Completion/Median Steps/Median Time
- Top Drop Step
- Top Opportunity 3개

## S6 Journey Explorer
**AC**:
- 상위 20 Variant
- 각 Variant Case 수/Conversion/Steps/Duration
- 성공/실패 Filter

## S7 Friction
**AC**:
- 단계별 Drop/Time/Error/Backtrack
- Candidate 권고

## S8 Spend Overview
**AC**:
- Spend total
- Vendor/Category
- Top Savings

## S9 Opportunities
**AC**:
- 모든 제품 Opportunity를 동일 Table로 확인
- 상태 변경

## S10 Outcome
**AC**:
- Before/After KPI 수기 입력 가능
- 개선률 계산

---

# 9. Analytics Event Tracking (제품 자체)

- workspace_created
- project_created
- dataset_uploaded
- mapping_confirmed
- analysis_started
- analysis_completed
- opportunity_viewed
- opportunity_accepted
- opportunity_rejected
- action_created
- outcome_recorded

---

# 10. Data Model v0

## organizations
`id, name, industry, created_at`

## projects
`id, organization_id, product_type, goal, period_from, period_to`

## datasets
`id, project_id, filename, schema_type, quality_score, status`

## events
`id, dataset_id, case_id, actor_id_hash, event_name, event_time, step_no, result, amount, metadata`

## spend_transactions
`id, dataset_id, transaction_date, vendor_raw, vendor_normalized, amount, currency, category, recurring_flag, metadata`

## path_variants
`id, project_id, signature, case_count, completed_count, median_steps, median_duration`

## opportunities
`id, project_id, type, title, evidence_json, impact_type, estimated_value, confidence, effort, priority, status`

## actions
`id, opportunity_id, action_type, owner, start_at, status`

## outcomes
`id, action_id, metric, before_value, after_value, period, verified_at`

---

# 11. Privacy/Security Requirements
- 업로드 전 PII 최소화 안내
- 직접 식별자 컬럼 탐지 Warning
- 원본파일 접근권한 분리
- 고객별 Tenant isolation
- 분석용 ID는 Hash/Pseudonym 사용
- 업로드 원본 보관기간 설정 가능
- 삭제 요청 시 원본/파생 데이터 처리정책 명확화
- 관리자 Audit Log

---

# 12. 12주 Delivery Plan

## Sprint 0 (Week 1)
- Schema 확정
- Pilot 데이터 샘플 수집
- Wireframe

## Sprint 1 (Week 2~3)
- Workspace/Project
- Upload/Mapping/Quality

## Sprint 2 (Week 4~5)
- Conversion Funnel
- Path Variant Engine
- Core KPI

## Sprint 3 (Week 6~7)
- Friction/Step Reduction
- Donation Recovery / Commerce Ops

## Sprint 4 (Week 8~9)
- Spend Rules
- Savings Dashboard

## Sprint 5 (Week 10)
- Opportunity 통합
- Action/Outcome

## Week 11
- Pilot QA / 보정

## Week 12
- Case Study / Pricing Test / Production Hardening

---

# 13. MVP 검증 실험

## Experiment 1 — Donation Step Reduction
- 기존 퍼널 데이터 분석
- Top Friction 1개 선정
- 폼 변경 또는 프로토타입 A/B
- Completion Rate / Steps / Time 비교

## Experiment 2 — Commerce Checkout
- 가장 높은 Drop 단계 선정
- Guest/필드축소/단계병합 가설 테스트

## Experiment 3 — Spend
- 3개월 이상 거래데이터 분석
- Savings 후보 10개 제공
- 고객 Valid/Invalid 평가
- 30일 후 실제 조치 확인

---

# 14. Definition of Done — MVP
1. Donation 또는 Commerce CSV를 업로드해 실제 Path Variant가 생성된다.
2. 결제 완료까지 단계수/시간/이탈이 계산된다.
3. Step Reduction Candidate가 Evidence와 함께 생성된다.
4. Spend CSV에서 Savings 후보가 생성된다.
5. Opportunity 화면에서 통합 우선순위를 볼 수 있다.
6. 고객이 Action/Outcome을 기록할 수 있다.
7. Pilot 고객의 실제 데이터로 결과 검수 및 Case Study가 최소 2건 생성된다.
