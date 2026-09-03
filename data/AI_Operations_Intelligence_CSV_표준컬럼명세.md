# 데이터 업로드용 CSV 표준 컬럼 명세

## 1. 공통 원칙

### 파일 포맷
- UTF-8 CSV 권장
- 첫 행 Header 필수
- 날짜시간: ISO 8601 권장 (`2026-09-02T13:45:10+09:00`)
- 금액: 숫자만 (`120000`), 통화는 별도 컬럼
- 개인정보는 원칙적으로 분석 전에 비식별 ID로 변환
- 한 행 = 하나의 Event 또는 Transaction

### 공통 식별자
- `organization_id`: 고객사
- `dataset_id`: 업로드 배치
- `case_id`: 하나의 전환/업무 케이스(후원신청, checkout session, order 등)
- `event_id`: Event 고유값
- `event_name`: 표준 Event 이름
- `event_time`: Event 발생 시각

---

# 2. Donation Event CSV

파일명 예: `donation_events.csv`

| 컬럼 | 필수 | 타입 | 설명 | 예시 |
|---|:---:|---|---|---|
| organization_id | O | string | 기관 ID | org_001 |
| case_id | O | string | 후원 신청/세션 ID | doncase_10001 |
| donor_id | 권장 | string | 비식별 후원자 ID | d_8821 |
| event_id | O | string | 이벤트 ID | ev_100001 |
| event_name | O | enum | 표준 이벤트 | amount_selected |
| event_time | O | datetime | 발생시각 | 2026-09-02T10:11:22+09:00 |
| session_id | 권장 | string | 웹 세션 | s_123 |
| step_name | 권장 | string | UI 단계명 | donor_info |
| step_no | 권장 | int | 화면상 단계 | 3 |
| campaign_id | 선택 | string | 캠페인 | camp_01 |
| donation_type | 선택 | enum | one_time/recurring | recurring |
| amount | 선택 | number | 후원금 | 30000 |
| currency | 선택 | string | KRW 등 | KRW |
| payment_method | 선택 | string | card/cms/wallet | card |
| result | 선택 | enum | success/fail/cancel | fail |
| error_code | 선택 | string | 결제/validation 오류 | CARD_DECLINED |
| field_name | 선택 | string | 필드 오류 시 필드명 | phone |
| device_type | 선택 | string | mobile/desktop/tablet | mobile |
| browser | 선택 | string | 브라우저 | Safari |
| source_channel | 선택 | string | 유입채널 | instagram |
| page_url | 선택 | string | 경로 | /donate/checkout |
| metadata_json | 선택 | JSON string | 확장정보 | {"plan":"monthly"} |

### Donation 표준 Event Name
`campaign_view`, `donation_option_selected`, `amount_selected`, `donor_info_started`, `donor_info_completed`, `terms_started`, `terms_completed`, `payment_method_selected`, `payment_attempted`, `payment_success`, `payment_failed`, `confirmation_viewed`, `scheduled_payment`, `retry_attempted`, `payment_recovered`, `donor_contacted`, `donation_cancelled`, `donation_reactivated`

### Conversion 분석 최소조건
`case_id + event_name + event_time`은 반드시 있어야 한다.
`step_no`는 없어도 event_name 순서로 분석 가능하나, Designed Flow 비교를 위해 권장한다.

---

# 3. Commerce Event CSV

파일명 예: `commerce_events.csv`

| 컬럼 | 필수 | 타입 | 설명 | 예시 |
|---|:---:|---|---|---|
| organization_id | O | string | 고객사 | shop_01 |
| case_id | O | string | checkout/session/order 기준 케이스 | chk_1001 |
| customer_id | 선택 | string | 비식별 고객 | c_220 |
| order_id | 선택 | string | 주문 생성 후 ID | o_9981 |
| event_id | O | string | Event ID | ev_1 |
| event_name | O | enum | Event | checkout_started |
| event_time | O | datetime | 시각 | 2026-09-02T13:00:00+09:00 |
| session_id | 권장 | string | 세션 | ss_01 |
| step_name | 권장 | string | 화면단계 | shipping_info |
| step_no | 권장 | int | 단계 번호 | 5 |
| channel | 권장 | string | d2c/naver/coupang 등 | d2c |
| sku | 선택 | string | 상품 | SKU-100 |
| quantity | 선택 | int | 수량 | 2 |
| gross_amount | 선택 | number | 주문금액 | 58000 |
| discount_amount | 선택 | number | 할인 | 5000 |
| shipping_amount | 선택 | number | 배송비 | 3000 |
| currency | 선택 | string | 통화 | KRW |
| payment_method | 선택 | string | card/wallet/etc | card |
| result | 선택 | enum | success/fail/cancel | success |
| error_code | 선택 | string | 오류 | ADDRESS_VALIDATION |
| field_name | 선택 | string | 오류필드 | zipcode |
| device_type | 선택 | string | 기기 | mobile |
| source_channel | 선택 | string | 유입 | search |
| cs_type | 선택 | string | CS유형 | delivery |
| return_reason | 선택 | string | 반품사유 | size |
| metadata_json | 선택 | JSON string | 확장 | {"coupon":"WELCOME"} |

