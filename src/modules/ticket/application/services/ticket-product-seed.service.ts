import { Injectable, OnModuleInit } from '@nestjs/common';
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

@Injectable()
export class TicketProductSeedService implements OnModuleInit {
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

        const expected = TicketProductSeedService.getExpectedProducts();
        const existing = await this.ticketProductRepository.findAll();

        const toSave: TicketProduct[] = [];

        for (const item of expected) {
            const found = existing.find(
                (p) => p.type === item.type && p.quantity === item.quantity
            );

            if (!found) {
                const created = new TicketProduct();
                created.type = item.type;
                created.quantity = item.quantity;
                created.price = item.price;
                created.originalPrice = item.originalPrice;
                created.displayOrder = item.displayOrder;
                created.isActive = true;
                toSave.push(created);
                continue;
            }

            const needsUpdate =
                found.price !== item.price ||
                (found.originalPrice ?? null) !== item.originalPrice ||
                found.displayOrder !== item.displayOrder ||
                found.isActive !== true;

            if (!needsUpdate) {
                continue;
            }

            found.price = item.price;
            found.originalPrice = item.originalPrice;
            found.displayOrder = item.displayOrder;
            found.isActive = true;
            toSave.push(found);
        }

        if (toSave.length === 0) {
            return;
        }

        await this.ticketProductRepository.saveAll(toSave);
    }

    private static getExpectedProducts(): SeedTicketProduct[] {
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

        const exp1 = mk(TicketType.EXPERIENCE, 1, basePrice, null, 1);
        const exp3 = mk(TicketType.EXPERIENCE, 3, 2700, basePrice * 3, 2);
        const exp5 = mk(TicketType.EXPERIENCE, 5, 4100, basePrice * 5, 3);

        const corr1 = mk(TicketType.PORTFOLIO_CORRECTION, 1, basePrice, null, 4);
        const corr3 = mk(TicketType.PORTFOLIO_CORRECTION, 3, 2700, basePrice * 3, 5);
        const corr5 = mk(TicketType.PORTFOLIO_CORRECTION, 5, 4100, basePrice * 5, 6);

        return [exp1, exp3, exp5, corr1, corr3, corr5];
    }
}
