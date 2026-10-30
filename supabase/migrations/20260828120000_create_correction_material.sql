-- ============================================================
-- 첨삭 재료 전용 테이블 신설 (internal Portfolio 선택 경로 제거)
-- 기획 변경: 첨삭 재료는 이제 external portfolio 블록(즉석 작성/PDF 추출)으로만 존재한다.
-- correction_portfolio_selection + portfolio(EXTERNAL)를 재사용하던 경로를
-- portfolio-correction 도메인이 직접 소유하는 correction_material로 대체한다.
-- additive 마이그레이션이며, 기존 테이블/컬럼은 이번엔 지우지 않는다(후속 PR에서 정리).
-- ============================================================

CREATE TABLE correction_material (
    id BIGSERIAL PRIMARY KEY,
    portfolio_correction_id INT NOT NULL REFERENCES portfolio_correction(id) ON DELETE CASCADE,
    name VARCHAR(20) NOT NULL DEFAULT '',
    description VARCHAR(1000) NOT NULL DEFAULT '',
    responsibilities VARCHAR(1000) NOT NULL DEFAULT '',
    problem_solving VARCHAR(1000) NOT NULL DEFAULT '',
    learnings VARCHAR(1000) NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_correction_material_portfolio_correction_id ON correction_material(portfolio_correction_id);

-- correction_item이 기존 portfolio 대신 correction_material을 가리키도록 컬럼을 추가한다.
-- 기존 portfolio_id 컬럼은 후속 정리 PR 전까지 병행 보관한다.
ALTER TABLE correction_item ADD COLUMN correction_material_id BIGINT NULL REFERENCES correction_material(id) ON DELETE CASCADE;

-- ============================================================
-- 데이터 백필: EXTERNAL 소스로 선택된 기존 건만 이관한다.
-- INTERNAL portfolio를 선택했던 건은 이번 기획 변경으로 제거되는 경로라 이관하지 않는다.
-- legacy_portfolio_id는 correction_item 재배선을 위한 임시 브릿지 컬럼으로, 끝에 제거한다.
-- ============================================================

ALTER TABLE correction_material ADD COLUMN legacy_portfolio_id BIGINT;

INSERT INTO correction_material (
    portfolio_correction_id, name, description, responsibilities, problem_solving, learnings,
    created_at, updated_at, legacy_portfolio_id
)
SELECT
    cps.portfolio_correction_id, p.name, p.description, p.responsibilities, p.problem_solving, p.learnings,
    p.created_at, p.updated_at, p.id
FROM correction_portfolio_selection cps
JOIN portfolio p ON p.id = cps.portfolio_id
WHERE p.source_type = 'EXTERNAL';

UPDATE correction_item ci
SET correction_material_id = cm.id
FROM correction_material cm
WHERE ci.portfolio_id = cm.legacy_portfolio_id;

ALTER TABLE correction_material DROP COLUMN legacy_portfolio_id;
