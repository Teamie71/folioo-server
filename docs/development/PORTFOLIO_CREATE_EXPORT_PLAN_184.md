# Portfolio Create And Export Plan (#184)

## Goal

- Define backend API strategy for "텍스트형 포트폴리오 생성" button flow.
- Decide ownership boundary for PDF export between FE and BE.
- Provide an implementation checklist that can be executed in small PRs.

## Current State

- `POST /portfolios/{portfolioId}/export` exists but returns `NOT_IMPLEMENTED`.
- Portfolio module supports:
    - `GET /portfolios/{portfolioId}`
    - `PATCH /portfolios/{portfolioId}`
    - `DELETE /portfolios/{portfolioId}`
- Experience module has completed conversation state and owns interview session id.
- Portfolio entity has `sourceType` (`INTERNAL`, `EXTERNAL`) and optional `experience` relation.

## Proposed API For Text Portfolio Creation

### Endpoint

- `POST /portfolios`

### Request (`CreatePortfolioReqDTO`)

- `sourceType: INTERNAL | EXTERNAL`
- `experienceId?: number`
- `name?: string` (optional only for `EXTERNAL`)

Validation rules:

- If `sourceType=INTERNAL`, `experienceId` is required.
- If `sourceType=EXTERNAL`, `experienceId` must be omitted.
- `INTERNAL` creation must enforce one-to-one with experience (no duplicate portfolio per experience).

### Response (`PortfolioResDTO`)

- `portfolioId`
- `sourceType`
- `experienceId` (nullable)
- `name`, `description`, `responsibilities`, `problemSolving`, `learnings`, `contributionRate`

### Error Handling

- Reuse existing `BusinessException` pattern.
- Add new error code for duplicate internal mapping:
    - `PORTFOLIO_ALREADY_EXISTS` (`PORTFOLIO4091`) -> HTTP 409
- Existing candidates:
    - `EXPERIENCE_NOT_FOUND`
    - `PORTFOLIO_NOT_FOUND`
    - `BAD_REQUEST`

## Layered Architecture Design

- Controller:
    - Input validation + Swagger contract.
    - Delegate to Facade/Service only.
- Facade:
    - Orchestrate cross-domain flow (`ExperienceService` + `PortfolioService`).
- Service:
    - Domain rule checks.
    - Portfolio creation and persistence.
- Repository:
    - Data access only (no throws).

Suggested flow for `sourceType=INTERNAL`:

1. Validate experience ownership by user.
2. Check existing portfolio bound to same experience.
3. Build initial portfolio from experience data.
4. Save and return DTO.

Suggested flow for `sourceType=EXTERNAL`:

1. Create empty or minimally initialized portfolio.
2. Save with `sourceType=EXTERNAL`.
3. Return DTO.

## Export Strategy Decision

### Decision

- FE owns PDF generation by default.

### Why

- FE already has rendered data from `GET /portfolios/{portfolioId}`.
- WYSIWYG consistency is easier in FE rendering context.
- Avoid BE runtime cost and complexity (headless browser/PDF library infra).

### Backend Responsibility Boundary

- Keep `POST /portfolios/{portfolioId}/export` as compatibility endpoint temporarily.
- Mark as deprecated in Swagger and docs.
- Remove endpoint in a follow-up when FE rollout reaches 100%.

### Cases Where BE Export Should Stay

- Regulatory requirement for server-side sealed document generation.
- Strong audit trail requirement for generated artifacts.
- Signed URL/file lifecycle requirements that FE cannot satisfy.

## Migration Plan

1. Introduce `POST /portfolios` first.
2. FE switches button action to call `POST /portfolios`, then render/export locally.
3. Keep `POST /portfolios/{portfolioId}/export` deprecated but available during transition.
4. Observe usage metrics and remove deprecated endpoint after stabilization.

## Risk And Mitigation

- Duplicate creation race for same experience:
    - Mitigate with DB-level uniqueness + service pre-check.
- FE PDF quality variance by browser:
    - Mitigate with a fixed FE export library/version and regression snapshots.
- Backward compatibility break:
    - Mitigate by phased deprecation window.

## Implementation Checklist

### Backend

- [ ] Add issue for `POST /portfolios` implementation.
- [ ] Add DTOs (`CreatePortfolioReqDTO`, `PortfolioResDTO`).
- [ ] Implement controller + facade + service flow.
- [ ] Add `PORTFOLIO_ALREADY_EXISTS` to error enum/map.
- [ ] Update `docs/API.md` + Swagger.
- [ ] Add tests for internal/external creation and duplicate guard.

### Frontend

- [ ] Button action: call `POST /portfolios`.
- [ ] Use returned portfolio data/id for editing and local PDF export.
- [ ] Add fallback UX for deprecated export endpoint if needed.

### Rollout

- [ ] Ship to dev.
- [ ] Validate with smoke + manual scenario.
- [ ] Create cleanup task to remove deprecated export endpoint.
