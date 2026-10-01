import { Injectable } from '@nestjs/common';
import { KakaoChannelLink } from '../../domain/kakao-channel-link.entity';
import { KakaoChannelLinkRepository } from '../../infrastructure/repositories/kakao-channel-link.repository';

@Injectable()
export class KakaoChannelLinkService {
    constructor(private readonly kakaoChannelLinkRepository: KakaoChannelLinkRepository) {}

    findByKakaoAppUserId(kakaoAppUserId: string): Promise<KakaoChannelLink | null> {
        return this.kakaoChannelLinkRepository.findByKakaoAppUserId(kakaoAppUserId);
    }

    async link(userId: number, kakaoAppUserId: string): Promise<void> {
        await this.kakaoChannelLinkRepository.insertIgnoringConflict(
            KakaoChannelLink.create(userId, kakaoAppUserId)
        );
    }

    async unlink(userId: number): Promise<void> {
        await this.kakaoChannelLinkRepository.deleteByUserId(userId);
    }

    // 활동 소유권 검증은 이 메서드를 호출하기 전 Facade에서 수행한다.
    selectBlock(userId: number, blockId: string): Promise<void> {
        return this.kakaoChannelLinkRepository.selectBlock(userId, blockId);
    }

    resetSelection(userId: number): Promise<void> {
        return this.kakaoChannelLinkRepository.resetSelection(userId);
    }
}
