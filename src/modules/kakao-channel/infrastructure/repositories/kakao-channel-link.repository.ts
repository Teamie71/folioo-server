import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { KakaoChannelLink } from '../../domain/kakao-channel-link.entity';

@Injectable()
export class KakaoChannelLinkRepository {
    constructor(
        @InjectRepository(KakaoChannelLink)
        private readonly kakaoChannelLinkRepository: Repository<KakaoChannelLink>
    ) {}

    findByKakaoAppUserId(kakaoAppUserId: string): Promise<KakaoChannelLink | null> {
        return this.kakaoChannelLinkRepository.findOne({ where: { kakaoAppUserId } });
    }

    findByUserId(userId: number): Promise<KakaoChannelLink | null> {
        return this.kakaoChannelLinkRepository.findOne({ where: { userId } });
    }

    // 같은 사용자의 첫 메시지가 동시에 들어와도 한 행만 남도록 충돌은 무시한다.
    async insertIgnoringConflict(link: KakaoChannelLink): Promise<void> {
        await this.kakaoChannelLinkRepository
            .createQueryBuilder()
            .insert()
            .values(link)
            .orIgnore()
            .execute();
    }

    async deleteByUserId(userId: number): Promise<void> {
        await this.kakaoChannelLinkRepository.delete({ userId });
    }

    async selectBlock(userId: number, blockId: string): Promise<void> {
        await this.kakaoChannelLinkRepository.update(
            { userId },
            { currentBlockId: blockId, activitySelectedAt: new Date() }
        );
    }

    async resetSelection(userId: number): Promise<void> {
        await this.kakaoChannelLinkRepository.update(
            { userId },
            { currentBlockId: null, activitySelectedAt: null }
        );
    }
}
