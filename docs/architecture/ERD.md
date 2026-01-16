# Folioo ERD

> 포트폴리오 관리 플랫폼 데이터베이스 설계서
> v1.0.0 | 2026-01-16

---

## 테이블 목록

| 도메인 | 테이블 | 설명 |
|--------|--------|------|
| **user** | `user` | 사용자 정보 |
| **experience** | `experience` | 경험 정리 |
| | `experience_source` | 경험 정리 파일 (OCR 추출) |
| | `chat` | 경험 정리 대화 (AI 채팅) |
| **portfolio** | `portfolio` | 포트폴리오 |
| **portfolio-correction** | `portfolio_correction` | 포트폴리오 첨삭 |
| | `correction_item` | 첨삭 항목 |
| **insight** | `insight` | 인사이트 (ChromaDB에서 생성 예정) |
| | `activity` | 활동 |
| **payment** | `payment` | 결제 정보 |
| | `pg_product` | PG 상품 |
| | `service_product` | 서비스 내 상품 |
| | `service_purchase` | 서비스 내 상품 결제 |
| | `credit_transaction` | 크레딧 거래 내역 |

---

## ERD 관계도

```
user
   │
   ├── 1:N ─ experience ─┬─ 1:N ─ experience_source (OCR 추출)
   │                     └─ 1:N ─ chat (AI 대화)
   │
   ├── 1:N ─ portfolio ─── N:1 ─ experience (경험에서 생성)
   │
   ├── 1:N ─ portfolio_correction ─── 1:N ─ correction_item
   │                                        └─── N:1 ─ portfolio
   │
   ├── 1:N ─ activity ─── 1:N ─ insight
   │
   ├── 1:N ─ payment
   │
   └── 1:N ─ service_purchase ─── N:1 ─ service_product
                              └─── 1:N ─ credit_transaction
```

---

## Enum 정의

```typescript
// 사용자
LoginType: 'KAKAO' | 'NAVER' | 'GOOGLE'

// 포트폴리오 첨삭
PortfolioCorrectionStatus: 'DONE' | 'NOT_STARTED' | 'DOING_RAG' | 'COMPANY_INSIGHT' | 'GENERATING'

// 채팅
ChatStatus: ENUM  // 진행 상태

// 포트폴리오
SourceType: 'INTERNAL' | 'EXTERNAL'

// 인사이트
InsightCategory: '대인관계' | '문제해결력' | '학습' | '레퍼런스' | '기타'

// 결제
PaymentMethod: ENUM
PaymentStatus: ENUM
CreditTransactionType: 'EARN' | 'USE' | 'REFUND'
```

---

## 테이블 상세

### user (사용자)

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | number | PK |
| name | varchar | 이름 |
| email | varchar(255) | 이메일 |
| loginType | ENUM | 로그인 타입 (KAKAO, NAVER, GOOGLE) |
| loginId | bigint | 소셜 로그인 ID |
| credit | number | 크레딧 잔액 |
| img_url | varchar(255) | 프로필 이미지 URL |
| phone_num | varchar(11) | 전화번호 |
| isActive | boolean | 활성 상태 |
| deactivatedAt | date | 비활성화 일시 |

### experience (경험 정리)

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | number | PK |
| user_id | number | FK → user.id |
| name | varchar(20) | 경험명 |
| hope_job | ENUM | 희망 직무 |

### experience_source (경험정리 파일)

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | number | PK |
| experience_id | number | FK → experience.id |
| extracted_text | text | OCR 추출 텍스트 |

### chat (경험정리 대화)

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | number | PK |
| experience_id | number | FK → experience.id |
| chat | JSON | 대화 내용 |
| status | ENUM | 진행 상태 |

### portfolio (포트폴리오)

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | number | PK |
| user_id | number | FK → user.id |
| experience_id | int (nullable) | FK → experience.id |
| name | varchar(20) | 활동명 |
| description | varchar(400) | 상세정보 |
| responsibilities | varchar(400) | 담당업무 |
| problem_solving | varchar(400) | 문제해결 |
| learnings | varchar(400) | 배운점 |
| source_type | ENUM | 타입 (INTERNAL, EXTERNAL) |
| contribution_rate | int (nullable) | 기여도 |

### portfolio_correction (포트폴리오 첨삭)

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | number | PK |
| title | varchar(20) | 제목 |
| company_name | varchar(20) | 지원기업명 |
| position_name | varchar(20) | 지원직무명 |
| job_description | varchar(700) | Job Description |
| company_insight | varchar(1500) | 기업분석정보 |
| highlight_point | varchar(200) | 참조포인트 |
| status | ENUM | 상태 |

### correction_item (활동 첨삭)

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | number | PK |
| description | int (nullable) | 상세정보 |
| responsibilities | int (nullable) | 담당업무 |
| problem_solving | int (nullable) | 문제해결 |
| learnings | int (nullable) | 배운점 |
| overall_review | int (nullable) | 총평 |
| portfolio_correction_id | number | FK → portfolio_correction.id |
| portfolio_id | int | FK → portfolio.id |

### insight (인사이트)

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | number | PK |
| userId | number | FK → user.id |
| activityId | number | FK → activity.id |
| title | varchar(20) | 제목 |
| category | ENUM | 카테고리 |
| description | varchar(250) | 내용 |

### activity (활동)

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | number | PK |
| userId | number | FK → user.id |
| name | varchar(20) | 활동명 |

### payment (결제)

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | number | PK |
| productId | number | PG 상품 ID |
| userId | number | FK → user.id |
| method | ENUM | 결제수단 |
| currency | varchar(3) | 통화 |
| status | ENUM | 결제상태 |
| amountExpected | int | 기대금액 |
| amountCaptured | int | 결제완료금액 |
| amountAuthorized | int | 가승인금액 |
| failureCode | varchar(127) | 실패코드 |
| failureMessage | varchar(253) | 실패메시지 |
| authorizedAt | datetime | 승인시각 |
| capturedAt | datetime | 결제취소시각 |
| canceledAt | datetime | 취소시각 |

---

## 변경 이력

| 버전 | 날짜 | 변경 내용 |
|------|------|----------|
| 1.0.0 | 2026-01-16 | 최초 작성 (ERD 이미지 기반) |
