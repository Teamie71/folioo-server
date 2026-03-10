# Ticket Grant / Notice Redesign Proposal

## 목적

이 문서는 Folioo의 이용권 지급 흐름에서 다음 문제를 해결하기 위한 구조 개선안을 정리합니다.

- 이용권 발급 자체와 사용자 노출(모달/안내)이 강하게 결합되어 기획 변경 비용이 큼
- `event`, `ticket`, `admin`, 프론트 하드코딩 모달이 서로 다른 기준으로 동작함
- 운영 수동 지급의 지급 사유와 노출 상태가 영속적으로 남지 않음

이 문서는 현재 코드/ERD/API 문서를 기준으로, 신규 `ticket_grant` / `ticket_grant_notice` 도메인을 추가하는 방향을 제안합니다.

---

## 현재 구조 요약

### 문서상 책임 경계

- `Event`: 이벤트/챌린지 정책, 참여, 진행도, 보상 상태
- `Ticket`: 실제 이용권 자산(발급/차감/만료)
- `Admin`: 운영자 액션을 수행하는 지원 도메인

근거:

- `docs/architecture/DOMAIN_STRATEGY.md`
- `docs/architecture/ERD.md`

### 현재 코드상 동작

#### 1. Event가 과도하게 많은 역할을 담당

`src/modules/event/application/facades/event-reward.facade.ts`

- 가입 보상 지급
- 챌린지 진행도 반영
- 피드백 모달 데이터 조합
- self-claim 보상 지급
- 이벤트 participation 생성/락 처리

#### 2. Admin 수동 지급이 Ticket에 충분히 남지 않음

`src/modules/admin/application/facades/admin-event-reward.facade.ts`

- 이벤트 기반 수동 지급과 일반 티켓 수동 지급을 모두 담당
- 일반 티켓 수동 지급 DTO는 `reason`을 받음
- 하지만 `Ticket` 엔티티에는 이 사유를 저장할 필드가 없음

`src/modules/ticket/application/services/ticket.service.ts`

- `issueAdminTickets()`는 관리자 지급임에도 `TicketSource.EVENT`로 저장함
- `eventParticipationId`, `reason`, `actor` 정보가 남지 않음

#### 3. 프론트 모달이 서버 계약을 우회

서버에는 이미 이벤트 UI 계약이 일부 존재함.

- `GET /events/{eventCode}/feedback-modal`
- `GET /events/{eventCode}/progress-card`

하지만 실제 프론트에서는 아래처럼 하드코딩된 엔트리 모달이 동작함.

- `front/src/components/LayoutContent.tsx`
- `front/src/app/verify/page.tsx`
- `front/src/components/ChallengeModal.tsx`

결과적으로 다음 문제가 생김.

- 이벤트 코드가 프론트에 하드코딩됨
- 보상 문구와 CTA가 서버 설정과 분리됨
- "한 번 보여줬는가" 상태가 `sessionStorage`에 의존함
- 같은 사용자가 다른 기기/브라우저에서 접속하면 일관성이 깨짐

---

## 현재 구조의 핵심 문제

### 1. 보상 지급 기록과 보상 노출 기록이 분리되어 있지 않음

현재 구조에서는 아래 정보가 한 군데에 일관되게 모이지 않습니다.

- 누구에게
- 어떤 이유로
- 어떤 이용권을
- 누가/어떤 시스템이
- 언제 지급했는지
- 사용자에게 보여줬는지
- 사용자가 닫았는지

이 정보가 현재는 다음 위치에 흩어져 있습니다.

- 이벤트 보상: `event_participation`
- 외부 피드백 검토: `event_feedback_submission`
- 실제 이용권: `ticket`
- 엔트리 모달 노출: 프론트 로컬 상태 / 세션 스토리지

### 2. `event_participation`은 범용 지급 ledger로 쓰기 어려움

ERD상 `event_participation`은 `(user_id, event_id)` 유니크입니다.

