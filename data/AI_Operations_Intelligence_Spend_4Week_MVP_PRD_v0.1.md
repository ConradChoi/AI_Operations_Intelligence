# Spend Intelligence — 4주 MVP PRD v0.1

**문서 상태:** Draft Rev.2 (기존 `AI_Operations_Intelligence_MVP_PRD_v0.1.md` 12주/3라인 계획을 대체하는 축소판)
**범위 변경 사유:** 별도 GTM/영업 파이프라인 부재 + 리소스 제약으로 12주·3라인 동시 진행이 비현실적이라는 CEO 판단에 따라, 4주·Spend Intelligence 단일 라인으로 스코프를 좁힘. Donation/Commerce는 Phase 2 이후로 이연.
**Rev.2 변경사항:** 확보된 파일럿 후보 0곳, 예산 0원인 것으로 확인됨에 따라 전략을 **"파일럿 데이터로 먼저 검증 → 팔기"에서 "샘플 데이터 기반 데모를 먼저 만들어 영업 미팅에서 보여주고, 그 자리에서 실데이터 파일럿 전환을 유도"로 전환**. Week1 최우선 과제와 예산 섹션을 전면 수정.
**MVP 기간:** 4주
**MVP 목적:** Spend Intelligence 단일 트랙에서 CSV 업로드 → 절감 후보 탐지 → 대시보드 확인까지의 최소 웹 플로우를, 샘플 데이터 데모로 먼저 완성하고 이를 영업 도구로 활용해 첫 실데이터 파일럿까지 전환시킨다.

---

# 1. Product Goal

## Goal 0 — Sales-ready Demo (신규, 최우선)
파일럿 후보가 0곳인 상태이므로, 실데이터 없이도 영업 미팅에서 즉시 보여줄 수 있는 **샘플 데이터 기반 데모**를 가장 먼저 완성한다. 이 데모가 곧 첫 영업 자료다.

## Goal 1 — Savings Detection
Spend CSV를 업로드하면 다음을 자동 계산한다.
- Vendor Normalization
- Recurring Spend
- Duplicate 후보
- 가격 상승
- 이상 지출(Anomaly)
- Vendor 집중도
- Savings Opportunity

## Goal 2 — Self-serve Minimal Web Flow
CSV Drag&Drop → 컬럼 매핑 → 데이터 품질 확인 → Spend Overview → Savings Opportunity까지 사용자가 스스로 완료할 수 있는 최소 웹 플로우를 만든다.

## Goal 3 — Pilot 전환
데모를 활용한 영업 미팅에서 실제 기업의 관심을 실데이터 업로드(파일럿)로 전환시킨다. 0곳에서 시작하므로, 확보 자체가 4주 내 성과다.

---

# 2. Non-goals (4주 범위 제외)

기존 12주 PRD의 Non-goals에 아래를 추가한다.

- **Donation / Commerce 트랙 전체** (Phase 2 이후)
- **Opportunity Intelligence 통합 레이어** (여러 제품 통합 우선순위 스코어링 — 1라인만 있으므로 불필요)
- Vendor 360 상세 화면 (부서/추세/대체후보 등 심화 분석)
- Renewal Calendar
- Anomaly Queue의 사용자 피드백 학습 루프(정상/검토/문제 라벨링 → 모델 재학습)
- 실시간 PG/API/카드사/은행 연동, OAuth Connector
- 자동 UI 코드 수정, 자동 A/B Test 배포, 완전자율 AI Agent
- 산업 Benchmark
- 회계처리/법인카드 발급

---

# 3. Primary Persona

## P3 Finance/CEO (기존 PRD와 동일)
"비용을 10% 줄이라고 하는데 어떤 지출부터 손대야 하는지 모르겠다."

직원 20~200명 스타트업/IT/에이전시/전문서비스/중소기업, SaaS·법인카드 사용이 많고 구매팀 없이 부서별 개별 지출하는 조직.

---

# 4. Success Criteria (4주)

- **(Week1 말)** 샘플 데이터로 S1~S6 전 화면이 실제 영업 미팅에서 시연 가능한 상태
- **(Week2~4)** 데모를 활용한 영업 미팅 5곳 이상 진행
- **(Week4 말)** 그중 1곳 이상에서 실데이터 업로드 확보 → Savings Opportunity 자동 탐지 확인 (0곳에서 시작하므로 1곳 확보도 유의미한 성과로 간주)
- 실데이터를 확보한 경우, 탐지된 절감후보의 30% 이상을 고객이 "검토가치 있다"고 평가
- Upload → Mapping → Quality → Dashboard 전 과정을 사용자가 코드 개입 없이 완료 가능 (샘플/실데이터 공통)

