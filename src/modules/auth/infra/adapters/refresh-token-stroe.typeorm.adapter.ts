import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RefreshTokenStorePort } from '../../application/ports/refresh-token-store.port';
import { RefreshTokenOrmEntity } from '../orm/refresh-token.orm-entity';

@Injectable()
export class RefreshTokenStoreTypeormAdapter implements RefreshTokenStorePort {
    constructor(
        @InjectRepository(RefreshTokenOrmEntity)
        private readonly repo: Repository<RefreshTokenOrmEntity>
    ) {}

    async upsert(input: { userId: string; refreshToken: string; expiresAt: Date }) {
        const userIdNum = Number(input.userId);
        const existing = await this.repo.findOne({ where: { userId: userIdNum } });

        if (!existing) {
            await this.repo.save(
                this.repo.create({
                    userId: userIdNum,
                    refreshToken: input.refreshToken,
                    expiresAt: input.expiresAt,
                })
            );
            return;
        }

        existing.refreshToken = input.refreshToken;
        existing.expiresAt = input.expiresAt;
        await this.repo.save(existing);
    }

    async findByUserId(userId: string) {
        const row = await this.repo.findOne({ where: { userId: Number(userId) } });
        if (!row) return null;
        return {
            userId: userId,
            refreshToken: row.refreshToken,
            refreshJti: null,
            expiresAt: row.expiresAt,
        };
    }

    async deleteByUserId(userId: string) {
        await this.repo.delete({ userId: Number(userId) });
    }
}
