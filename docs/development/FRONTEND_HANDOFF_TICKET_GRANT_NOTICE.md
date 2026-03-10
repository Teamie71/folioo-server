# Frontend Handoff - Ticket Grant Notice Flow

## 목적

백엔드에서 이용권 지급 ledger(`ticket_grant`)와 사용자 노출 ledger(`ticket_grant_notice`)를 추가했습니다.

프론트는 기존 하드코딩/`sessionStorage` 기반 엔트리 모달 대신, 아래 API를 기준으로 보상 안내 모달을 제어하면 됩니다.

## 신규 API

### 1. 다음 보상 안내 조회

- `GET /users/me/ticket-grant-notices/next`
- 응답: `CommonResponse<TicketGrantNoticeResDTO | null>`

`result` 예시:

```json
{
    "id": 101,
    "ticketGrantId": 55,
    "status": "PENDING",
    "title": "보상이 지급되었어요",
    "body": "경험 정리 1회권",
    "ctaText": "보러가기",
    "ctaLink": "/tickets",
    "payload": {
        "displayReason": "서비스 이용 불편에 대한 보상",
        "rewards": [
            {
                "type": "EXPERIENCE",
                "quantity": 1
            }
        ]
    },
    "createdAt": "2026-03-08T00:00:00.000Z"
}
```

없으면 `result = null` 입니다.

### 2. shown 처리

- `PATCH /users/me/ticket-grant-notices/{noticeId}/shown`
- 모달이 실제 사용자에게 노출되었을 때 호출

### 3. dismiss 처리

- `PATCH /users/me/ticket-grant-notices/{noticeId}/dismiss`
- 사용자가 모달을 닫았을 때 호출

## FE 수정 포인트

### 기존 방식에서 바뀌는 점

- 기존 `sessionStorage` 기반 엔트리 보상 모달 판단 제거 필요
- 이벤트 코드 하드코딩 기반 보상 문구 조합 제거 가능
- 서버가 내려주는 `title`, `body`, `ctaText`, `ctaLink`, `payload.rewards`를 그대로 렌더하면 됨

### 권장 흐름

1. 앱 엔트리에서 `GET /users/me/ticket-grant-notices/next` 호출
2. `result`가 있으면 모달 렌더
3. 모달 open 시 `PATCH /shown`
4. 닫을 때 `PATCH /dismiss`

## 주의사항

- 기존 이벤트 API(`GET /events/{eventCode}/feedback-modal`)는 아직 살아있지만, 엔트리 보상 안내의 단일 진실 원천은 이제 `ticket-grant-notice`입니다.
- `payload.rewards`는 향후 여러 종류의 보상 조합을 위해 추가된 필드라, 프론트는 타입별 뱃지/문구 렌더링에 사용하면 됩니다.
- 운영 사유 원문과 사용자 노출 문구는 다를 수 있으므로, 프론트는 `payload.displayReason`만 사용자 문구로 사용해야 합니다.