즉 다음 요구사항이 오면 구조적으로 어색해집니다.

- 이벤트와 무관한 CS 보상
- 같은 사용자에게 여러 번 주는 운영 보상
- 동일 이벤트와 분리된 추가 보상 공지
- 지급은 됐지만 노출 방식/카피가 다른 여러 notice

### 3. Admin 지급이 fake event처럼 저장됨

`issueAdminTickets()`는 운영 지급인데 `TicketSource.EVENT`를 사용합니다.

이 상태는 다음 문제를 만듭니다.

- 데이터 조회 시 운영 지급과 이벤트 지급 구분이 어려움
- 지급 사유 분석이 어려움
- 나중에 보상 노출 정책을 붙일 때 event 중심으로 왜곡됨

---

## 제안 구조

### 핵심 원칙

- `Event`는 보상 정책과 이벤트 진행만 책임진다.
- `Ticket`은 실제 이용권 인벤토리만 책임진다.
- `TicketGrant`는 지급 사실과 지급 맥락을 책임진다.
- `TicketGrantNotice`는 사용자 노출 상태를 책임진다.

### 권장 책임 분리

#### Event

- 왜 보상을 줄 수 있는지 결정
- 이벤트 조건/진행/상태 관리
- 이벤트 기반 reward payload 계산

#### Ticket

- 실제 이용권 레코드 생성
- 차감/만료/잔액/이력 처리

#### TicketGrant (신규)

- 이번 지급이 어떤 비즈니스 맥락에서 발생했는지 기록
- 운영 사유와 지급 스냅샷 영속화
- 나중에 감사(audit), CS 응대, 재공지 판단의 기준 제공

#### TicketGrantNotice (신규)

- 이 지급을 사용자에게 어떻게 보여줄지 저장
- 아직 안 봤는지, 보여줬는지, 닫았는지 관리
- 프론트 엔트리 모달의 단일 진실 원천 역할

---

## 제안 ERD 초안

### ticket_grant

지급 사실의 ledger.

| 컬럼            | 타입              | 설명                                                   |
| --------------- | ----------------- | ------------------------------------------------------ |
| id              | bigint            | PK                                                     |
| user_id         | int               | FK -> users.id                                         |
| source_type     | enum              | `EVENT`, `SIGNUP`, `ADMIN`, `COMPENSATION`, `PURCHASE` |
| source_ref_id   | bigint null       | event_participation.id, payment.id 등                  |
| actor_type      | enum              | `SYSTEM`, `ADMIN`, `INTERNAL_API`                      |
| actor_id        | varchar(64) null  | 운영자 식별자 또는 시스템 식별자                       |
| reason_code     | varchar(64) null  | 내부 reason 분류 코드                                  |
| reason_text     | varchar(500) null | 내부 운영 메모/사유                                    |
| reward_snapshot | jsonb             | 지급 당시 이용권 구성 스냅샷                           |
| granted_at      | timestamp         | 실제 지급 시각                                         |
| created_at      | timestamp         | 공통 컬럼                                              |
| updated_at      | timestamp         | 공통 컬럼                                              |

`reward_snapshot` 예시:

```json
[
    { "type": "EXPERIENCE", "quantity": 1 },
    { "type": "PORTFOLIO_CORRECTION", "quantity": 1 }
]
```

권장 인덱스:

- `(user_id, granted_at desc)`
- `(source_type, source_ref_id)`
- `(actor_type, actor_id)`

### ticket_grant_notice

사용자에게 보여줄 노출 단위.