---

# 5. Functional Requirements (범위 확정)

## Epic A — Workspace & Project (단순화)
### FR-A1
단일 조직(Workspace) 생성: 조직명, 산업. (Multi-tenant 구조는 유지하되 온보딩 UX는 최소화)
### FR-A2
Project 유형은 Spend 고정 (선택 UI 불필요).
### FR-A3
분석기간 설정.

## Epic B — Upload & Mapping (기존 PRD와 동일하게 유지)
### FR-B1
CSV 최대 100MB.
### FR-B2
헤더 탐지 및 Preview 20행.
### FR-B3
AI/Rule 기반 표준컬럼 추천 (`spend_transactions` 스키마 기준).
### FR-B4
필수 컬럼(`organization_id, transaction_id, transaction_date, vendor_name_raw, amount, currency`) 누락 차단.
### FR-B5
Mapping 저장/재사용.

## Epic C — Data Quality (기존 PRD와 동일하게 유지)
### FR-C1
Null/중복/타입오류 검사.
### FR-C2
Quality Score.
### FR-C3
오류행 CSV Export.

> Event Sequence 이상 검출(FR-C2 원본)은 Process Mining 전용이므로 이번 범위에서 제외.

## Epic F — Spend Analytics (기존 PRD Epic F 유지, 핵심 범위)
### FR-F1 Vendor Normalization
### FR-F2 Category Auto Mapping
### FR-F3 Recurring Detection
### FR-F4 Duplicate Candidate
### FR-F5 Price Change
### FR-F6 Anomaly Score
### FR-F7 Savings Opportunity
각 Opportunity에는 `type, evidence, estimated_value, confidence, effort` 표시. (Opportunity 공통 스키마 중 `product` 필드는 Spend 고정값으로 단순화, Priority 정렬 로직은 Impact/Confidence/Ease 3요소로 유지)

## Epic G' — Savings Opportunity (Epic G 축소판)
### FR-G1'
Spend 전용 Opportunity Table (product/status 필터는 제거, type/vendor/effort/confidence 필터만 유지).
### FR-G2'
Priority 정렬 (`Impact(0~40) + Confidence(0~30) + Ease(0~30)`, 기존 PRD 산식 재사용).
### FR-G3'
CSV Export.

> Action/Outcome 기록(FR-G3, FR-G4 원본)은 4주 범위에서 제외 — Phase 2에서 Opportunity Intelligence와 함께 재도입.

## Epic H — Demo / Sample Data Mode (신규, Week1 최우선)
### FR-H1 Sample Dataset
`spend_transactions_template.csv`를 기반으로, 실제 절감후보(중복 SaaS, 가격상승, 미사용 구독, 이상거래 등)가 눈에 띄게 드러나도록 설계된 현실적인 샘플 Spend 데이터셋(6~12개월치, 가상 회사)을 제작한다.
### FR-H2 One-click Demo
로그인/워크스페이스 생성 없이 "샘플로 체험하기" 버튼 한 번으로 S5(Spend Overview)~S6(Savings Opportunities)까지 즉시 볼 수 있어야 한다. (영업 미팅 중 네트워크/업로드 지연 없이 바로 시연 가능해야 함)
### FR-H3 Reset & Switch
데모 세션은 실제 고객 데이터와 완전히 분리되며, 언제든 리셋 가능하다. 영업 미팅 중 "이제 고객님 데이터를 넣으면 이렇게 됩니다"로 자연스럽게 전환할 수 있어야 한다.

> Epic H는 Epic A~C(Workspace/Upload/Quality)보다 먼저 완성해야 하는 항목이다 — 실데이터/파일럿이 없는 상태에서 영업이 가능하려면 데모가 먼저 있어야 한다.

---

# 6. Key Screens / Acceptance Criteria

> S5, S6은 샘플 데이터(Epic H)와 실데이터(Epic B 업로드) 양쪽에서 동일하게 동작해야 한다.

## S1 Project Setup
**AC**: 3분 이내 Workspace+Project 생성.

## S2 Upload
**AC**: CSV Preview와 Encoding 오류 안내.

