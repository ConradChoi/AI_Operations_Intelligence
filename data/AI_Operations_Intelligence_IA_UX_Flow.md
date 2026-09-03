# 서비스별 화면 IA 및 UX Flow

## 1. 설계 원칙

### P1. 제품은 독립적으로 진입 가능
첫 화면에서 Donation / Commerce / Spend 중 하나만 선택해도 전체 Flow를 완료할 수 있다.

### P2. Process 제품의 1순위는 Conversion Step Reduction
Donation과 Commerce에서는 처음부터 내부 운영맵을 보여주기보다 **선택 → 결제 완료** 퍼널과 실제 경로를 가장 먼저 보여준다.

### P3. Insight보다 Action이 앞에 보여야 함
대시보드 상단은 ‘차트’보다 **Top Opportunities**를 먼저 보여준다.

### P4. 데이터 연결이 어려워도 시작 가능
MVP는 CSV 업로드를 기본으로 하고, Connector는 이후 확장한다.

---

# 2. 공통 IA

```text
/                         Landing
/products                 Product overview
/onboarding               Workspace onboarding
  /goal                    목표 선택
  /data-readiness          데이터 준비상태
  /upload                  파일 업로드
  /mapping                 컬럼 매핑
  /quality                 데이터 품질
/workspace
  /overview                전체 요약
  /opportunities           통합 Opportunity
  /actions                 개선과제/A-B Test/자동화
  /outcomes                Before/After
  /data                    데이터셋/연결
  /settings
/donation
  /overview
  /conversion
  /journeys
  /friction
  /payments
  /retention
  /leakage
  /recommendations
/commerce
  /overview
  /conversion
  /journeys
  /friction
  /operations
  /returns
  /channels
  /recommendations
/spend
  /overview
  /savings
  /vendors
  /recurring
  /anomalies
  /renewals
  /recommendations
/admin
```

---

# 3. 공통 Onboarding UX Flow

```text
Landing
  ↓
[무엇을 개선하고 싶으세요?]
  ├─ 후원 결제 전환
  ├─ 이커머스 구매 전환/운영
  ├─ 회사 지출 절감
  └─ 통합 진단
  ↓
[현재 가장 큰 문제]
  ↓
[데이터 준비상태 체크]
  ↓
[CSV/Excel 업로드]
  ↓
[AI 자동 컬럼 매핑]
  ↓
[사용자 확인/수정]
  ↓
[Data Quality Score]
  ↓
[분석 실행]
  ↓
[첫 결과: Top 3 Opportunities]
```

### First Value 원칙
사용자가 파일을 올린 후 첫 화면에서 반드시 다음 중 하나가 보여야 한다.
- `결제 완료까지 불필요하게 긴 단계 2개 발견`
- `이탈이 가장 큰 단계 1개 발견`
- `예상 Revenue Leakage ₩X`
- `예상 Savings ₩X`

---

# 4. Donation IA

## 4.1 Donation Overview
### 상단 KPI
- Completion Rate
- Median Steps to Complete
- Median Completion Time
- Payment Success
- Revenue Leakage

### Top Opportunities
카드 3개:
- 제거/통합 가능한 단계
- 이탈률 높은 단계
- 결제 Recovery 기회

### 하단
- Conversion Funnel
- 최근 4주 Trend
- Action 상태

## 4.2 Conversion 화면
### 목적
상품/금액 선택 이후 결제 완료까지 실제 Funnel을 분석.

### 구성
1. 기간/Device/Channel Filter
2. Funnel
3. 단계별 전환율/이탈
4. 단계별 중앙 체류시간
5. 오류율
6. Backtrack Rate

### Interaction
단계를 클릭하면 해당 단계 전/후의 실제 Variant와 오류를 Drill-down.

## 4.3 Journeys 화면
### Path Variant Explorer
- Variant #1: 6 Steps / CR 58%
- Variant #2: 8 Steps / CR 31%
- Variant #3: 11 Steps / CR 12%

### 비교
`Shortest Successful Path` vs `Most Common Path` vs `High-drop Path`

## 4.4 Friction 화면
Friction Score 기준 정렬:
- 불필요한 단계
- 반복 필드
- 장기 체류
- Backtrack
- Validation Error
- Page Reload

각 행에 `Merge / Remove / Make optional / Reorder / Pre-fill` 권고.

