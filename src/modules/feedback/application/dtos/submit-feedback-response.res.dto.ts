import { ApiProperty } from '@nestjs/swagger';

export class SubmitFeedbackResponseResDTO {
    @ApiProperty({ example: true })
    rewardGranted: boolean;

    static of(rewardGranted: boolean): SubmitFeedbackResponseResDTO {
        const dto = new SubmitFeedbackResponseResDTO();
        dto.rewardGranted = rewardGranted;
        return dto;
    }
}
