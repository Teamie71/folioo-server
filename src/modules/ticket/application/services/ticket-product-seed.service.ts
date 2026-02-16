import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TicketProduct } from '../../domain/entities/ticket-product.entity';
import { TicketType } from '../../domain/enums/ticket-type.enum';
import { TicketProductRepository } from '../../infrastructure/repositories/ticket-product.repository';

type SeedTicketProduct = {
    type: TicketType;
    quantity: number;
    price: number;
    originalPrice: number | null;
    displayOrder: number;
};

type SeedResult = {
    total: number;
    created: number;
    updated: number;
    skipped: number;
};

/**
 * Dev/local 환경 전용 ticket_product 시드 서비스.
 *
 * 서버 기동 시 `OnModuleInit` 훅으로 자동 실행되며,
 * EXPERIENCE / PORTFOLIO_CORRECTION x 1·3·5회권 총 6종의
 * 상품 데이터를 idempotent(upsert) 하게 보장합니다.
 *
 * - 매칭 키: `(type, quantity)`
 * - 없으면 INSERT, 필드가 다르면 UPDATE, 동일하면 SKIP
 * - `APP_PROFILE`이 `local` 또는 `dev`가 아니면 아무 작업도 하지 않음
 */
@Injectable()
export class TicketProductSeedService implements OnModuleInit {
    private readonly logger = new Logger(TicketProductSeedService.name);

    constructor(
        private readonly configService: ConfigService,
        private readonly ticketProductRepository: TicketProductRepository
    ) {}

    async onModuleInit(): Promise<void> {
        await this.ensureDevSeed();
    }

    private async ensureDevSeed(): Promise<void> {
        const profile = this.configService.get<string>('APP_PROFILE');
        const isDevLike = profile === 'local' || profile === 'dev';

        if (!isDevLike) {
            return;
        }

        this.logger.log(`[seed] profile="${profile}" — ticket_product seed 시작`);

        try {
            const result = await this.reconcile();
            this.logSummary(result);
        } catch (error) {
            // 시드 실패가 서버 기동을 막아서는 안 된다
            this.logger.error(
                `[seed] ticket_product seed 실패 — ${error instanceof Error ? error.message : String(error)}`,
                error instanceof Error ? error.stack : undefined
            );
        }
    }

    private async reconcile(): Promise<SeedResult> {
        const expected = TicketProductSeedService.getExpectedProducts();
        const existing = await this.ticketProductRepository.findAll();

        const toSave: TicketProduct[] = [];
        let created = 0;
        let updated = 0;
        let skipped = 0;

        for (const item of expected) {
            const found = existing.find(
                (p) => p.type === item.type && p.quantity === item.quantity
            );

            if (!found) {
                const entity = new TicketProduct();
                entity.type = item.type;
                entity.quantity = item.quantity;
                entity.price = item.price;
                entity.originalPrice = item.originalPrice;
                entity.displayOrder = item.displayOrder;
                entity.isActive = true;
                toSave.push(entity);
                created++;
                continue;
            }

            const needsUpdate =
                found.price !== item.price ||
                (found.originalPrice ?? null) !== item.originalPrice ||
                found.displayOrder !== item.displayOrder ||
                found.isActive !== true;

            if (!needsUpdate) {
                skipped++;
                continue;
            }

            found.price = item.price;
            found.originalPrice = item.originalPrice;
            found.displayOrder = item.displayOrder;
            found.isActive = true;
            toSave.push(found);
            updated++;
        }

        if (toSave.length > 0) {
            await this.ticketProductRepository.saveAll(toSave);
        }

        return { total: expected.length, created, updated, skipped };
    }

    private logSummary(result: SeedResult): void {
        const { total, created, updated, skipped } = result;

        if (created === 0 && updated === 0) {
            this.logger.log(`[seed] ticket_product OK — ${total}종 모두 최신 (변경 없음)`);
            return;
        }

        const parts: string[] = [];
        if (created > 0) parts.push(`생성 ${created}`);
        if (updated > 0) parts.push(`갱신 ${updated}`);
        if (skipped > 0) parts.push(`스킵 ${skipped}`);
        this.logger.log(`[seed] ticket_product 완료 — ${parts.join(', ')} (전체 ${total}종)`);
    }

    static getExpectedProducts(): SeedTicketProduct[] {
        const basePrice = 990;

        const mk = (
            type: TicketType,
            quantity: number,
            price: number,
            originalPrice: number | null,
            displayOrder: number
        ): SeedTicketProduct => ({
            type,
            quantity,
            price,
            originalPrice,
            displayOrder,
        });

        return [
            mk(TicketType.EXPERIENCE, 1, basePrice, null, 1),
            mk(TicketType.EXPERIENCE, 3, 2700, basePrice * 3, 2),
            mk(TicketType.EXPERIENCE, 5, 4100, basePrice * 5, 3),
            mk(TicketType.PORTFOLIO_CORRECTION, 1, basePrice, null, 4),
            mk(TicketType.PORTFOLIO_CORRECTION, 3, 2700, basePrice * 3, 5),
            mk(TicketType.PORTFOLIO_CORRECTION, 5, 4100, basePrice * 5, 6),
        ];
    }
}