| 컬럼            | 타입              | 설명                            |
| --------------- | ----------------- | ------------------------------- |
| id              | bigint            | PK                              |
| ticket_grant_id | bigint            | FK -> ticket_grant.id           |
| user_id         | int               | FK -> users.id                  |
| status          | enum              | `PENDING`, `SHOWN`, `DISMISSED` |
| title           | varchar(100)      | 사용자 노출 제목                |
| body            | text              | 사용자 노출 본문                |
| cta_text        | varchar(50) null  | CTA 문구                        |
| cta_link        | varchar(255) null | CTA 링크                        |
| payload         | jsonb null        | 프론트 확장용 payload           |
| shown_at        | timestamp null    | 최초 노출 시각                  |
| dismissed_at    | timestamp null    | 닫기 처리 시각                  |
| expires_at      | timestamp null    | 만료 시각                       |
| created_at      | timestamp         | 공통 컬럼                       |
| updated_at      | timestamp         | 공통 컬럼                       |

권장 인덱스:

- `(user_id, status, created_at desc)`
- `(ticket_grant_id)`
- partial index: `status = 'PENDING'`

### ticket와의 관계

초기 단계에서는 `ticket`에 `ticket_grant_id`를 넣지 않아도 됩니다.

이유:

- 기존 `ticket.payment_id`, `ticket.event_participation_id` 구조를 바로 깨지 않아도 됨
- 우선은 지급 ledger와 notice 흐름을 안정화하는 것이 목표

다만 2단계 개선으로 아래를 고려할 수 있습니다.

- `ticket.ticket_grant_id` nullable 추가
- 각 ticket row가 어느 grant에서 생성됐는지 역추적 가능

---

## 모듈 경계 제안

### 권장 위치

신규 도메인은 `ticket` 도메인 아래에 두는 것을 권장합니다.

이유:

- 결과물의 본질이 "이용권 지급 ledger"임
- 이벤트/구매/운영 지급을 모두 포괄해야 함
- `Event`는 Core 정책 도메인이고, 모든 지급 케이스를 끌어안으면 다시 비대해짐

### 예시 구조

```text
src/modules/ticket/
  domain/
    entities/
      ticket.entity.ts
      ticket-grant.entity.ts
      ticket-grant-notice.entity.ts
    enums/
      ticket-source.enum.ts
      ticket-grant-source-type.enum.ts
      ticket-grant-actor-type.enum.ts
      ticket-grant-notice-status.enum.ts
  application/
    dtos/
      ticket-grant-notice.dto.ts
    services/
      ticket.service.ts
      ticket-grant.service.ts
      ticket-grant-notice.service.ts
    facades/
      ticket-grant.facade.ts
  infrastructure/
    repositories/
      ticket.repository.ts
      ticket-grant.repository.ts
      ticket-grant-notice.repository.ts
  presentation/
    ticket.controller.ts
    ticket-grant-notice.controller.ts
```

### 호출 원칙

- `EventRewardFacade`는 보상 조건이 충족되면 `TicketGrantFacade`를 호출
- `AdminEventRewardFacade`는 운영 지급 시 `TicketGrantFacade`를 호출
- `Payment` 완료 시 구매 지급이 발생하면 `TicketGrantFacade`를 호출
- `TicketGrantFacade`는 같은 트랜잭션에서
    - `ticket_grant` 저장
    - `ticket` 발급
    - 필요 시 `ticket_grant_notice` 생성

이렇게 해야 지급과 notice 생성이 분리 저장되어 불일치하는 문제를 줄일 수 있습니다.

---

## API 제안

### 사용자 엔트리용 notice 조회

#### GET `/users/me/ticket-grant-notices/next`

역할:

- 로그인 사용자의 가장 최신 `PENDING` notice 1건 조회
- 프론트 엔트리에서 모달 오픈 여부 판단의 단일 진실 원천

응답 예시:

```json
{
    "id": 101,
    "ticketGrantId": 55,
    "status": "PENDING",
    "title": "보상이 지급되었어요",
    "body": "경험 정리 1회권 + 포트폴리오 첨삭 1회권",
    "ctaText": "첨삭 의뢰하기",
    "ctaLink": "/correction/new",
    "payload": {
        "rewards": [
            { "type": "EXPERIENCE", "quantity": 1 },
            { "type": "PORTFOLIO_CORRECTION", "quantity": 1 }
        ],
        "displayReason": "서비스 이용 불편에 대한 보상"
    }
}
```

