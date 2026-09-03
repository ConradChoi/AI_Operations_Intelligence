# AI Operations Intelligence Platform 사업계획서 정식본

## 0. Executive Summary

### 사업 정의
본 사업은 기업과 기관의 **업무 흐름(Process)** 과 **돈의 흐름(Spend)** 을 분석해, 전환을 막는 단계와 비용 누수를 찾아내고 무엇부터 개선해야 가장 큰 경제적 효과가 나는지 제시하는 **AI Operations Intelligence Platform**이다.

제품은 독립 판매 가능한 3개 모듈과 통합 레이어로 구성한다.

1. **Donation Process Intelligence** — 후원 상품 선택부터 결제 완료, 정기결제 유지·실패·재결제까지의 전환 및 수익 누수 분석
2. **Commerce Process Intelligence** — 상품 선택·장바구니·주문·결제·완료부터 출고·배송·CS·반품·환불까지의 전환 및 운영 프로세스 분석
3. **Spend Intelligence** — 카드·계좌·세금계산서·SaaS·거래처 지출에서 낭비·중복·가격상승·절감기회 탐색
4. **Opportunity Intelligence** — Process와 Spend 결과를 금액·시간·전환율·실행 난이도로 통합하여 개선 우선순위를 제시

### 이번 기획에서 추가된 핵심 관점: Conversion Process Mining
후원과 이커머스에서 프로세스 마이닝의 1차 목적은 단순히 내부 업무 병목을 찾는 것이 아니다. **고객이 상품/후원금액을 선택한 순간부터 결제를 완료하는 순간까지 거쳐야 하는 단계와 입력 항목을 줄이고, 불필요한 분기와 오류를 제거하여 전환율을 높이는 것**이다.

따라서 Process Intelligence는 두 층으로 설계한다.

- **Layer A. Conversion Process Intelligence**: 선택 → 정보입력 → 인증/약관 → 결제수단 → 결제시도 → 완료의 실제 경로와 이탈 분석
- **Layer B. Operations Process Intelligence**: 결제 이후 재결제, 출고, 배송, CS, 반품, 정산 등 내부 운영 효율 분석

### 핵심 고객가치
- 어디에서 고객이 결제를 포기하는지 확인
- 어떤 단계·필드·분기가 전환을 떨어뜨리는지 확인
- 결제 실패와 후속 복구 과정의 누수 금액 계산
- 운영 프로세스의 지연시간과 재작업 비용 계산
- 기업 지출에서 절감 가능한 금액 계산
- 모든 개선기회를 경제적 효과 기준으로 우선순위화

### 고객용 핵심 메시지
> **결제까지 더 짧게. 운영은 더 빠르게. 지출은 더 가볍게.**

---

# 1. 사업 배경과 문제 정의

## 1.1 왜 Process Mining인가
기업과 기관은 일반적으로 고객 여정이나 업무 흐름을 기획서와 화면 정의서로 이해한다. 그러나 실제 사용자는 기획된 정상 경로만 따라가지 않는다. 이전 단계로 돌아가고, 동일 필드를 반복 입력하고, 오류를 만나고, 특정 결제수단에서 실패하며, 일부는 중간에 이탈한다.

따라서 다음 두 프로세스를 구분해야 한다.

- **Designed Flow**: 서비스가 의도한 흐름
- **Actual Flow**: 실제 이벤트 로그에서 확인되는 사용자·운영자의 흐름

Process Mining은 실제 이벤트를 기반으로 이 차이를 발견한다. Celonis 역시 Process Mining을 ERP·CRM·Excel 등의 시스템 데이터에서 실제 프로세스를 재구성하고 개선하는 기술로 설명한다.

## 1.2 왜 ‘단계 축소’가 핵심인가
결제 직전의 고객은 이미 높은 구매/후원 의도를 가지고 있다. 이 단계에서 불필요한 회원가입, 과도한 입력필드, 복잡한 약관·인증, 페이지 전환, 오류는 직접적인 매출 또는 후원금 손실로 이어진다.