## S3 Mapping
**AC**: 필수컬럼 100% 매핑 전 분석 버튼 비활성.

## S4 Quality
**AC**: Blocker/Warning 분리, Quality Score 표시.

## S5 Spend Overview
**AC**:
- Total Spend / Recurring Spend / Vendor·Category Spend
- Top Savings Opportunities 카드 3개
- MoM 변화 표시

## S6 Savings Opportunities
**AC**:
- Opportunity Table: Type / Vendor / Current Spend / Est. Savings / Confidence / Effort
- Priority 정렬
- CSV Export

## S7 Anomalies (Should — 시간 남으면)
**AC**: 이상거래 목록, 사유 표시 (피드백 루프 없이 조회만)

---

# 7. Data Model (기존 v0에서 Spend 관련만 사용)

## organizations
`id, name, industry, created_at`

## projects
`id, organization_id, product_type(spend 고정), period_from, period_to`

## datasets
`id, project_id, filename, schema_type, quality_score, status`

## spend_transactions
`id, dataset_id, transaction_date, vendor_raw, vendor_normalized, amount, currency, category, recurring_flag, metadata`

## opportunities
`id, project_id, type, title, evidence_json, impact_type, estimated_value, confidence, effort, priority, status`

> `events`, `path_variants`, `actions`, `outcomes` 테이블은 스키마만 유지하고 4주 범위에서는 미사용 (Phase 2에서 Donation/Commerce 도입 시 활용).

---

# 8. Privacy/Security Requirements (기존 PRD 유지)
- 업로드 전 PII 최소화 안내
- 직접 식별자 컬럼(카드 전체번호 등) 탐지 Warning
- 고객별 Tenant isolation
- `employee_id`, `account_or_card_id`는 해시/익명키 사용
- 관리자 Audit Log

---

# 9. 4주 Delivery Plan

## Week 1 — 데모 완성 (최우선) + 아웃바운드 착수
- Spend CSV 스키마 확정 (기존 `AI_Operations_Intelligence_CSV_표준컬럼명세.md` Spend 섹션 그대로 사용)
- **Epic H(샘플 데이터셋 + 원클릭 데모) 완성 — Week1 내 종료가 목표.** Recurring/Duplicate/Price Change/Anomaly/Savings Opportunity가 샘플 데이터에서 "그럴듯하게" 보이도록 값 설계
- S5 Spend Overview, S6 Savings Opportunities 화면 구현 (샘플 데이터 기준으로 먼저 완성 — 실데이터 업로드 파이프라인보다 화면이 먼저 나와야 영업이 가능)
- **영업 대상 리스트업 + 아웃바운드 시작** (사업계획서 6.2절 ICP: 직원 20~200명, SaaS/법인카드 사용 많은 스타트업/에이전시/전문서비스. 개인 네트워크·콜드 아웃바운드 등 무비용 채널만 사용)

## Week 2 — Upload/Mapping/Quality + 데모 미팅 시작
- FR-A1~A3, FR-B1~B5, FR-C1~C3 구현 (실데이터 업로드 경로 완성)
- FR-F1 Vendor Normalization, FR-F2 Category Auto Mapping 구현
- **데모 미팅 시작** — Week1 산출물(샘플 데모)로 첫 영업 미팅 진행, 미팅 종료 시 "귀사 데이터 업로드해보시겠어요?" 전환 시도

## Week 3 — Savings Rules Engine 고도화 + 미팅 지속
- FR-F3 Recurring Detection, FR-F4 Duplicate Candidate, FR-F5 Price Change, FR-F6 Anomaly Score 구현
- 데모 미팅 지속, 전환 의사 밝힌 곳부터 실데이터 업로드 지원
- 실데이터가 들어오면 즉시 결과 검토 → 로직 보정 (엣지케이스 대응)

## Week 4 — Opportunity Table + 실데이터 확보분 QA + Case Study
- FR-G1'~G3' Savings Opportunity Table + CSV Export
- 확보된 실데이터(0~N곳)로 QA 및 보정, 절감후보 Valid/Invalid 피드백 수집
- 실데이터 미확보 시: 샘플 데모 완성도와 영업 미팅 횟수·반응을 4주 성과로 기록하고 Week5 이후 전환 파이프라인으로 이월
- Case Study 초안(실데이터 있으면 실사례, 없으면 샘플 기반 "예상 효과" 형태) 1건, Pricing Test 대화 시작

