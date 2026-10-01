import { Injectable } from '@nestjs/common';
import { KakaoChannelLink } from '../../domain/kakao-channel-link.entity';
import { KakaoChannelLinkRepository } from '../../infrastructure/repositories/kakao-channel-link.repository';
import { BusinessException } from 'src/common/exceptions/business.exception';
import { ErrorCode } from 'src/common/exceptions/error-code.enum';

@Injectable()
export class KakaoChannelLinkService {
    constructor(private readonly kakaoChannelLinkRepository: KakaoChannelLinkRepository) {}

    findByKakaoAppUserId(kakaoAppUserId: string): Promise<KakaoChannelLink | null> {
        return this.kakaoChannelLinkRepository.findByKakaoAppUserId(kakaoAppUserId);
    }

    async link(userId: number, kakaoAppUserId: string): Promise<KakaoChannelLink> {
        await this.kakaoChannelLinkRepository.insertIgnoringConflict(
            KakaoChannelLink.create(userId, kakaoAppUserId)
        );
        const link = await this.findByKakaoAppUserId(kakaoAppUserId);
        if (!link || link.userId !== userId) {
            throw new BusinessException(ErrorCode.INTERNAL_SERVER_ERROR);
        }
        return link;
    }

    isTurnInProgress(link: KakaoChannelLink, now = new Date()): boolean {
        return (link.turnLockedUntil?.getTime() ?? 0) > now.getTime();
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