빈 결과일 경우 `result = null` 허용.

### notice shown 처리

#### PATCH `/users/me/ticket-grant-notices/{noticeId}/shown`

역할:

- 사용자가 notice를 실제 본 시점 기록
- 중복 호출은 멱등 처리

### notice dismissed 처리

#### PATCH `/users/me/ticket-grant-notices/{noticeId}/dismiss`

역할:

- 사용자가 모달을 닫았음을 기록
- `shown_at`이 비어 있으면 동시에 세팅 가능

### Admin 조회 API

#### GET `/admin/api/ticket-grants`

운영자가 아래를 볼 수 있어야 합니다.

- 누가 어떤 이유로 무엇을 받았는지
- 현재 notice가 `PENDING`인지 `SHOWN`인지 `DISMISSED`인지

#### POST `/admin/api/ticket-grants/{grantId}/notices`

필요 시 notice 재생성/재공지.

"다시 알림만 보내고 티켓은 재발급하지 않기" 요구를 수용할 수 있습니다.

---

## 프론트 개선 방향

### 현재 문제

- `LayoutContent`가 `sessionStorage`로 엔트리 모달을 제어함
- `verify/page.tsx`와 `ChallengeModal.tsx`도 각각 독립된 하드코딩 보상 UI를 가짐

### 목표

- 엔트리 보상 모달은 `ticket-grant-notice` API만 보고 판단
- 프론트는 copy 조합 로직을 최소화하고, 서버 payload를 표시만 함

### 권장 적용 순서

1. `front/src/components/LayoutContent.tsx`에서 `GET /users/me/ticket-grant-notices/next` 호출
2. 응답이 있으면 범용 보상 모달 컴포넌트 오픈
3. 모달 open 직후 또는 최초 렌더 시 `shown` 처리
4. 닫을 때 `dismiss` 처리
5. 기존 signup/weekly/compensation entry modal 하드코딩 제거

### 컴포넌트 전략

`OBTEventModal`을 완전히 버릴 필요는 없습니다.

다만 아래 둘 중 하나가 필요합니다.

- `OBTEventModal`을 범용 payload 기반 컴포넌트로 일반화
- `TicketGrantNoticeModal` 신규 컴포넌트 추가

추천은 후자입니다.

이유:

- OBT 전용 카피/스타일이 이미 섞여 있음
- 신규 범용 모달은 reward notice 계약만 받는 방향이 더 명확함

---

## 기존 도메인과의 정리 기준

### 유지

- `event_participation`: 이벤트 참여/진행/수령 상태
- `event_feedback_submission`: 피드백 검토/심사 이력
- `ticket`: 실제 이용권 인벤토리

### 신규 추가

- `ticket_grant`: 지급 ledger
- `ticket_grant_notice`: 사용자 노출 ledger

### 점진적 축소 후보

- `GET /events/{eventCode}/feedback-modal`
- 프론트의 signup/weekly/verify/challenge 하드코딩 보상 모달

이 API는 즉시 삭제보다 아래 중 하나로 정리하는 게 좋습니다.

- 이벤트 상세 페이지/피드백 CTA 전용 API로 역할 축소
- `ticket_grant_notice` 기반 UX로 이전 후 deprecated 처리

---

## 마이그레이션 순서

### Phase 1. DB 추가

- `ticket_grant` 테이블 추가
- `ticket_grant_notice` 테이블 추가
- enum 및 인덱스 추가

### Phase 2. 서버 기록 경로 추가

기존 발급 지점에서 모두 동일한 방식으로 grant를 남깁니다.

1. 가입 보상
    - `src/modules/user/application/facades/user-ticket.facade.ts`
2. 이벤트 보상
    - `src/modules/event/application/facades/event-reward.facade.ts`
3. 운영 수동 지급
    - `src/modules/admin/application/facades/admin-event-reward.facade.ts`
