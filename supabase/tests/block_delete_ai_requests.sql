-- 빈 로컬 DB에서 실행: psql -v ON_ERROR_STOP=1 -f supabase/tests/block_delete_ai_requests.sql
BEGIN;
CREATE SCHEMA block_delete_regression;
SET LOCAL search_path TO block_delete_regression;
CREATE TABLE users (id INT PRIMARY KEY);
CREATE TABLE experience (id INT PRIMARY KEY);
CREATE TYPE portfolio_source_type_enum AS ENUM ('INTERNAL');
CREATE TYPE portfolio_status_enum AS ENUM ('not_started');
\ir ../migrations/20260807220000_create_block_tree_schema.sql
\ir ../migrations/20260918120000_scope_ai_experience_session_per_block.sql

INSERT INTO users VALUES (85);
INSERT INTO block (id, user_id, parent_id, level, kind, position) VALUES
    (1, 85, NULL, 1, 'GROUP', 0),
    (2, 85, NULL, 1, 'GROUP_UNCATEGORIZED', 1),
    (505, 85, 1, 2, 'EXPERIENCE', 0),
    (907, 85, 2, 2, 'EXPERIENCE', 0),
    (506, 85, 505, 3, 'CONTENT', 0);
INSERT INTO ai_experience_session (user_id, block_id, session_id) VALUES
    (85, 505, '00000000-0000-0000-0000-000000000505'),
    (85, 907, '00000000-0000-0000-0000-000000000907');
INSERT INTO ai_experience_request (user_id, session_id, request_id, request_hash)
SELECT user_id, session_id, session_id, repeat('a', 64) FROM ai_experience_session;

-- 기존 FK로는 요청 이력이 있는 활동 삭제가 실패한다.
DO $$ BEGIN
    BEGIN
        DELETE FROM block WHERE id = 505;
        RAISE EXCEPTION 'expected foreign key violation before migration';
    EXCEPTION WHEN foreign_key_violation THEN
        NULL;
    END;
END $$;

\ir ../migrations/20260930140000_cascade_ai_experience_requests_on_session_delete.sql

-- 내용 삭제와 그룹 삭제(활동을 미분류로 이동)는 세션을 유지한다.
DELETE FROM block WHERE id = 506;
UPDATE block SET parent_id = 2 WHERE parent_id = 1;
DELETE FROM block WHERE id = 1;
DO $$ BEGIN
    IF (SELECT count(*) FROM ai_experience_session) <> 2
        OR (SELECT count(*) FROM ai_experience_request) <> 2 THEN
        RAISE EXCEPTION 'content/group deletion removed AI state';
    END IF;
END $$;

DELETE FROM block WHERE id = 505;
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM block WHERE id = 505)
        OR EXISTS (SELECT 1 FROM ai_experience_session WHERE block_id = 505)
        OR EXISTS (SELECT 1 FROM ai_experience_request
            WHERE session_id = '00000000-0000-0000-0000-000000000505') THEN
        RAISE EXCEPTION 'activity deletion did not cascade';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM block WHERE id = 907)
        OR NOT EXISTS (SELECT 1 FROM ai_experience_session WHERE block_id = 907)
        OR NOT EXISTS (SELECT 1 FROM ai_experience_request
            WHERE session_id = '00000000-0000-0000-0000-000000000907') THEN
        RAISE EXCEPTION 'activity deletion affected another activity';
    END IF;
END $$;
ROLLBACK;