- Baymard의 최근 Checkout UX 연구는 장바구니 이탈률이 약 70% 수준이며, 미국 온라인 소비자의 17%가 ‘너무 길거나 복잡한 Checkout’을 최근 주문 포기의 이유로 들었다고 보고한다.
- Blackbaud는 Donation Form에서 불필요한 단계와 필드를 줄이고 작은 변경을 테스트하는 것을 전환율 개선 방법으로 제안한다.

따라서 본 서비스는 Process Mining의 산출물을 ‘프로세스 맵’에서 끝내지 않고 **Step Reduction Opportunity**와 **Conversion Uplift Hypothesis**까지 연결한다.

## 1.3 왜 Spend Intelligence인가
회계·ERP는 ‘얼마를 썼는가’에는 강하지만 ‘무엇을 줄여야 하는가’에는 상대적으로 약하다. 기업은 중복 SaaS, 반복구독, 단가상승, 거래처 편중, 비정상 지출, 자동갱신을 지속적으로 놓친다.

Spend Intelligence는 단순 집계가 아니라 다음 질문에 답해야 한다.

> **지금 어떤 비용을 줄일 수 있으며, 실행하면 실제로 얼마가 절감되는가?**

---

# 2. 비전과 제품 전략

## 2.1 Vision
**기업의 실제 운영을 이해하고, 가장 가치 있는 개선기회를 발견하고, 실행 전후 성과까지 측정하는 AI Operations Intelligence Platform**

## 2.2 Product Architecture

```text
                 Operations Intelligence Platform
                           │
          ┌────────────────┴────────────────┐
          │                                 │
 Process Intelligence                Spend Intelligence
          │                                 │
   ┌──────┴──────┐                          │
   │             │                          │
Donation      Commerce                 Company Spend
   │             │                          │
   └─────────────┴────────────┬─────────────┘
                              │
                   Opportunity Intelligence
                              │
                   Action / Automation / Test
                              │
                       Outcome Measurement
```

## 2.3 독립성 + 결합성 원칙
각 제품은 독립적으로 구매·사용할 수 있어야 한다.

- 후원기관: Donation만 사용 가능
- 이커머스: Commerce만 사용 가능
- 일반 기업: Spend만 사용 가능

동일 고객이 두 개 이상을 사용하면 공통 데이터 모델을 통해 Opportunity Intelligence가 활성화된다.

---

# 3. 유사 유니콘 BM과 사업 설계에 주는 시사점

첨부 CB Insights Global Unicorn Club의 Enterprise Tech·Automation·Spend/Procurement 계열에서 본 사업과 인접한 모델은 **Celonis, Automation Anywhere, Workato, Ramp, Brex, Zip** 유형이다. 첨부 스냅샷의 기업가치 숫자는 시점에 따른 변동 가능성이 있으므로 사업계획에서는 구조적 BM을 중심으로 참고한다.

| 기업/유형 | 핵심 BM | 본 사업에 적용 |
|---|---|---|
| Celonis | Process Mining → Process Intelligence | 실제 이벤트 기반 프로세스 발견, 개선기회 정량화 |
| Automation Anywhere | Process Discovery → Automation ROI | 병목 발견 후 자동화 후보와 ROI 우선순위 |
| Workato | Integration/Workflow → Agent Orchestration | Insight 이후 실제 Workflow/Agent 실행 |
| Ramp | Spend Management → Savings | 지출 집계가 아니라 실제 절감액을 가치로 정의 |
| Brex | Spend Controls + Expense Automation | 지출 정책·이상거래·운영 자동화 확장 |
| Zip | Procurement Orchestration | 분석 이후 구매·계약·승인 프로세스로 확장 |

### 공통 성장 공식
**Observe → Understand → Detect → Quantify → Prioritize → Act → Measure → Learn**

본 사업은 이 공식을 한국형 Vertical 데이터와 연결해 차별화한다.

---

# 4. PRODUCT A — Donation Process Intelligence