---

# 10. Definition of Done — 4주 MVP
1. 샘플 데이터 기반 원클릭 데모(Epic H)가 완성되어 로그인/업로드 없이 즉시 영업 시연이 가능하다.
2. Spend CSV를 업로드해 Vendor Normalization과 Category Mapping이 자동 처리된다.
3. Recurring/Duplicate/Price Change/Anomaly 후보가 자동 탐지된다.
4. Savings Opportunity가 Evidence·Confidence·Priority와 함께 생성된다.
5. Spend Overview / Savings Opportunity 화면에서 결과를 CSV로 Export할 수 있다.
6. 데모를 활용한 영업 미팅이 5곳 이상 진행된다.
7. (달성 시) 실데이터를 확보한 고객의 결과가 검수되고, 절감후보의 30% 이상이 "검토가치 있음"으로 평가된다. (0곳 확보도 실패가 아니라 Week5 이후 파이프라인으로 이월되는 정상 시나리오로 취급)

---

# 11. 예산 재배분 (₩0 기준)

기존 사업계획서 13장의 1,000만원 예산(3라인·12주 기준)을 전액 철회하고, 4주·Spend 단일 라인은 **신규 현금 지출 없이** 진행하는 것으로 재편성한다.

| 항목 | 기존 예산 | Rev.2 (₩0) 처리 방식 |
|---|---:|---|
| MVP Web/Dashboard | 300만원 | 무료 티어 호스팅/DB(예: Vercel/Netlify + Supabase Free)로 자체 구축. 외주 없이 founder+AI 팀 자체 개발 |
| 데이터 처리/LLM/Cloud | 100만원 | 기존 보유 중인 개인/업무용 AI 구독(매몰비용)만 사용, 신규 API 유료 크레딧 구매 없음 — 무료/기존 한도 내에서 운용 |
| 분석 엔진/자동화 | 200만원 | Rule 기반 로직(Recurring/Duplicate/Price Change 등)은 자체 구현, 유료 라이브러리/서비스 미사용 |
| 외부 개발/UX 지원 | 150만원 | **삭제.** 외주 없음, 전량 자체 개발 |
| 영업/출장/콘텐츠 | 100만원 | **삭제.** 대면 출장 없이 원격 데모 미팅, 콜드 아웃바운드는 개인 네트워크/무료 채널(이메일, LinkedIn 등)만 사용 |
| 개인정보/보안 | 50만원 | 유료 컨설팅 없이 기존 PRD의 Privacy 원칙(8장)을 자체 적용 |
| 예비비 | 100만원 | **삭제.** 예비비 없음 — 예상치 못한 지출 발생 시 즉시 CEO 승인 필요(집행 전 확인) |
| **합계** | **1,000만원** | **0원** |

### ₩0 실행의 전제 조건 (열어둬야 할 리스크)
- 무료 티어 한도(호스팅 대역폭, DB 용량, API rate limit 등)를 4주 내 초과할 가능성 — 초과 시점에 유료 전환 여부를 그때 판단(사전 예산 미확보 상태이므로 즉시 의사결정 필요)
- 콜드 아웃바운드만으로 4주 내 영업 미팅 5곳을 확보하지 못할 수 있음 — Week1 리스트업 결과에 따라 목표 재조정 가능성 있음
- 외주 없이 founder(+AI 에이전트 팀) 단독 개발이므로, 일정 지연 시 스코프(Epic H 이후 항목)를 우선 축소하고 데모 완성도를 최우선으로 지킨다

---

# 12. 미해결 리스크 (다음 행동 필요)

1. **아웃바운드 채널**: 콜드 이메일/LinkedIn 외에 활용 가능한 기존 네트워크(투자자, 커뮤니티, 지인 창업자 등)가 있는지 확인 필요 — Week1 리스트업 속도에 직접 영향.
2. **데모 데이터 신뢰도**: 샘플 데이터가 "너무 작위적"으로 보이면 영업 미팅에서 신뢰를 잃을 수 있음 — Epic H 설계 시 실제 업종 패턴(SaaS 중복, 자동갱신 등)을 최대한 현실적으로 반영 필요.
3. **Phase 2 연결**: Donation/Commerce는 언제 재개할지 — 이번 4주 결과(영업 미팅 반응, 실데이터 확보 여부)를 Go/No-Go 기준으로 삼을지 결정 필요.
