# Folioo ERD

> 포트폴리오 관리 플랫폼 데이터베이스 설계서
> v2.3.0 | 2026-02-07

---

## 테이블 목록

| 도메인                   | 테이블                 | 설명                      |
| ------------------------ | ---------------------- | ------------------------- |
| **user**                 | `users`                | 사용자 정보               |
|                          | `social_user`          | 소셜 로그인 정보          |
|                          | `user_agreement`       | 약관 동의                 |
| **experience**           | `experience`           | 경험 정리                 |
|                          | `experience_source`    | 경험 정리 파일 (OCR 추출) |
| **portfolio**            | `portfolio`            | 포트폴리오                |
| **portfolio-correction** | `portfolio_correction` | 포트폴리오 첨삭           |
|                          | `correction_item`      | 첨삭 항목                 |
| **insight**              | `insight`              | 인사이트                  |
|                          | `insight_activity`     | 인사이트-활동 매핑        |
|                          | `activity`             | 활동                      |
| **ticket**               | `ticket_product`       | 이용권 상품 (구매용)      |
|                          | `ticket`               | 이용권 (보유/사용 추적)   |
| **payment**              | `payment`              | PayApp 결제 건            |
| **event**                | `event`                | 이벤트 정의               |
|                          | `event_participation`  | 이벤트 참여/진행도        |

---

## ERD 관계도

```
users
   │
   ├── 1:N ─ social_user (소셜 로그인)
   │
   ├── 1:N ─ user_agreement (약관 동의)
   │
   ├── 1:N ─ experience ─── 1:N ─ experience_source (OCR 추출)
   │
   ├── 1:N ─ portfolio ─── N:1 ─ experience (경험에서 생성, nullable)
   │
   ├── 1:N ─ portfolio_correction ─── 1:N ─ correction_item
   │                                        └─── N:1 ─ portfolio
   │
    ├── 1:N ─ activity ─── N:N ─ insight_activity ─── N:N ─ insight
    │
   ├── 1:N ─ ticket (이용권 보유)
   │           ├── N:1 ─ payment (구매로 획득 시)
   │           └── N:1 ─ event_participation (이벤트로 획득 시)
   │
   ├── 1:N ─ payment ─── N:1 ─ ticket_product (이용권 상품)
   │
   └── 1:N ─ event_participation ─── N:1 ─ event (이벤트 정의)
```

---

## Enum 정의

```typescript
// 사용자
UserState: 'GUEST' | 'ACTIVE' | 'INACTIVE';

// 소셜 로그인
LoginType: 'KAKAO' | 'NAVER' | 'GOOGLE';

// 약관
TermType: 'SERVICE' | 'PRIVACY' | 'MARKETING';

// 경험 정리
ExperienceStatus: 'ON_CHAT' | 'GENERATE' | 'DONE';

// 포트폴리오
SourceType: 'INTERNAL' | 'EXTERNAL';

// 포트폴리오 첨삭
PortfolioCorrectionStatus: 'DONE' | 'NOT_STARTED' | 'DOING_RAG' | 'COMPANY_INSIGHT' | 'GENERATING';

// 인사이트
InsightCategory: '대인관계' | '문제해결' | '학습' | '레퍼런스' | '기타';

// 이용권
TicketType: 'EXPERIENCE' | 'PORTFOLIO_CORRECTION';
TicketStatus: 'AVAILABLE' | 'USED' | 'EXPIRED';
TicketSource: 'PURCHASE' | 'EVENT';

// 결제 (PayApp 연동)
PaymentStatus: 'REQUESTED' | 'WAITING' | 'PAID' | 'CANCELLED' | 'REFUNDED' | 'PARTIAL_REFUNDED';
PayType: 'CARD' |
    'PHONE' |
    'BANK_TRANSFER' |
    'VIRTUAL_ACCOUNT' |
    'KAKAO_PAY' |
    'NAVER_PAY' |
    'TOSS_PAY';
```

> **Note**: `PaymentStatus`는 PayApp `pay_state` 값을 매핑합니다. `PayType`은 PayApp `pay_type` 값을 매핑합니다. 매핑 로직은 Gateway 레이어에서 처리.

---

## 테이블 상세

### users (사용자)

| 컬럼           | 타입        | 설명                           |
| -------------- | ----------- | ------------------------------ |
| id             | number      | PK                             |
| name           | varchar     | 이름                           |
| phone_num      | varchar(11) | 전화번호                       |
| state          | ENUM        | 상태 (GUEST, ACTIVE, INACTIVE) |
| deactivated_at | date        | 비활성화 일시                  |

> **Note**: 소셜 로그인 정보는 `social_user`로 분리. 크레딧은 이용권(ticket) 시스템으로 대체. 테이블명 `users`는 PostgreSQL 예약어 `user` 회피.