## 4.1 제품 정의
후원자가 **후원 상품/금액을 선택한 시점부터 결제 완료까지의 실제 경로**와 이후 정기결제 유지·실패·재결제·해지를 함께 분석하여 **전환 손실과 Revenue Leakage를 줄이는 제품**이다.

## 4.2 핵심 고객
- 정기후원자 1,000명 이상 NGO/비영리
- 사회복지법인, 공익재단
- 종교·선교기관
- 학교/병원 발전기금 조직
- 협회 및 후원 플랫폼

### 초기 ICP
- 월 후원결제 건수가 충분해 퍼널 분석이 가능한 조직
- 온라인 후원폼/PG/CMS 로그를 추출할 수 있는 조직
- 후원 신청 대비 결제완료율 또는 결제 실패율을 개선하고 싶은 조직

## 4.3 분석 범위
### Conversion Layer
`campaign_view → donation_option_selected → amount_selected → donor_info_started → donor_info_completed → terms_completed → payment_method_selected → payment_attempted → payment_success → confirmation_viewed`

### Retention/Recovery Layer
`scheduled_payment → payment_failed → retry_attempted → payment_recovered → donor_contacted → donation_cancelled → donation_reactivated`

## 4.4 핵심 분석 질문
1. 선택 후 결제 완료까지 평균 몇 단계인가?
2. 가장 많은 이탈이 발생하는 단계는?
3. 되돌아가기/반복입력이 많은 단계는?
4. 모바일·브라우저·유입채널별 경로 차이는?
5. 특정 필드/약관/인증 직후 이탈이 증가하는가?
6. 결제수단별 성공률과 실패 원인은?
7. 결제 실패 후 Retry까지 시간이 얼마나 걸리는가?
8. 어떤 경로가 가장 높은 Conversion을 만드는가?

## 4.5 핵심 KPI
- Start-to-Complete Conversion Rate
- Step Conversion Rate
- Step Drop-off Rate
- Median Steps to Completion
- Median Time to Completion
- Backtrack Rate
- Repeat Input / Retry Rate
- Payment Success Rate
- Payment Recovery Rate
- 3/6/12개월 Retention
- Revenue Leakage
- Recovered Revenue

## 4.6 결과 화면
1. **Donation Conversion Funnel** — 단계별 사용자수, 전환, 이탈
2. **Actual Journey Map** — 실제 경로와 변형(variants)
3. **Step Friction Heatmap** — 체류시간, 오류, Backtrack, 반복입력
4. **Shortest Successful Path** — 성공한 고객의 최소 경로
5. **Revenue Leakage Map** — 이탈/실패를 금액으로 환산
6. **Payment Recovery Dashboard**
7. **Step Reduction Recommendations** — 제거·병합·선택적 노출 후보
8. **A/B Test Backlog** — 예상효과/난이도 기반 테스트 우선순위

## 4.7 대표 산출물 예시
> 현재 정상 설계 경로: 8단계 / 실제 성공경로 중앙값: 9단계 / 상위 이탈경로: 11~13단계
>
> 개선 제안: 후원자 정보 2단계 통합, 선택 약관 후행 처리, 동일 주소 필드 제거
>
> 목표: 중앙값 9단계 → 6단계, 완료시간 145초 → 95초, 전환율 +X%p 가설

## 4.8 가격
- Donation Conversion X-Ray: 200~500만원/회
- Donation Monitor: 30~100만원/월
- Enterprise: 별도 견적
- 향후: 회복된 후원금 기준 성과형 옵션

---

# 5. PRODUCT B — Commerce Process Intelligence

## 5.1 제품 정의
상품 선택부터 주문·결제 완료까지 Checkout Flow를 줄이고, 이후 출고·배송·CS·반품·환불까지의 운영 병목을 분석하는 **Commerce Conversion & Operations Intelligence** 제품이다.

## 5.2 초기 고객
- 월 GMV 1억~30억원
- 직원 5~50명
- 쿠팡·네이버·Cafe24·자사몰 등 멀티채널 판매
- 자체 브랜드 또는 반복 구매가 있는 전문몰

