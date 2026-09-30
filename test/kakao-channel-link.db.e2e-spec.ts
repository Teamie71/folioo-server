import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';
import { KakaoChannelLink } from '../src/modules/kakao-channel/domain/kakao-channel-link.entity';
import { KakaoChannelLinkRepository } from '../src/modules/kakao-channel/infrastructure/repositories/kakao-channel-link.repository';
import { KakaoChannelLinkService } from '../src/modules/kakao-channel/application/services/kakao-channel-link.service';
import { KakaoSkillFacade } from '../src/modules/kakao-channel/application/facades/kakao-skill.facade';
import { UserService } from '../src/modules/user/application/services/user.service';
import { User } from '../src/modules/user/domain/user.entity';
import { UserStatus } from '../src/modules/user/domain/enums/user-status.enum';
import { textResponse } from '../src/modules/kakao-channel/application/kakao-skill-response';
import { KAKAO_MESSAGES } from '../src/modules/kakao-channel/application/kakao-messages';

const databaseUrl = process.env.KAKAO_TEST_DATABASE_URL;
const describeDatabase = databaseUrl ? describe : describe.skip;

describeDatabase('Kakao channel link PostgreSQL contract', () => {
    let db: DataSource;
    let service: KakaoChannelLinkService;

    beforeAll(async () => {
        const url = new URL(databaseUrl!);
        if (
            !['localhost', '127.0.0.1'].includes(url.hostname) ||
            url.pathname !== '/kakao_skill_test'
        ) {
            throw new Error('Only an isolated local kakao_skill_test database is allowed');
        }
        db = new DataSource({
            type: 'postgres',
            url: databaseUrl,
            entities: [KakaoChannelLink],
            synchronize: false,
            namingStrategy: new SnakeNamingStrategy(),
        });
        await db.initialize();
        // 전체 운영 스키마 대신 FK 대상의 실제 키 타입을 재현한다.
        await db.query('CREATE TABLE users (id INT PRIMARY KEY)');
        await db.query('CREATE TABLE block (id BIGINT PRIMARY KEY)');
        await db.query(
            readFileSync(
                join(
                    __dirname,
                    '../supabase/migrations/20260928120000_create_kakao_channel_link.sql'
                ),
                'utf8'
            )
        );
        service = new KakaoChannelLinkService(
            new KakaoChannelLinkRepository(db.getRepository(KakaoChannelLink))
        );
    });

    beforeEach(async () => {
        await db.query('TRUNCATE users, block CASCADE');
        await db.query('INSERT INTO users (id) VALUES (1), (2)');
        await db.query('INSERT INTO block (id) VALUES (9007199254740993), (12)');
    });

    afterAll(async () => {
        if (db?.isInitialized) {
            await db.query('DROP TABLE kakao_channel_link, block, users');
            await db.destroy();
        }
    });

    it('마이그레이션의 전체 컬럼·타입·NULL 제약을 확인한다', async () => {
        const columns: { column_name: string; data_type: string; is_nullable: string }[] =
            await db.query(
                "SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'kakao_channel_link' ORDER BY ordinal_position"
            );
        expect(columns).toEqual([
            { column_name: 'user_id', data_type: 'integer', is_nullable: 'NO' },
            { column_name: 'kakao_app_user_id', data_type: 'character varying', is_nullable: 'NO' },
            { column_name: 'current_block_id', data_type: 'bigint', is_nullable: 'YES' },
            {
                column_name: 'activity_selected_at',
                data_type: 'timestamp with time zone',
                is_nullable: 'YES',
            },
            { column_name: 'turn_request_id', data_type: 'uuid', is_nullable: 'YES' },
            {
                column_name: 'turn_locked_until',
                data_type: 'timestamp with time zone',
                is_nullable: 'YES',
            },
            { column_name: 'created_at', data_type: 'timestamp with time zone', is_nullable: 'NO' },
            { column_name: 'updated_at', data_type: 'timestamp with time zone', is_nullable: 'NO' },
        ]);
    });

    it('user_id PK·카카오 ID UNIQUE·FK가 적용된다', async () => {
        await service.link(1, 'k1');
        await expect(
            db.query("INSERT INTO kakao_channel_link (user_id, kakao_app_user_id) VALUES (1, 'k2')")
        ).rejects.toMatchObject({ code: '23505' });
        await expect(
            db.query("INSERT INTO kakao_channel_link (user_id, kakao_app_user_id) VALUES (2, 'k1')")
        ).rejects.toMatchObject({ code: '23505' });
        await expect(
            db.query("INSERT INTO kakao_channel_link (user_id, kakao_app_user_id) VALUES (3, 'k3')")
        ).rejects.toMatchObject({ code: '23503' });
        await expect(service.selectBlock(1, '999')).rejects.toMatchObject({ code: '23503' });
    });

    it('AC-1-11: 동시 첫 메시지는 둘 다 정상 응답하고 연결 행은 하나만 저장한다', async () => {
        const user = Object.assign(new User(), {
            id: 1,
            status: UserStatus.ACTIVE,
            isActive: true,
        });
        const facade = new KakaoSkillFacade(
            {
                findByKakaoLoginId: () => Promise.resolve(user),
                findByIdOrThrow: () => Promise.resolve(user),
            } as unknown as UserService,
            service,
            new ConfigService({ KAKAO_WEB_GUIDE_URL: 'https://example.test/login' })
        );
        // 두 요청 모두 미연결 조회를 마친 뒤 INSERT하도록 동시 충돌을 재현한다.
        const repository = new KakaoChannelLinkRepository(db.getRepository(KakaoChannelLink));
        let release!: () => void;
        const bothRead = new Promise<void>((resolve) => {
            release = resolve;
        });
        let reads = 0;
        const spy = jest.spyOn(service, 'findByKakaoAppUserId').mockImplementation(async (id) => {
            const link = await repository.findByKakaoAppUserId(id);
            reads += 1;
            if (reads === 2) release();
            await bothRead;
            return link;
        });
        try {
            const payload = { userRequest: { user: { properties: { appUserId: 'k1' } } } };
            const responses = await Promise.all([facade.chat(payload), facade.chat(payload)]);
            expect(responses).toEqual([
                textResponse(KAKAO_MESSAGES.NOT_READY),
                textResponse(KAKAO_MESSAGES.NOT_READY),
            ]);
            expect(await db.getRepository(KakaoChannelLink).count()).toBe(1);
        } finally {
            spy.mockRestore();
        }
    });

    it('최초 미선택은 삭제된 활동으로 판단하지 않는다', async () => {
        await service.link(1, 'k1');
        const link = await service.findByKakaoAppUserId('k1');
        expect(link?.currentBlockId).toBeNull();
        expect(link?.activitySelectedAt).toBeNull();
        expect(link?.hasDeletedActivity()).toBe(false);
    });

    it('선택한 활동 삭제 시 ID만 NULL이 되고 선택 시각은 유지된다', async () => {
        await service.link(1, 'k1');
        await service.selectBlock(1, '9007199254740993');
        const selected = await service.findByKakaoAppUserId('k1');
        expect(selected?.currentBlockId).toBe('9007199254740993');
        expect(selected?.activitySelectedAt).toBeInstanceOf(Date);
        expect(selected?.hasDeletedActivity()).toBe(false);
        await db.query('DELETE FROM block WHERE id = 9007199254740993');
        const deleted = await service.findByKakaoAppUserId('k1');
        expect(deleted?.currentBlockId).toBeNull();
        expect(deleted?.activitySelectedAt).toEqual(selected?.activitySelectedAt);
        expect(deleted?.hasDeletedActivity()).toBe(true);
        await service.selectBlock(1, '12');
        const reselected = await service.findByKakaoAppUserId('k1');
        expect(reselected?.currentBlockId).toBe('12');
        expect(reselected?.activitySelectedAt).toBeInstanceOf(Date);
        expect(reselected?.hasDeletedActivity()).toBe(false);
    });

    it('선택 초기화는 ID와 선택 시각을 모두 지운다', async () => {
        await service.link(1, 'k1');
        await service.selectBlock(1, '12');
        await service.resetSelection(1);
        const link = await service.findByKakaoAppUserId('k1');
        expect(link?.currentBlockId).toBeNull();
        expect(link?.activitySelectedAt).toBeNull();
        expect(link?.hasDeletedActivity()).toBe(false);
    });

    it('사용자 행 삭제 시 연결 행이 CASCADE 삭제된다', async () => {
        await service.link(1, 'k1');
        await db.query('DELETE FROM users WHERE id = 1');
        expect(await service.findByKakaoAppUserId('k1')).toBeNull();
    });
});
