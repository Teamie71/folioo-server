import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserModule } from '../user/user.module';
import { BlockModule } from '../block/block.module';
import { KakaoChannelLink } from './domain/kakao-channel-link.entity';
import { KakaoChannelLinkRepository } from './infrastructure/repositories/kakao-channel-link.repository';
import { KakaoChannelLinkService } from './application/services/kakao-channel-link.service';
import { KakaoSkillFacade } from './application/facades/kakao-skill.facade';
import { KakaoSkillController } from './presentation/kakao-skill.controller';

@Module({
    imports: [TypeOrmModule.forFeature([KakaoChannelLink]), UserModule, BlockModule],
    controllers: [KakaoSkillController],
    providers: [KakaoChannelLinkRepository, KakaoChannelLinkService, KakaoSkillFacade],
})
export class KakaoChannelModule {}