### social_user (소셜 로그인)

| 컬럼       | 타입         | 설명                               |
| ---------- | ------------ | ---------------------------------- |
| id         | number       | PK                                 |
| user_id    | number       | FK → users.id                      |
| login_type | ENUM         | 로그인 타입 (KAKAO, NAVER, GOOGLE) |
| login_id   | varchar(255) | 소셜 로그인 ID                     |
| email      | varchar(255) | 이메일                             |

> **Note**: `login_id`는 `varchar(255)`. 소셜 플랫폼 ID가 JS `number` 범위(2^53)를 초과할 수 있어 문자열로 저장.

### user_agreement (약관 동의)

| 컬럼      | 타입        | 설명                                    |
| --------- | ----------- | --------------------------------------- |
| id        | number      | PK                                      |
| user_id   | number      | FK → users.id                           |
| term_type | ENUM        | 약관 종류 (SERVICE, PRIVACY, MARKETING) |
| version   | varchar(10) | 약관 버전                               |
| is_agree  | boolean     | 동의 여부                               |
| agree_at  | datetime    | 동의 일시                               |

### experience (경험 정리)

| 컬럼     | 타입        | 설명                           |
| -------- | ----------- | ------------------------------ |
| id       | number      | PK                             |
| user_id  | number      | FK → users.id                  |
| name     | varchar(20) | 경험명                         |
| hope_job | ENUM        | 희망 직무                      |
| status   | ENUM        | 상태 (ON_CHAT, GENERATE, DONE) |

### experience_source (경험정리 파일)

| 컬럼           | 타입   | 설명               |
| -------------- | ------ | ------------------ |
| id             | number | PK                 |
| experience_id  | number | FK → experience.id |
| extracted_text | text   | OCR 추출 텍스트    |
| ocr_meta_data  | jsonb  | OCR 메타데이터     |

### portfolio (포트폴리오)

| 컬럼              | 타입         | 설명                          |
| ----------------- | ------------ | ----------------------------- |
| id                | number       | PK                            |
| user_id           | number       | FK → users.id                 |
| experience_id     | int (null)   | FK → experience.id (nullable) |
| name              | varchar(20)  | 활동명                        |
| description       | varchar(400) | 상세정보                      |
| responsibilities  | varchar(400) | 담당업무                      |
| problem_solving   | varchar(400) | 문제해결                      |
| learnings         | varchar(400) | 배운점                        |
| source_type       | ENUM         | 타입 (INTERNAL, EXTERNAL)     |
| contribution_rate | int          | 기여도                        |

> **Note**: `experience_id`는 nullable. `source_type = 'EXTERNAL'`인 포트폴리오는 경험 정리 없이 직접 생성 가능.

### portfolio_correction (포트폴리오 첨삭)

| 컬럼            | 타입          | 설명            |
| --------------- | ------------- | --------------- |
| id              | number        | PK              |
| user_id         | number        | FK → users.id   |
| title           | varchar(50)   | 제목            |
| company_name    | varchar(20)   | 지원기업명      |
| position_name   | varchar(20)   | 지원직무명      |
| job_description | varchar(700)  | Job Description |
| company_insight | varchar(1500) | 기업분석정보    |
| highlight_point | varchar(200)  | 참조포인트      |
| status          | ENUM          | 상태            |

> **Note**: `user_id`는 도메인 원칙에 따른 필수적인 관계 (`portfolio`, `insight`과 동일 패턴).

### correction_item (활동 첨삭)

| 컬럼                    | 타입             | 설명                         |
| ----------------------- | ---------------- | ---------------------------- |
| id                      | number           | PK                           |
| description             | jsonb (nullable) | 상세정보 첨삭                |
| responsibilities        | jsonb (nullable) | 담당업무 첨삭                |
| problem_solving         | jsonb (nullable) | 문제해결 첨삭                |
| learnings               | jsonb (nullable) | 배운점 첨삭                  |
| overall_review          | jsonb (nullable) | 총평 첨삭                    |
| portfolio_correction_id | number           | FK → portfolio_correction.id |
| portfolio_id            | number           | FK → portfolio.id            |

### insight (인사이트)

| 컬럼        | 타입         | 설명          |
| ----------- | ------------ | ------------- |
| id          | number       | PK            |
| user_id     | number       | FK → users.id |
| title       | varchar(50)  | 제목          |
| category    | ENUM         | 카테고리      |
| description | varchar(250) | 내용          |

### insight_activity (인사이트-활동 매핑)

| 컬럼        | 타입   | 설명             |
| ----------- | ------ | ---------------- |
| id          | number | PK               |
| insight_id  | number | FK → insight.id  |
| activity_id | number | FK → activity.id |

