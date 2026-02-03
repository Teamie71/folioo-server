# Folioo ERD

> 포트폴리오 관리 플랫폼 데이터베이스 설계서
> v2.0.0 | 2026-02-03

---

## 테이블 목록

| 도메인                   | 테이블                 | 설명                              |
| ------------------------ | ---------------------- | --------------------------------- |
| **user**                 | `user`                 | 사용자 정보                       |
|                          | `social_user`          | 소셜 로그인 정보                  |
|                          | `user_agreement`       | 약관 동의                         |
| **experience**           | `experience`           | 경험 정리                         |
|                          | `experience_source`    | 경험 정리 파일 (OCR 추출)         |
| **portfolio**            | `portfolio`            | 포트폴리오                        |
| **portfolio-correction** | `portfolio_correction` | 포트폴리오 첨삭                   |
|                          | `correction_item`      | 첨삭 항목                         |
| **insight**              | `insight`              | 인사이트 (ChromaDB에서 생성 예정) |
|                          | `activity`             | 활동                              |
| **payment**              | `payment`              | 결제 정보                         |
|                          | `pg_product`           | PG 상품                           |
|                          | `service_product`      | 서비스 내 상품                    |
|                          | `service_purchase`     | 서비스 내 상품 결제               |
|                          | `credit_transaction`   | 크레딧 거래 내역                  |
| **event**                | `event`                | 이벤트 (미정의)                   |

---

## ERD 관계도

```
user
   │
   ├── 1:N ─ social_user (소셜 로그인)
   │
   ├── 1:N ─ user_agreement (약관 동의)
   │
   ├── 1:N ─ experience ─── 1:N ─ experience_source (OCR 추출)
   │
   ├── 1:N ─ portfolio ─── N:1 ─ experience (경험에서 생성)
   │
   │         portfolio_correction ─── 1:N ─ correction_item
   │                                        └─── N:1 ─ portfolio
   │
   ├── 1:N ─ activity ─── 1:N ─ insight
   │
   ├── 1:N ─ payment ─── N:1 ─ pg_product
   │
   └── 1:N ─ credit_transaction ─── N:1 ─ payment
                                 └─── N:1 ─ service_purchase ─── N:1 ─ service_product
```

> **Note**: `portfolio_correction`은 `user`와 직접 FK 관계가 없습니다. `correction_item` → `portfolio` → `user` 경로로 간접 접근합니다.

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

// 결제
PaymentMethod: ENUM;
PaymentStatus: ENUM;
CreditTransactionType: 'EARN' | 'USE' | 'REFUND';

