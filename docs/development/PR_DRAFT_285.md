## Summary

이용권 지급 흐름에 지급 ledger(`ticket_grant`)와 사용자 노출 ledger(`ticket_grant_notice`)를 추가하고,
기존 이벤트/가입/구매/운영 수동 지급 경로를 새 구조로 연결했습니다.
또한 Admin 대시보드에서 수동 이용권 지급 시 notice 필드를 입력할 수 있게 하고,
지급/안내 이력을 조회할 수 있는 탭과 이벤트 보상 수동 지급 UI를 추가했습니다.

## Changes

- `ticket_grant`, `ticket_grant_notice`, `ticket.ticket_grant_id` 기반 스키마/도메인 추가
- signup / event / admin / payment 지급 경로를 `TicketGrantFacade` 기반으로 통합
- 사용자용 notice API 및 관리자용 ticket-grants 조회 API 추가
- Admin 대시보드에 지급/안내 이력 탭 추가
- Admin 대시보드에서 이용권 수동 지급 시 notice 관련 필드 입력 지원
- Admin 대시보드에서 이벤트 보상 수동 지급 UI 추가
- ERD / API / FE handoff / proposal 문서 업데이트
- 신규 grant/notice 단위 테스트 추가

## Type of Change

- [x] New feature (새로운 기능 추가)
- [x] Refactoring (기능 변경 없이 코드 개선)
- [x] Documentation (문서 변경)
- [ ] Bug fix (기존 기능을 수정하는 변경)
- [ ] Breaking change (기존 기능에 영향을 주는 변경)
- [ ] Chore (빌드, 설정 등)

## Target Environment

- [x] Dev (`dev`)
- [ ] Prod (`main`)

## Related Issues

- Closes #285

## Testing

- [x] `pnpm build`
- [x] `pnpm test src/modules/ticket/application/facades/ticket-grant.facade.spec.ts src/modules/ticket/application/services/ticket-grant-notice.service.spec.ts --runInBand`
- [ ] Postman/Swagger로 API 호출 확인
- [ ] E2E 테스트 통과

전체 테스트 참고:

- `pnpm test --runInBand --passWithNoTests` 실행 시 기존 unrelated 실패 1건 존재
- 실패 파일: `src/modules/interview/application/facades/interview.facade.spec.ts`
- 실패 내용: `mentioned_insight_ids` 기대값 `[1]` vs 실제 `[]`

## Checklist

- [x] 코드 컨벤션을 준수했습니다 (`docs/development/CODE_STYLE.md`)
- [x] Git 컨벤션을 준수했습니다 (`docs/development/GIT_CONVENTIONS.md`)
- [x] 네이밍 컨벤션을 준수했습니다 (`docs/development/NAMING_CONVENTIONS.md`)
- [x] 로컬에서 빌드가 성공합니다 (`pnpm run build`)
- [ ] 로컬에서 린트가 통과합니다 (`pnpm run lint`)
- [x] (API 변경 시) Swagger 문서가 업데이트되었습니다
- [x] (필요 시) 테스트 코드를 작성했습니다

## Screenshots (Optional)

- N/A

## Additional Notes

- 기존 `event_participation`, `ticket`, `payment` 데이터와 공존 가능한 additive migration 구조입니다.
- FE 적용 포인트는 `docs/development/FRONTEND_HANDOFF_TICKET_GRANT_NOTICE.md`에 정리했습니다.
- 기존 `GET /events/{eventCode}/feedback-modal` 경로는 유지되며, 엔트리 보상 노출의 단일 진실 원천은 새 notice API로 이동합니다.