> **Note**: 인사이트와 활동의 N:M 관계를 위한 매핑 테이블. 하나의 인사이트는 여러 활동에 연결될 수 있고, 하나의 활동도 여러 인사이트에 연결될 수 있습니다.

### activity (활동)

| 컬럼    | 타입        | 설명          |
| ------- | ----------- | ------------- |
| id      | number      | PK            |
| user_id | number      | FK → users.id |
| name    | varchar(20) | 활동명        |

### ticket_product (이용권 상품)

| 컬럼           | 타입       | 설명                                           |
| -------------- | ---------- | ---------------------------------------------- |
| id             | number     | PK                                             |
| type           | ENUM       | 이용권 타입 (EXPERIENCE, PORTFOLIO_CORRECTION) |
| quantity       | int        | 수량 (1, 3, 5)                                 |
| price          | int        | 판매가 (VAT 포함)                              |
| original_price | int (null) | 할인 전 가격 (null이면 할인 없음)              |
| is_active      | boolean    | 판매 활성 여부 (NOT NULL, DEFAULT true)        |
| display_order  | int        | 표시 순서 (NOT NULL, DEFAULT 0)                |

> **Note**: 이용권 상품 예시 — 경험 정리 1회권 990원, 3회권 2,700원(~9%↓), 5회권 4,100원(~17%↓)

### ticket (이용권)

| 컬럼                   | 타입          | 설명                                           |
| ---------------------- | ------------- | ---------------------------------------------- |
| id                     | number        | PK                                             |
| user_id                | number        | FK → users.id                                  |
| type                   | ENUM          | 이용권 타입 (EXPERIENCE, PORTFOLIO_CORRECTION) |
| status                 | ENUM          | 상태 (AVAILABLE, USED, EXPIRED) NOT NULL       |
| source                 | ENUM          | 획득 경로 (PURCHASE, EVENT) NOT NULL           |
| payment_id             | number (null) | FK → payment.id (구매 시)                      |
| event_participation_id | number (null) | FK → event_participation.id (이벤트 시)        |
| used_at                | datetime      | 사용 일시 (nullable)                           |
| expired_at             | datetime      | 만료 일시 (nullable)                           |

> **Note**: 3회권 구매 시 `ticket` 레코드 3개 생성. 잔여 이용권 조회 = `SELECT COUNT(*) FROM ticket WHERE user_id = ? AND type = ? AND status = 'AVAILABLE'`

### payment (결제 — PayApp 연동)

| 컬럼              | 타입         | 설명                                      |
| ----------------- | ------------ | ----------------------------------------- |
| id                | number       | PK                                        |
| user_id           | number       | FK → users.id                             |
| ticket_product_id | number       | FK → ticket_product.id                    |
| mul_no            | number       | PayApp 결제요청번호 (UNIQUE)              |
| pay_url           | varchar(255) | PayApp 결제창 URL (nullable)              |
| status            | ENUM         | 결제 상태 (NOT NULL, DEFAULT 'REQUESTED') |
| pay_type          | ENUM         | 결제 수단 (nullable, 결제완료 시 확정)    |
| amount            | int          | 결제 요청 금액                            |
| card_name         | varchar(63)  | 카드사명 (nullable, 카드결제 시)          |
| pay_auth_code     | varchar(63)  | 승인번호 (nullable, 카드결제 시)          |
| card_quota        | varchar(31)  | 할부개월 (nullable)                       |
| paid_at           | datetime     | 결제완료 시각 (nullable)                  |
| cancelled_at      | datetime     | 취소 시각 (nullable)                      |
| var1              | varchar(127) | PayApp 임의변수1 — 주문추적용 (nullable)  |
| var2              | varchar(127) | PayApp 임의변수2 (nullable)               |

> **Note**: PayApp `feedbackurl`(webhook)로 결제 상태 변경을 수신합니다. `mul_no`는 PayApp의 결제 건 식별자이며 결제 취소 시에도 사용됩니다. PayApp `pay_state` 숫자 코드는 Gateway 레이어에서 `PaymentStatus` enum으로 변환합니다.

### event (이벤트)

| 컬럼              | 타입         | 설명                                               |
| ----------------- | ------------ | -------------------------------------------------- |
| id                | number       | PK                                                 |
| code              | varchar(50)  | 이벤트 고유 코드 (UNIQUE) — 'SIGNUP_REWARD' 등     |
| title             | varchar(100) | 이벤트 제목                                        |
| description       | varchar(500) | 이벤트 설명                                        |
| cta_text          | varchar(50)  | CTA 버튼 텍스트                                    |
| cta_link          | varchar(255) | CTA 링크 (nullable)                                |
| reward_config     | jsonb        | 보상 설정 — `[{type, quantity}]`                   |
| goal_config       | jsonb (null) | 달성 조건 — `{target, dailyLimit}` (null=즉시지급) |
| start_date        | date         | 시작일                                             |
| end_date          | date (null)  | 종료일 (null=무기한)                               |
| is_active         | boolean      | 활성 여부 (NOT NULL, DEFAULT true)                 |
| max_participation | int          | 최대 참여 횟수 (NOT NULL, DEFAULT 1)               |
| display_order     | int          | 표시 순서 (NOT NULL, DEFAULT 0)                    |