4. 구매 지급
    - `src/modules/ticket/application/services/ticket.service.ts`

### Phase 3. 사용자 notice API 추가

- next/shown/dismiss API 구현
- OpenAPI 반영 및 프론트 client 재생성

### Phase 4. 프론트 엔트리 전환

- `LayoutContent`에서 notice 기반 모달로 전환
- 기존 `sessionStorage` 기반 signup/weekly 지급 모달 제거

### Phase 5. 운영 조회 화면 보강

- 운영자가 grant / notice 상태를 확인할 수 있는 목록 API 추가
- 필요 시 admin SPA에 연결

### Phase 6. 기존 event UI API 정리

- `feedback-modal` / `progress-card` 역할 재정의
- notice 도메인으로 대체된 영역 deprecated 처리

---

## 주의할 점

### 1. 운영 사유와 사용자 문구를 분리해야 함

예:

- 내부 사유: `서비스 이용 불편에 대한 보상 - 상담 3차 응대`
- 사용자 노출 문구: `서비스 이용 불편에 대한 보상`

같은 문자열을 재사용하면 운영 메모가 그대로 UX에 노출될 수 있습니다.

### 2. notice는 서버 기준으로 exactly-once에 가깝게 처리해야 함

동일 사용자가 여러 탭/기기에서 진입할 수 있으므로 아래 중 하나가 필요합니다.

- `GET next` + conditional `PATCH shown`
- 또는 트랜잭션 기반 fetch-and-mark

### 3. `event_feedback_submission`의 물리적 위치는 추후 재정리 필요

현재는 Admin 모듈 아래에 있지만, 개념적으로는 Event reward review에 더 가깝습니다.

즉시 이동이 어렵다면 다음 원칙을 권장합니다.

- Admin은 조작자
- Event는 정책/심사 대상 상태 소유자

### 4. `TicketSource` enum 확장이 필요할 수 있음

현재 ERD와 코드 기준 `PURCHASE | EVENT`만 존재합니다.

신규 구조 도입 시 아래 중 하나를 선택해야 합니다.

- `TicketSource.ADMIN` 추가
- `TicketSource`는 기존 최소 상태로 유지하고, 정확한 출처는 `ticket_grant.source_type`에서 조회

권장은 두 번째입니다.

이유:

- `ticket`은 inventory 역할에 집중
- 상세 맥락은 ledger에서 조회

다만 현재 `issueAdminTickets()`가 `EVENT`로 저장하는 문제는 최소한 수정해야 합니다.

---

## 최종 권고

Folioo는 더 이상 `event_participation`을 확장해서 보상 노출 문제를 버티는 방향으로 가면 안 됩니다.

가장 확장 가능한 구조는 아래입니다.

1. `Event`는 정책과 조건을 관리한다.
2. `Ticket`은 실제 이용권 자산을 관리한다.
3. `TicketGrant`가 지급 사실과 운영 맥락을 남긴다.
4. `TicketGrantNotice`가 사용자 노출 상태를 관리한다.
5. 프론트 엔트리 모달은 `ticket_grant_notice` API를 단일 진실 원천으로 삼는다.

이 구조는 아래 요구사항 변동에 모두 대응하기 쉽습니다.

- 가입 보상
- 주차별 보상
- 피드백 보상
- CS 보상
- 운영 수동 지급
- 재공지
- 다른 CTA/문구/유효기간 규칙

---

## 후속 작업 체크리스트

- [ ] ERD에 `ticket_grant`, `ticket_grant_notice` 추가
- [ ] `docs/API.md`에 신규 notice API 추가
- [ ] `docs/architecture/ARCHITECTURE.md`의 모듈 구조 최신화
- [ ] `AdminEventRewardFacade` / `EventRewardFacade` / `TicketService` 지급 경로 정리
- [ ] 프론트 엔트리 모달을 notice API 기반으로 전환
- [ ] 기존 하드코딩 보상 모달의 책임 축소 또는 제거