### Commerce 표준 Event Name — Conversion
`product_view`, `option_selected`, `add_to_cart`, `cart_view`, `checkout_started`, `login_started`, `guest_checkout_selected`, `customer_info_started`, `customer_info_completed`, `shipping_info_started`, `shipping_info_completed`, `coupon_applied`, `payment_method_selected`, `payment_attempted`, `payment_success`, `payment_failed`, `order_completed`

### Commerce 표준 Event Name — Operations
`order_confirmed`, `procurement_requested`, `fulfillment_started`, `shipment_requested`, `shipment_completed`, `delivery_completed`, `cs_created`, `cs_resolved`, `return_requested`, `return_approved`, `return_completed`, `refund_completed`, `settlement_completed`

---

# 4. Spend Transaction CSV

파일명 예: `spend_transactions.csv`

| 컬럼 | 필수 | 타입 | 설명 | 예시 |
|---|:---:|---|---|---|
| organization_id | O | string | 회사 | org_01 |
| transaction_id | O | string | 거래 고유값 | tx_001 |
| transaction_date | O | date/datetime | 거래일 | 2026-09-01 |
| vendor_name_raw | O | string | 원본 거래처 | AWS Seoul |
| amount | O | number | 금액 | 1280000 |
| currency | O | string | 통화 | KRW |
| payment_source | 권장 | string | card/bank/invoice | card |
| account_or_card_id | 선택 | string | 비식별 카드/계좌 | card_03 |
| department | 선택 | string | 부서 | Development |
| employee_id | 선택 | string | 비식별 사용자 | emp_10 |
| project_id | 선택 | string | 프로젝트 | p_100 |
| category_raw | 선택 | string | 원본 카테고리 | Cloud |
| memo | 선택 | string | 메모 | AWS monthly |
| invoice_id | 선택 | string | 세금계산서 | inv_10 |
| contract_id | 선택 | string | 계약 | con_02 |
| recurring_flag | 선택 | bool | 반복 여부 | true |
| subscription_start | 선택 | date | 구독시작 | 2025-01-01 |
| renewal_date | 선택 | date | 갱신 | 2026-12-01 |
| quantity | 선택 | number | 수량 | 20 |
| unit_price | 선택 | number | 단가 | 64000 |

### 시스템이 생성하는 파생 필드(업로드 불필요)
- `vendor_normalized`
- `category_normalized`
- `recurring_group_id`
- `duplicate_score`
- `anomaly_score`
- `price_change_pct`
- `savings_type`
- `estimated_savings`
- `confidence_score`

---

# 5. Data Quality Rule

## Blocker
- 필수 ID 없음
- 날짜 파싱 불가
- 금액 숫자 변환 불가
- 동일 event_id/transaction_id 중복

## Warning
- 10% 이상 event_name Unknown
- case_id 내 event_time 순서 이상
- payment_success인데 금액 없음
- Spend Vendor 이름 공백/불완전

## Quality Score 예시
- Completeness 40%
- Validity 25%
- Uniqueness 15%
- Event sequence consistency 20%

80점 이상: 분석 가능
60~79: 제한적 분석
60 미만: 수정 권고

---

# 6. 개인정보 원칙
- 이름, 전화번호, 주민번호, 카드 전체번호는 업로드 금지 기본값
- `donor_id`, `customer_id`, `employee_id`는 사전에 해시 또는 내부 익명키 사용
- 자유 텍스트 메모는 PII 탐지/마스킹 단계 권장
- 원본 파일과 분석용 변환 파일의 보관기간 정책 분리