## 4.5 Payment & Recovery
- 결제수단별 Success
- 실패코드
- Retry 시간
- Recovery Rate
- 예상 Recovered Revenue

## 4.6 Leakage
Waterfall 형태:
`Potential Revenue → Form Drop → Payment Fail → No Retry → Cancel → Actual Revenue`

---

# 5. Commerce IA

## 5.1 Commerce Overview
- Product-to-Purchase
- Cart-to-Purchase
- Median Checkout Steps
- Checkout Duration
- Order-to-Ship
- Cost of Friction

## 5.2 Conversion
Donation과 동일한 Process Mining UI를 공유하되 이벤트가 Commerce Schema를 사용한다.

### 주요 Funnel
`product_view → option_selected → cart → checkout → customer_info → shipping → payment → complete`

## 5.3 Journey Variants
- 회원 구매
- 비회원 구매
- 쿠폰 경유
- 결제 실패 후 재시도
- 주소 오류 후 수정

각 Variant별 Steps / Duration / Conversion 표시.

## 5.4 Operations
Order 이후:
`confirmed → fulfillment → shipped → delivered → CS → return → refund`

Bottleneck Top 5와 Cycle Time 표시.

## 5.5 Returns
- SKU별 반품률
- 사유
- 승인시간
- 환불시간
- 금액 영향

## 5.6 Channel Compare
Coupang / Naver / D2C별 전환과 운영 KPI 비교.

---

# 6. Spend IA

## 6.1 Spend Overview
### KPI
- Total Spend
- Recurring Spend
- Identified Savings
- Realized Savings
- Anomaly Count

### Top Savings Opportunities
예:
- 중복 SaaS ₩1.2M
- Vendor 가격상승 ₩2.1M
- 자동갱신 ₩0.8M

## 6.2 Savings
Opportunity Table:
`Type / Vendor / Current Spend / Est. Savings / Confidence / Effort / Status`

## 6.3 Vendors
Vendor 360:
- 총액
- 추세
- 부서
- 반복성
- 단가변화
- 갱신
- 대체/통합 후보

## 6.4 Recurring
정기결제 타임라인 + 미사용 의심 구독.

## 6.5 Anomalies
이상치 Inbox. 사용자 피드백 `정상/검토/문제`를 받아 모델 학습.

## 6.6 Savings Tracker
Detected → Reviewed → Actioned → Verified → Saved

---

# 7. Opportunity Intelligence IA

## 7.1 Overview
모든 모듈의 Opportunity를 하나의 Backlog로 통합.

### 카드
**#1 Donation 정보입력 2단계 병합**
- Impact: Revenue +₩6.8M/month 가설
- Confidence: 72%
- Effort: Low
- Priority: 96

### 필터
- Product
- Revenue / Cost / Time
- Confidence
- Effort
- Owner
- Status

## 7.2 Opportunity Detail
1. 발견 근거
2. 현재 Process/Spend 상태
3. 권고안
4. 예상효과
5. 가정/Confidence
6. 실행방법
7. A/B Test 또는 Action 생성
8. 결과 측정

## 7.3 Outcomes
Before/After:
- Steps: 9 → 6
- Completion: 24.1% → 28.3%
- Time: 145s → 93s
- Revenue: +₩X

---

# 8. UX Flow — Conversion Optimization 핵심

```text
Upload Event Data
 ↓
AI detects Case/Session
 ↓
Actual Path Variants
 ↓
Shortest Successful Path 발견
 ↓
High Drop / High Time / High Error Step 탐지
 ↓
Designed Flow와 비교
 ↓
Step Reduction Candidate 생성
 ↓
경제효과/Confidence 추정
 ↓
A/B Test Backlog
 ↓
Variant 배포
 ↓
새 데이터 업로드/자동수집
 ↓
Before vs After
 ↓
Winning Pattern을 Benchmark에 축적
```

---

# 9. MVP 화면 우선순위

## Must
1. Login/Workspace
2. Product 선택
3. Upload
4. Column Mapping
5. Data Quality
6. Donation Conversion Funnel
7. Commerce Conversion Funnel
8. Path Variants
9. Spend Overview
10. Savings Opportunities
11. Top Opportunities
12. CSV/PDF 결과 Export(최소 CSV)

## Should
- Friction Heatmap
- Payment Failure
- Operations Bottleneck
- Vendor 360
- Action Tracker

## Later
- 실시간 Connector
- 자동 A/B Test 연동
- AI Agent 실행
- Industry Benchmark