## 5.3 분석 범위
### Conversion Layer
`product_view → option_selected → add_to_cart → cart_view → checkout_started → login_or_guest → shipping_info → coupon_applied → payment_method → payment_attempted → order_completed`

### Operations Layer
`order_confirmed → procurement → fulfillment → shipped → delivered → cs_created → return_requested → return_approved → refund_completed → settlement_completed`

## 5.4 핵심 분석 질문
- 구매 성공 고객은 평균 몇 단계·몇 초 만에 완료하는가?
- 장바구니 이후 가장 많이 빠지는 단계는?
- 로그인/회원가입이 추가 경로를 만들고 있는가?
- 쿠폰/배송비 확인/주소 입력이 반복되는가?
- 결제 실패 후 재시도 경로는?
- 모바일과 PC의 실제 경로 차이는?
- 정상 경로보다 2단계 이상 긴 Variant 비중은?
- 주문 이후 어떤 단계가 CS/취소/반품을 유발하는가?

## 5.5 핵심 KPI
- Product-to-Purchase Conversion
- Cart-to-Checkout
- Checkout-to-Purchase
- Median Steps to Purchase
- Median Checkout Duration
- Backtrack Rate
- Form Error Rate
- Payment Failure Rate
- Order-to-Ship Time
- CS Rate per Order
- Return/Refund Rate
- Cost of Process Friction

## 5.6 결과 화면
- Conversion Journey Map
- Checkout Funnel
- Path Variant Explorer
- Step Friction Heatmap
- Device/Channel Comparison
- Shortest Successful Path
- Operations Bottleneck Map
- SKU Trouble Map
- Cost of Friction
- Step Reduction & A/B Test Recommendations
- Automation Opportunities

## 5.7 가격
- Commerce Conversion X-Ray: 150~300만원/회
- Commerce Monitor: 20~80만원/월
- Commerce Pro(Connector 포함): 100~300만원/월

---

# 6. PRODUCT C — Spend Intelligence

## 6.1 제품 정의
법인카드·계좌·세금계산서·SaaS·거래처 데이터에서 중복·이상·가격상승·미사용·거래처 편중을 탐지하여 **Identified Savings와 Realized Savings를 관리하는 제품**이다.

## 6.2 초기 고객
직원 20~200명 규모의 스타트업, IT기업, 에이전시, 전문서비스기업, 중소기업.

### 특징
- SaaS/클라우드 사용량이 많음
- 법인카드 사용자가 많음
- 구매팀 없이 각 부서가 개별 지출
- 거래처가 늘어나고 있으나 단가관리 체계가 약함

## 6.3 데이터
- 법인카드 거래
- 계좌 입출금
- 세금계산서/AP
- ERP 원장
- SaaS 구독목록
- 계약/갱신 정보

## 6.4 핵심 KPI
- Total Spend
- Category/Vendor/Department Spend
- MoM/YoY Change
- Recurring Spend
- Duplicate Payment
- Price Increase
- Vendor Concentration
- Unusual Spend
- Unused Subscription
- Renewal Risk
- Identified Savings
- Realized Savings

## 6.5 결과 화면
- Spend Overview
- Savings Opportunity
- Vendor 360
- Recurring/Subscription Map
- Price Change Alerts
- Anomaly Queue
- Renewal Calendar
- Savings Tracker

## 6.6 가격
- Spend X-Ray: 100~300만원/회
- Spend Monitor: 30~100만원/월
- Enterprise: 200만원+/월
- 선택형: 검증된 절감액의 10~20% 성과형 모델 테스트

---

# 7. PRODUCT D — Opportunity Intelligence

## 7.1 역할
독립 제품에서 발견된 Insight를 하나의 경제적 의사결정 체계로 통합한다.

