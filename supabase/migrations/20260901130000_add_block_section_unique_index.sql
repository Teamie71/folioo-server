-- ============================================================
-- SECTION_* 카테고리 블록의 동시 생성 경쟁 조건 방지
-- 애플리케이션 레벨의 사전 조회(존재 여부 확인 후 생성)만으로는
-- 같은 EXPERIENCE에 동시에 두 개의 생성/이동 요청이 들어올 경우
-- 둘 다 "없음"을 보고 중복 SECTION을 저장할 수 있다.
-- 같은 parent_id(EXPERIENCE) 아래 같은 SECTION_* kind는 하나만
-- 존재하도록 partial unique index로 원자성을 보장한다.
-- ============================================================

CREATE UNIQUE INDEX idx_block_unique_section_per_parent
    ON block (parent_id, kind)
    WHERE kind IN (
        'SECTION_DETAIL',
        'SECTION_ACHIEVEMENT',
        'SECTION_TASK',
        'SECTION_PROBLEM_SOLVING',
        'SECTION_LEARNING'
    );
