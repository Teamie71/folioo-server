import { Injectable } from '@nestjs/common';
import { Transactional } from 'typeorm-transactional';
import { UserService } from 'src/modules/user/application/services/user.service';
import { CORRECTION_CREDIT_COST } from '../../domain/portfolio-correction.entity';
import { CreateCorrectionReqDTO } from '../dtos/portfolio-correction.dto';
import { PortfolioCorrectionService } from '../services/portfolio-correction.service';

@Injectable()
export class PortfolioCorrectionFacade {
    constructor(
        private readonly portfolioCorrectionService: PortfolioCorrectionService,
        private readonly userService: UserService
    ) {}

    @Transactional()
    async requestCorrection(userId: number, body: CreateCorrectionReqDTO): Promise<void> {
        await this.userService.deductCredit(userId, CORRECTION_CREDIT_COST);
        await this.portfolioCorrectionService.validateCreation(userId);
        await this.portfolioCorrectionService.createCorrection(
            userId,
            body.companyName,
            body.positionName,
            body.jobDescription ?? '',
            body.jobDescriptionType
        );
    }
}