### 예시
| Opportunity | 전환/매출 영향 | 비용 영향 | 시간 절감 | 실행 난이도 | Priority |
|---|---:|---:|---:|---:|---:|
| Donation 정보입력 2단계 통합 | +높음 | - | - | 낮음 | 96 |
| 이커머스 Guest Checkout 강화 | +높음 | - | - | 중간 | 93 |
| SaaS 중복 해지 | - | 월 180만원 | 2h | 매우 낮음 | 91 |
| 반품 승인 자동화 | 중간 | 월 250만원 | 40h | 중간 | 86 |

## 7.2 Opportunity Score 구성
- Conversion / Revenue Impact
- Cost Saving
- Time Saving
- Frequency
- Risk Reduction
- Confidence
- Implementation Effort(역점수)

---

# 8. 서비스 공통 Flow

## 8.1 고객 Flow
1. **서비스 선택** — Donation / Commerce / Spend / Combined
2. **목표 선택** — 전환율 개선 / 결제실패 감소 / 운영속도 / 비용절감
3. **Data Readiness Check**
4. **CSV/Excel 업로드 또는 Connector 연결**
5. **컬럼 자동매핑 + Data Quality 검증**
6. **분석기간/기준 설정**
7. **Process/Spend 모델 생성**
8. **Insight Dashboard**
9. **Opportunity 우선순위**
10. **Action/Test 등록**
11. **Before/After 측정**
12. **지속 모니터링**

## 8.2 Conversion Process Mining 분석 Flow
`Event ingestion → Session/Case 생성 → Path variant 생성 → Funnel → Friction detection → Step reduction candidates → Economic impact → A/B test recommendation → Outcome measurement`

---

# 9. 비즈니스 모델

## 9.1 Land: Productized Diagnostic
초기 고객 진입장벽을 낮추기 위해 1회 X-Ray로 시작한다.

## 9.2 Expand: Monitoring Subscription
동일 지표를 월별/주별로 자동 재분석한다.

## 9.3 Execute: Automation / Optimization Project
프로세스 개선, 화면 개선, n8n/Make/RPA/AI Agent 구축을 별도 프로젝트로 판매한다.

## 9.4 Scale: SaaS & Benchmark
고객 데이터가 쌓이면 업종 Benchmark와 자동 Opportunity Score를 유료화한다.

## 9.5 Outcome-based Pricing
특정 유형은 Recovered Revenue / Realized Savings에 연동한 성과형 수수료를 실험한다.

---

# 10. 경쟁 포지셔닝

## Process Intelligence
- **Celonis**: 시스템 이벤트 기반 실제 프로세스 발견과 Process Intelligence. 강력한 Enterprise 범용 플랫폼.
- **Automation Anywhere**: Process Discovery로 프로세스 변형을 발견하고 자동화 ROI를 우선순위화.

### 차별화
본 서비스는 ‘범용 Process Mining Tool’이 아니라 **Donation/Commerce의 결제 전환을 먼저 최적화하는 Vertical Conversion Process Intelligence**로 진입한다.

## Spend
- **Ramp/Brex**: 카드·Expense·Procurement를 통합하는 강력한 금융·Spend 플랫폼.

### 차별화
한국 금융 인프라를 처음부터 대체하지 않고 **기존 데이터를 읽어 절감기회를 찾아주는 Read-only Intelligence Layer**로 시작한다.

---

# 11. 진입장벽(Moat)

1. **Vertical Event Model** — 후원/Commerce 실제 Event Schema와 표준 KPI
2. **Step Friction Library** — 어떤 단계·패턴이 전환저하와 연관되는지 축적
3. **Korean Connector** — PG/CMS, Naver/Coupang/Cafe24, 더존/카드/은행 등
4. **Opportunity Library** — Problem → Action → Outcome
5. **Industry Benchmark** — 업종별 단계수, 완료시간, 실패율, 절감율
6. **Outcome Data** — 권고 전/후 성과 데이터

---

# 12. 3개월 MVP 계획