> **Note**: `reward_config` 예시: `[{"type": "EXPERIENCE", "quantity": 1}, {"type": "PORTFOLIO_CORRECTION", "quantity": 1}]`. `goal_config` 예시: `{"target": 10, "dailyLimit": 1}` (인사이트 로그 10개, 일 1개 인정). jsonb 기반이므로 **이벤트 추가 시 스키마 변경 불필요**.

### event_participation (이벤트 참여)

| 컬럼              | 타입     | 설명                                |
| ----------------- | -------- | ----------------------------------- |
| id                | number   | PK                                  |
| user_id           | number   | FK → users.id                       |
| event_id          | number   | FK → event.id                       |
| progress          | int      | 챌린지 진행도 (NOT NULL, DEFAULT 0) |
| is_completed      | boolean  | 달성 여부 (NOT NULL, DEFAULT false) |
| completed_at      | datetime | 달성 일시 (nullable)                |
| reward_granted_at | datetime | 보상 지급 일시 (nullable)           |

> **Note**: 이벤트별 동작 — 최초 가입: `goal_config=null` → 가입 시 즉시 participation 생성 + ticket 발급. 피드백: 관리자 검토 후 `reward_granted_at` 설정. 인사이트 챌린지: 로그 작성마다 `progress++`, `progress == target`이면 `is_completed=true` → ticket 발급.

---

## 인덱스 설계

> PostgreSQL은 FK에 자동 인덱스를 생성하지 않음. 아래 FK 컬럼에 `@Index()` 필요.

| 테이블                 | 인덱스 대상 컬럼                                  | 비고 |
| ---------------------- | ------------------------------------------------- | ---- |
| `social_user`          | `user_id`                                         |      |
| `user_agreement`       | `user_id`                                         |      |
| `experience`           | `user_id`                                         |      |
| `experience_source`    | `experience_id`                                   |      |
| `portfolio`            | `user_id`, `experience_id`                        |      |
| `portfolio_correction` | `user_id`                                         |      |
| `correction_item`      | `portfolio_correction_id`, `portfolio_id`         |      |
| `insight`              | `user_id`                                         |      |
| `insight_activity`     | `insight_id`, `activity_id`                       |      |
| `activity`             | `user_id`                                         |      |
| `ticket`               | `user_id`, `payment_id`, `event_participation_id` |      |
| `payment`              | `user_id`, `ticket_product_id`                    |      |
| `event_participation`  | `user_id`, `event_id`                             |      |

---

## 변경 이력

| 버전  | 날짜       | 변경 내용                                                                                                                                                                                                                                                                                    |
| ----- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2.3.0 | 2026-02-07 | Insight-Activity N:M 관계 재설계 — `insight_activity` 매핑 테이블 추가, `insight.activity_id` 제거. 인사이트는 pgvector 기반으로 관리.                                                                                                                                                       |
| 2.2.0 | 2026-02-04 | 설계 리뷰 전건 해결 — `user` → `users`(예약어 회피), snake_case 통일, `user_agreement` FK 정리, `portfolio_correction`에 `user_id` 추가, `login_id` bigint→varchar, FK 인덱스 설계 추가. 설계 리뷰 섹션 제거(전건 해결)                                                                      |
| 2.1.0 | 2026-02-04 | 크레딧 → 이용권(ticket) 시스템 전면 재설계 — `ticket_product`, `ticket`, `payment`(PayApp 연동), `event`, `event_participation` 신규. `pg_product`, `service_product`, `service_purchase`, `credit_transaction` 삭제. `portfolio.experience_id` nullable 확정. 설계 리뷰 16건 반영 현황 추가 |
| 2.0.0 | 2026-02-03 | 기획 변경에 따른 ERD 전면 개편 — SocialUser 분리, chat 제거, UserAgreement·Event 추가, User/Experience/Payment/creditTransaction 구조 변경                                                                                                                                                   |
| 1.1.0 | 2026-01-28 | user.img_url 컬럼 제거 (프로필 이미지 기능 미사용)                                                                                                                                                                                                                                           |
| 1.0.0 | 2026-01-16 | 최초 작성 (ERD 이미지 기반)                                                                                                                                                                                                                                                                  |