// 서비스 상품
ServiceProductType: '경험 정리' | '포트폴리오 첨삭';
```

---

## 테이블 상세

### user (사용자)

| 컬럼          | 타입        | 설명                           |
| ------------- | ----------- | ------------------------------ |
| id            | number      | PK                             |
| name          | varchar     | 이름                           |
| phone_num     | varchar(11) | 전화번호                       |
| state         | ENUM        | 상태 (GUEST, ACTIVE, INACTIVE) |
| deactivatedAt | date        | 비활성화 일시                  |

> **Note**: v2.0.0에서 `email`, `loginType`, `loginId`, `credit`, `isActive` 제거. 소셜 로그인 정보는 `social_user`로 분리, `isActive`는 `state` ENUM으로 대체.

### social_user (소셜 로그인)

| 컬럼      | 타입         | 설명                               |
| --------- | ------------ | ---------------------------------- |
| id        | number       | PK                                 |
| user_id   | number       | FK → user.id                       |
| loginType | ENUM         | 로그인 타입 (KAKAO, NAVER, GOOGLE) |
| loginId   | bigint       | 소셜 로그인 ID                     |
| email     | varchar(255) | 이메일                             |

### user_agreement (약관 동의)

| 컬럼     | 타입        | 설명                                    |
| -------- | ----------- | --------------------------------------- |
| id       | number      | PK                                      |
| TermType | ENUM        | 약관 종류 (SERVICE, PRIVACY, MARKETING) |
| version  | varchar(10) | 약관 버전                               |
| is_agree | boolean     | 동의 여부                               |
| agree_at | datetime    | 동의 일시                               |
| id2      | number      | FK → user.id                            |
| id3      | number      | FK (미정의)                             |

### experience (경험 정리)

| 컬럼     | 타입        | 설명                           |
| -------- | ----------- | ------------------------------ |
| id       | number      | PK                             |
| user_id  | number      | FK → user.id                   |
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

| 컬럼              | 타입         | 설명                      |
| ----------------- | ------------ | ------------------------- |
| id                | number       | PK                        |
| user_id           | number       | FK → user.id              |
| experience_id     | int          | FK → experience.id        |
| name              | varchar(20)  | 활동명                    |
| description       | varchar(400) | 상세정보                  |
| responsibilities  | varchar(400) | 담당업무                  |
| problem_solving   | varchar(400) | 문제해결                  |
| learnings         | varchar(400) | 배운점                    |
| source_type       | ENUM         | 타입 (INTERNAL, EXTERNAL) |
| contribution_rate | int          | 기여도                    |

> **Note**: v2.0.0에서 `experience_id`가 NOT NULL로 변경.

### portfolio_correction (포트폴리오 첨삭)

| 컬럼            | 타입          | 설명            |
| --------------- | ------------- | --------------- |
| id              | number        | PK              |
| title           | varchar(20)   | 제목            |
| company_name    | varchar(20)   | 지원기업명      |
| position_name   | varchar(20)   | 지원직무명      |
| job_description | varchar(700)  | Job Description |
| company_insight | varchar(1500) | 기업분석정보    |
| highlight_point | varchar(200)  | 참조포인트      |
| status          | ENUM          | 상태            |

> **Note**: v2.0.0에서 `user_id` FK 제거. `correction_item` → `portfolio` → `user` 경로로 간접 접근.

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

| 컬럼        | 타입         | 설명             |
| ----------- | ------------ | ---------------- |
| id          | number       | PK               |
| userId      | number       | FK → user.id     |
| activityId  | number       | FK → activity.id |
| title       | varchar(20)  | 제목             |
| category    | ENUM         | 카테고리         |
| description | varchar(250) | 내용             |

### activity (활동)

| 컬럼   | 타입        | 설명         |
| ------ | ----------- | ------------ |
| id     | number      | PK           |
| userId | number      | FK → user.id |
| name   | varchar(20) | 활동명       |

### payment (결제)

| 컬럼             | 타입         | 설명               |
| ---------------- | ------------ | ------------------ |
| id               | number       | PK                 |
| productId        | number       | FK → pg_product.id |
| userId           | number       | FK → user.id       |
| provider         | varchar(31)  | PG사               |
| method           | ENUM         | 결제수단           |
| currency         | varchar(3)   | 통화               |
| status           | ENUM         | 결제상태           |
| amountExpected   | int          | 기대금액           |
| amountCaptured   | int          | 결제완료금액       |
| amountAuthorized | int          | 가승인금액         |
| paPayment        | varchar(127) | PG결제키           |
| pgOrderNo        | varchar(127) | PG 주문번호        |
| failureCode      | varchar(63)  | 실패코드           |
| failureMessage   | varchar(255) | 실패메시지         |
| authorizedAt     | datetime     | 승인시각           |
| capturedAt       | datetime     | 매입시각           |
| canceledAt       | datetime     | 취소시각           |

### pg_product (PG 상품)

| 컬럼   | 타입        | 설명       |
| ------ | ----------- | ---------- |
| id     | number      | PK         |
| name   | varchar(20) | 상품이름   |
| price  | int         | 상품가격   |
| reward | int         | 제공크레딧 |

### service_product (서비스 내 상품)

| 컬럼  | 타입   | 설명                                  |
| ----- | ------ | ------------------------------------- |
| id    | number | PK                                    |
| type  | ENUM   | 상품타입 (경험 정리, 포트폴리오 첨삭) |
| price | int    | 서비스가격                            |

### service_purchase (서비스 내 상품 결제)

| 컬럼      | 타입         | 설명                    |
| --------- | ------------ | ----------------------- |
| id        | number       | PK                      |
| productId | number       | FK → service_product.id |
| Field     | VARCHAR(255) | (미정의)                |

### credit_transaction (크레딧 거래 내역)

| 컬럼              | 타입        | 설명                          |
| ----------------- | ----------- | ----------------------------- |
| id                | number      | PK                            |
| userId            | number      | FK → user.id                  |
| paymentId         | number      | FK → payment.id               |
| servicePurchaseId | number      | FK → service_purchase.id      |
| type              | ENUM        | 거래 타입 (EARN, USE, REFUND) |
| amount            | int         | 금액                          |
| balancedAfter     | int         | 거래 후 잔액                  |
| title             | varchar(20) | 결제명 (서비스상품명)         |

### event (이벤트)

| 컬럼  | 타입         | 설명     |
| ----- | ------------ | -------- |
| id    | number       | PK       |
| Field | VARCHAR(255) | (미정의) |

> **Note**: 이벤트 테이블은 현재 미정의 상태. 추후 컬럼이 추가될 예정.

---

## 변경 이력

| 버전  | 날짜       | 변경 내용                                                                                                                                  |
| ----- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| 2.0.0 | 2026-02-03 | 기획 변경에 따른 ERD 전면 개편 — SocialUser 분리, chat 제거, UserAgreement·Event 추가, User/Experience/Payment/creditTransaction 구조 변경 |
| 1.1.0 | 2026-01-28 | user.img_url 컬럼 제거 (프로필 이미지 기능 미사용)                                                                                         |
| 1.0.0 | 2026-01-16 | 최초 작성 (ERD 이미지 기반)                                                                                                                |