## Month 1 — Concierge Analysis
- Donation 3곳, Commerce 3곳, Spend 3곳 데이터 확보 목표
- CSV 기반 분석
- 고객별 X-Ray 보고서를 수동+AI 방식으로 제공
- 데이터 스키마 검증

## Month 2 — 반복 가능한 Engine
- Donation Conversion Funnel
- Commerce Checkout Funnel
- Spend Savings Rules
- Opportunity Score v0
- 유료 고객 3곳 목표

## Month 3 — Web MVP
- Upload → Mapping → Dashboard → Recommendation
- Case Study 3개
- 유료 고객 누적 5곳+
- 자동화/UX 개선 프로젝트 2건+

### 3개월 핵심 목표
- 최소 10개 실제 Dataset
- Conversion Process 개선 Before/After 2건 이상
- Identified Savings 사례 2건 이상
- 재구매/Monitor 전환 고객 2곳 이상

---

# 13. 1천만원 예산

| 항목 | 예산 |
|---|---:|
| MVP Web/Dashboard | 300만원 |
| 데이터 처리/LLM/Cloud | 100만원 |
| 분석 엔진/자동화 | 200만원 |
| 외부 개발/UX 지원 | 150만원 |
| 영업/출장/콘텐츠 | 100만원 |
| 개인정보/보안 | 50만원 |
| 예비비 | 100만원 |
| 합계 | 1,000만원 |

원칙: 플랫폼 풀개발보다 실제 고객 데이터와 Before/After Case 확보에 우선 투자한다.

---

# 14. 핵심 KPI 체계

## Business KPI
- 유료 고객 수
- Diagnostic → Monitor 전환율
- MRR
- ARPA
- 재구매율

## Conversion KPI
- Median Steps to Completion
- Median Time to Completion
- Step Drop-off Rate
- Checkout/Donation Completion Rate
- Payment Success Rate

## Operations KPI
- Cycle Time
- Rework/Backtrack Rate
- SLA
- Automation Potential

## Value KPI
- Recovered Revenue
- Identified Savings
- Realized Savings
- Saved Hours

### North Star
**Measured Value Created per Customer**
= 실제 회복 매출 + 실제 절감액 + 정량화된 시간절감 가치

---

# 15. 로드맵

### Phase 1. X-Ray Service
CSV 기반 Productized Consulting

### Phase 2. Monitoring SaaS
월별 데이터 업로드/자동 비교

### Phase 3. Connector
후원 PG/CMS, Commerce 채널, Spend 시스템 연동

### Phase 4. Opportunity Intelligence
통합 우선순위와 Benchmark

### Phase 5. Optimization & Automation
A/B Test, Workflow, AI Agent 실행

### Phase 6. AI Operations Agent
데이터를 상시 관찰하고 개선안을 제안·실행·검증

---

# 16. 최종 Positioning

## 고객용
**결제까지 더 짧게. 운영은 더 빠르게. 지출은 더 가볍게.**

## 설명형
**고객이 결제를 완료하기까지의 불필요한 단계를 줄이고, 운영 과정의 병목과 기업 지출의 낭비를 찾아 실제 경제성과로 연결하는 AI Operations Intelligence 서비스**

## 투자자용
**We turn conversion, operational, and spend data into measurable business outcomes.**

---

# 참고자료
- Celonis, What is Process Mining: https://www.celonis.com/insights/topics/what-is-process-mining
- Automation Anywhere, Process Discovery: https://www.automationanywhere.com/products/process-discovery
- Workato, Agent Orchestration: https://www.workato.com/agentic/agent-orchestration
- Ramp, Spend Management: https://ramp.com/blog/what-is-spend-management
- Brex, Spend Management: https://www.brex.com/product/spend-management
- Stripe, Checkout friction: https://stripe.com/resources/more/the-checkout-process-how-businesses-can-reduce-friction-and-boost-conversion
- Baymard, Checkout usability: https://baymard.com/research/checkout-usability
- Blackbaud, Donation form conversion: https://webfiles-sc1.blackbaud.com/files/support/helpfiles/rex/content/donfm-conversion-rate.html
